![Mimic Logo](assets/mimic-logo.png?raw=true)

# :satellite: Mimic Reborn

**The League client, on your phone — no server required.**

Mimic Reborn is a modernized fork of [Mimic](https://github.com/molenzwiebel/Mimic) by molenzwiebel (no longer maintained). It lets you run the full game setup flow — lobby, queue, ready check and champion select — from your phone, while the League client runs on your PC.

## What changed vs. the original Mimic?

| | Mimic v2 (2019) | Mimic Reborn v3 |
|---|---|---|
| Architecture | Central relay server (rift.mimic.lol) required | **LAN-direct: your phone talks straight to your PC.** No central server, nothing to shut down. |
| Desktop app | WPF, .NET Framework 4.6.1, Fody | .NET 9 tray app with an embedded web server, single-file publish |
| Web UI | Vue 2 + vue-cli (EOL) | React 18 + Vite + TypeScript 5 |
| Encryption | RSA-2048 + AES-CBC | ECDH P-256 + HKDF + AES-256-GCM, end-to-end |
| Static data | Partially hardcoded (broke on new champions) | Loaded live from DataDragon/CommunityDragon |
| Updates | Manual | Checks GitHub Releases at startup |

## How it works

1. Run **MimicConduit.exe** on your PC. It sits in the tray, finds the League client automatically, and serves the mobile UI on your local network.
2. Click the tray icon and scan the QR code with your phone (same Wi-Fi network).
3. Approve the device on your PC — once per device.
4. Play. All traffic stays on your LAN, encrypted end-to-end.

Away from home? Use [Tailscale](https://tailscale.com/) (or any VPN back to your home network) and open the same URL.

## Is this allowed by Riot?

Mimic Reborn only uses the official local League Client API (LCU) — the same API used by tools like Blitz or Porofessor. It performs no memory reading, no injection, and no gameplay automation: it only relays actions you take manually on your phone. This falls within Riot's League Client development policies, but as always, third-party tools are used at your own risk.

## Components

- [**conduit**](/conduit) — Windows tray app (.NET 9). Connects to the LCU, serves the web UI, proxies encrypted traffic. Build: `dotnet build`.
- [**web**](/web) — Mobile UI (React + Vite + TypeScript). Dev: `npm run dev` (proxies to a running Conduit). Build: `npm run build`.
- [**rift**](/rift) — Legacy optional relay server from Mimic v2, kept for reference. The v3 client uses LAN-direct connections and does not need it. A self-hostable remote relay may return in a future version.

## Building a release

```powershell
./publish.ps1
```

This builds the web UI, embeds it into Conduit, and publishes a single self-contained `MimicConduit.exe` (no .NET install required on the target machine).

## License

MIT, like the original project. Huge thanks to [molenzwiebel](https://github.com/molenzwiebel) for years of Mimic. :heart:
