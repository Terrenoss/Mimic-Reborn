using System.Security.Cryptography;
using System.Text;

namespace Conduit.Crypto;

/// <summary>
/// End-to-end encryption between Conduit and one mobile client.
/// Handshake: ECDH P-256 key agreement -> HKDF-SHA256 -> AES-256-GCM session key.
/// Wire format for encrypted payloads: base64(nonce) + ":" + base64(ciphertext || tag).
/// The web client mirrors this with @noble/curves (p256) and @noble/ciphers.
/// </summary>
public sealed class SessionCrypto : IDisposable
{
    private static readonly byte[] HkdfSalt = Encoding.UTF8.GetBytes("mimic-reborn");
    private static readonly byte[] HkdfInfo = Encoding.UTF8.GetBytes("aes-256-gcm");

    private readonly ECDiffieHellman _keyPair = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
    private AesGcm? _aes;

    public bool HasSessionKey => _aes != null;

    /// <summary>SubjectPublicKeyInfo (DER) base64 — importable by @noble/curves and WebCrypto alike.</summary>
    public string PublicKeyBase64 => Convert.ToBase64String(_keyPair.ExportSubjectPublicKeyInfo());

    /// <summary>Derives the AES-256-GCM session key from the client's public key (SPKI base64).</summary>
    public void DeriveSessionKey(string clientPublicKeyBase64)
    {
        using var clientKey = ECDiffieHellman.Create();
        clientKey.ImportSubjectPublicKeyInfo(Convert.FromBase64String(clientPublicKeyBase64), out _);

        var sharedSecret = _keyPair.DeriveRawSecretAgreement(clientKey.PublicKey);
        var aesKey = HKDF.DeriveKey(HashAlgorithmName.SHA256, sharedSecret, 32, HkdfSalt, HkdfInfo);
        CryptographicOperations.ZeroMemory(sharedSecret);

        _aes = new AesGcm(aesKey, AesGcm.TagByteSizes.MaxSize);
        CryptographicOperations.ZeroMemory(aesKey);
    }

    public string Encrypt(string plaintext)
    {
        var aes = _aes ?? throw new InvalidOperationException("Session key not derived yet.");

        var nonce = RandomNumberGenerator.GetBytes(AesGcm.NonceByteSizes.MaxSize);
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipher = new byte[plainBytes.Length];
        var tag = new byte[AesGcm.TagByteSizes.MaxSize];

        aes.Encrypt(nonce, plainBytes, cipher, tag);

        // Ciphertext and tag are concatenated, matching @noble/ciphers' gcm output.
        var cipherAndTag = new byte[cipher.Length + tag.Length];
        cipher.CopyTo(cipherAndTag, 0);
        tag.CopyTo(cipherAndTag, cipher.Length);

        return Convert.ToBase64String(nonce) + ":" + Convert.ToBase64String(cipherAndTag);
    }

    public string Decrypt(string wire)
    {
        var aes = _aes ?? throw new InvalidOperationException("Session key not derived yet.");

        var separator = wire.IndexOf(':');
        if (separator < 0) throw new FormatException("Invalid encrypted payload.");

        var nonce = Convert.FromBase64String(wire[..separator]);
        var cipherAndTag = Convert.FromBase64String(wire[(separator + 1)..]);

        var tagSize = AesGcm.TagByteSizes.MaxSize;
        var cipher = cipherAndTag.AsSpan(0, cipherAndTag.Length - tagSize);
        var tag = cipherAndTag.AsSpan(cipherAndTag.Length - tagSize);

        var plain = new byte[cipher.Length];
        aes.Decrypt(nonce, cipher, tag, plain);
        return Encoding.UTF8.GetString(plain);
    }

    public void Dispose()
    {
        _aes?.Dispose();
        _keyPair.Dispose();
    }
}
