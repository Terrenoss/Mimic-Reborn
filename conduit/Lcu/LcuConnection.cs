using System.Net;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Conduit.Lcu;

public record LcuEvent(string Path, string Type, JsonNode? Data);

/// <summary>
/// Maintains a connection to the local League client (LCU): polls until the client
/// is running, then opens an authenticated HTTP client and the WAMP event websocket.
/// Exposes a generic request passthrough and an event stream, nothing more — all
/// League-domain knowledge lives in the web client.
/// </summary>
public class LcuConnection : IDisposable
{
    public bool IsConnected { get; private set; }

    public event Action? OnConnected;
    public event Action? OnDisconnected;
    public event Action<LcuEvent>? OnEvent;

    private HttpClient? _http;
    private ClientWebSocket? _socket;
    private CancellationTokenSource _cts = new();

    public void Start()
    {
        _ = PollLoopAsync(_cts.Token);
    }

    private async Task PollLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            if (!IsConnected)
            {
                var credentials = LcuLocator.FindLeagueClient();
                if (credentials != null)
                {
                    try
                    {
                        await ConnectAsync(credentials, ct);
                    }
                    catch
                    {
                        HandleDisconnect();
                    }
                }
            }

            await Task.Delay(TimeSpan.FromSeconds(2), ct);
        }
    }

    private async Task ConnectAsync(LcuCredentials credentials, CancellationToken ct)
    {
        // The LCU uses a self-signed certificate for 127.0.0.1.
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        };

        var http = new HttpClient(handler)
        {
            BaseAddress = new Uri($"https://127.0.0.1:{credentials.Port}/")
        };
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"riot:{credentials.AuthToken}")));

        var socket = new ClientWebSocket();
        socket.Options.AddSubProtocol("wamp");
        socket.Options.Credentials = new NetworkCredential("riot", credentials.AuthToken);
        socket.Options.RemoteCertificateValidationCallback = (_, _, _, _) => true;

        await socket.ConnectAsync(new Uri($"wss://127.0.0.1:{credentials.Port}/"), ct);

        // WAMP subscribe to the full LCU event firehose.
        await socket.SendAsync(Encoding.UTF8.GetBytes("[5,\"OnJsonApiEvent\"]"), WebSocketMessageType.Text, true, ct);

        _http = http;
        _socket = socket;
        IsConnected = true;
        OnConnected?.Invoke();

        _ = ReceiveLoopAsync(socket, ct);
    }

    private async Task ReceiveLoopAsync(ClientWebSocket socket, CancellationToken ct)
    {
        var buffer = new byte[1024 * 64];
        var message = new MemoryStream();

        try
        {
            while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                message.SetLength(0);
                WebSocketReceiveResult result;
                do
                {
                    result = await socket.ReceiveAsync(buffer, ct);
                    if (result.MessageType == WebSocketMessageType.Close) throw new WebSocketException("LCU socket closed");
                    message.Write(buffer, 0, result.Count);
                } while (!result.EndOfMessage);

                HandleWampMessage(Encoding.UTF8.GetString(message.GetBuffer(), 0, (int)message.Length));
            }
        }
        catch
        {
            // Fall through to disconnect handling.
        }

        HandleDisconnect();
    }

    private void HandleWampMessage(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return;

        JsonNode? node;
        try
        {
            node = JsonNode.Parse(json);
        }
        catch
        {
            return;
        }

        // We only care about WAMP EVENT frames: [8, "OnJsonApiEvent", { data, eventType, uri }]
        if (node is not JsonArray array || array.Count < 3) return;
        if (array[0]?.GetValue<long>() != 8 || array[1]?.GetValue<string>() != "OnJsonApiEvent") return;
        if (array[2] is not JsonObject payload) return;

        var uri = payload["uri"]?.GetValue<string>();
        var eventType = payload["eventType"]?.GetValue<string>();
        if (uri == null || eventType == null) return;

        var data = eventType == "Delete" ? null : payload["data"];
        OnEvent?.Invoke(new LcuEvent(uri, eventType, data));
    }

    private void HandleDisconnect()
    {
        if (!IsConnected && _http == null) return;

        IsConnected = false;
        _http?.Dispose();
        _http = null;
        _socket?.Dispose();
        _socket = null;
        OnDisconnected?.Invoke();
    }

    /// <summary>Generic request passthrough to the LCU. Returns the HTTP status and raw JSON body ("null" if empty).</summary>
    public async Task<(int Status, string Content)> RequestAsync(string method, string path, string? body)
    {
        var http = _http;
        if (http == null) return (503, "null");

        try
        {
            var request = new HttpRequestMessage(new HttpMethod(method), path.TrimStart('/'));
            if (!string.IsNullOrEmpty(body) && method != "GET")
            {
                request.Content = new StringContent(body, Encoding.UTF8, "application/json");
            }

            var response = await http.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            return ((int)response.StatusCode, string.IsNullOrEmpty(content) ? "null" : content);
        }
        catch
        {
            return (503, "null");
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        HandleDisconnect();
        GC.SuppressFinalize(this);
    }
}
