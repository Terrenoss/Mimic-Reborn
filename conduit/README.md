# :electric_plug: Mimic Reborn - Conduit

Windows tray application (.NET 9) that is the heart of Mimic Reborn:

- Detects the running League client (lockfile, WMI fallback) and connects to the LCU API.
- Runs an embedded Kestrel web server on port **51000** that serves the mobile UI (`wwwroot/`, built from [/web](../web)) and accepts encrypted websocket connections on `/mobile`.
- Acts as a fully generic proxy: the mobile client decides which LCU endpoints to call/observe; Conduit holds no League-domain knowledge.
- End-to-end encryption: ECDH P-256 key agreement, HKDF-SHA256, AES-256-GCM (see `Crypto/SessionCrypto.cs`; the web counterpart is `web/src/lib/crypto.ts`).
- Device approval: each new phone must be allowed once via a desktop prompt; approvals persist in `%APPDATA%\Mimic-Reborn`.
- Checks GitHub Releases for a newer version at startup.

## Protocol

Messages are JSON arrays `[opcode, ...args]` over the websocket. Opcodes 3-9 (version, subscribe, unsubscribe, request, response, update) are inherited unchanged from Mimic v2; opcodes 0-1 implement the LAN-direct handshake (`Hello` carries Conduit's public key, `Secret` the client's key plus an encrypted identity blob). After the handshake, every frame is an encrypted string `base64(nonce):base64(ciphertext||tag)`.

## Development

```
dotnet build       # requires .NET SDK 9+
dotnet run         # starts the tray app (UI served from wwwroot if present)
```

For UI development you don't need to rebuild Conduit: run `npm run dev` in [/web](../web) — Vite proxies `/mobile` to a locally running Conduit.
