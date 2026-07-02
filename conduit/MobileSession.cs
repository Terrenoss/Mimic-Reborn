using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Conduit.Crypto;
using Conduit.Lcu;

namespace Conduit;

/// <summary>
/// Protocol opcodes between the mobile web client and Conduit. Opcodes 3-9 are
/// inherited unchanged from Mimic v2; 0-1 are the new LAN-direct ECDH handshake.
/// </summary>
public enum MobileOpcode : long
{
    Hello = 0,          // conduit -> mobile: [0, conduitPubKey, version, machineName]
    Secret = 1,         // mobile -> conduit: [1, mobilePubKey, encrypted{identity, device, browser}]
    SecretResponse = 2, // conduit -> mobile: [2, true|false]
    Version = 3,        // mobile -> conduit: [3]
    VersionResponse = 4,// conduit -> mobile: [4, version, machineName]
    Subscribe = 5,      // mobile -> conduit: [5, "regex"]
    Unsubscribe = 6,    // mobile -> conduit: [6, "regex"]
    Request = 7,        // mobile -> conduit: [7, id, path, method, body]
    Response = 8,       // conduit -> mobile: [8, id, status, body]
    Update = 9          // conduit -> mobile: [9, path, status, body]
}

/// <summary>
/// Handles a single connected mobile device: performs the encrypted handshake and
/// device approval, then acts as a generic proxy between the device and the LCU.
/// </summary>
public class MobileSession : IDisposable
{
    private readonly WebSocket _socket;
    private readonly LcuConnection _league;
    private readonly Func<string, string, Task<bool>> _requestApproval;
    private readonly SessionCrypto _crypto = new();
    private readonly Dictionary<string, Regex> _observedPaths = new();
    private readonly SemaphoreSlim _sendLock = new(1, 1);

    private bool _handshakeComplete;

    public MobileSession(WebSocket socket, LcuConnection league, Func<string, string, Task<bool>> requestApproval)
    {
        _socket = socket;
        _league = league;
        _requestApproval = requestApproval;
        _league.OnEvent += HandleLeagueEvent;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        // Greet with our public key so the client can start the key agreement.
        await SendRawAsync(JsonSerializer.Serialize(new object[]
        {
            (long)MobileOpcode.Hello, _crypto.PublicKeyBase64, MimicConfig.Version, Environment.MachineName
        }), ct);

        var buffer = new byte[1024 * 64];
        var message = new MemoryStream();

        while (_socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            message.SetLength(0);
            WebSocketReceiveResult result;
            do
            {
                result = await _socket.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close) return;
                message.Write(buffer, 0, result.Count);
            } while (!result.EndOfMessage);

            await HandleMessageAsync(Encoding.UTF8.GetString(message.GetBuffer(), 0, (int)message.Length), ct);
        }
    }

    private async Task HandleMessageAsync(string raw, CancellationToken ct)
    {
        if (!_handshakeComplete)
        {
            await HandleHandshakeAsync(raw, ct);
            return;
        }

        // Post-handshake, every message is an encrypted JSON string.
        string decrypted;
        try
        {
            var wire = JsonSerializer.Deserialize<string>(raw);
            if (wire == null) return;
            decrypted = _crypto.Decrypt(wire);
        }
        catch
        {
            return; // Garbage or tampered message: ignore.
        }

        if (JsonNode.Parse(decrypted) is not JsonArray msg || msg.Count < 1) return;

        switch ((MobileOpcode)msg[0]!.GetValue<long>())
        {
            case MobileOpcode.Subscribe when msg.Count >= 2:
            {
                var path = msg[1]!.GetValue<string>();
                _observedPaths[path] = new Regex(path, RegexOptions.Compiled);
                break;
            }
            case MobileOpcode.Unsubscribe when msg.Count >= 2:
            {
                _observedPaths.Remove(msg[1]!.GetValue<string>());
                break;
            }
            case MobileOpcode.Request when msg.Count >= 4:
            {
                var id = msg[1]!.GetValue<long>();
                var path = msg[2]!.GetValue<string>();
                var method = msg[3]!.GetValue<string>();
                var body = msg.Count >= 5 && msg[4] != null ? msg[4]!.ToJsonString() : null;

                var (status, content) = await _league.RequestAsync(method, path, body);
                await SendEncryptedAsync($"[{(long)MobileOpcode.Response},{id},{status},{content}]", ct);
                break;
            }
            case MobileOpcode.Version:
            {
                await SendEncryptedAsync(JsonSerializer.Serialize(new object[]
                {
                    (long)MobileOpcode.VersionResponse, MimicConfig.Version, Environment.MachineName
                }), ct);
                break;
            }
        }
    }

    private async Task HandleHandshakeAsync(string raw, CancellationToken ct)
    {
        try
        {
            if (JsonNode.Parse(raw) is not JsonArray msg
                || msg.Count < 3
                || (MobileOpcode)msg[0]!.GetValue<long>() != MobileOpcode.Secret)
            {
                return;
            }

            _crypto.DeriveSessionKey(msg[1]!.GetValue<string>());

            // The identity blob proves the client derived the same key.
            var identityJson = _crypto.Decrypt(msg[2]!.GetValue<string>());
            var info = JsonNode.Parse(identityJson) as JsonObject;
            var identity = info?["identity"]?.GetValue<string>();
            var device = info?["device"]?.GetValue<string>() ?? "Unknown device";
            var browser = info?["browser"]?.GetValue<string>() ?? "unknown browser";

            if (identity == null)
            {
                await SendRawAsync($"[{(long)MobileOpcode.SecretResponse},false]", ct);
                return;
            }

            var approved = Persistence.IsDeviceApproved(identity) || await _requestApproval(device, browser);
            if (approved) Persistence.ApproveDevice(identity);

            _handshakeComplete = approved;
            await SendRawAsync($"[{(long)MobileOpcode.SecretResponse},{(approved ? "true" : "false")}]", ct);
        }
        catch
        {
            await SendRawAsync($"[{(long)MobileOpcode.SecretResponse},false]", ct);
        }
    }

    private void HandleLeagueEvent(LcuEvent ev)
    {
        if (!_handshakeComplete) return;
        if (!_observedPaths.Values.Any(regex => regex.IsMatch(ev.Path))) return;

        var status = ev.Type is "Create" or "Update" ? 200 : 404;
        var data = ev.Data?.ToJsonString() ?? "null";
        _ = SendEncryptedAsync(
            $"[{(long)MobileOpcode.Update},{JsonSerializer.Serialize(ev.Path)},{status},{data}]",
            CancellationToken.None);
    }

    private Task SendEncryptedAsync(string json, CancellationToken ct) =>
        SendRawAsync(JsonSerializer.Serialize(_crypto.Encrypt(json)), ct);

    private async Task SendRawAsync(string payload, CancellationToken ct)
    {
        await _sendLock.WaitAsync(ct);
        try
        {
            if (_socket.State == WebSocketState.Open)
            {
                await _socket.SendAsync(Encoding.UTF8.GetBytes(payload), WebSocketMessageType.Text, true, ct);
            }
        }
        catch
        {
            // Socket died mid-send; the receive loop will notice and end the session.
        }
        finally
        {
            _sendLock.Release();
        }
    }

    public void Dispose()
    {
        _league.OnEvent -= HandleLeagueEvent;
        _crypto.Dispose();
        _sendLock.Dispose();
        GC.SuppressFinalize(this);
    }
}
