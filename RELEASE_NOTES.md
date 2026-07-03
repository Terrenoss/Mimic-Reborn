## Mimic Reborn v3.0.0 — The League client on your phone, no server required

Complete rewrite of [Mimic](https://github.com/molenzwiebel/Mimic) (unmaintained since 2019). Run the whole game setup — lobby, queue, ready check, champion select — from your phone while League runs on your PC.

### 🚀 What's new

- **Serverless / LAN-direct**: your phone talks straight to your PC over Wi-Fi. No central server, no 6-digit codes, nothing that can shut down. Pair by scanning a QR code.
- **Modern stack**: Conduit rewritten in .NET 9 (single-file exe, embedded web server), UI rewritten in React 18 + TypeScript.
- **Android app** (`Mimic.apk`): installable app with a **system notification when your queue pops**, even with the app in the background.
- **Recommended runes**: apply Riot's official recommended rune pages for your champion/position in one tap — no third-party sites.
- **Always up to date with LoL patches**: champions, skins, runes and icons load live from DataDragon/CommunityDragon; new champions just work.
- **Auto-update**: Conduit checks GitHub Releases at startup and notifies you when a new version is out.
- **English + Français**, with browser-language auto-detection.
- **Modern end-to-end encryption** (ECDH P-256 + AES-256-GCM) between phone and PC.

### 📦 Installation

1. **PC**: download `MimicConduit.exe` below and run it (no .NET install needed). It sits in the system tray.
2. **Phone**: either scan the QR code from the tray icon in your browser (same Wi-Fi), or install `Mimic.apk` (Android) and enter your PC's address.
3. Approve the device on your PC — once per device. Done!

Away from home? Use [Tailscale](https://tailscale.com/) or any VPN to your home network.

### ⚖️ Riot policy

Mimic Reborn only uses the official local League Client API (LCU) — like Blitz or Porofessor. No memory reading, no injection, no gameplay automation: it only relays actions you take manually. Use at your own risk, as with any third-party tool.

---

### 🇫🇷 En bref

Réécriture complète de Mimic : contrôle ton client LoL (lobby, file, sélection des champions, runes) depuis ton téléphone, **sans serveur central** — ton téléphone parle directement à ton PC en Wi-Fi. App Android avec notification de partie trouvée, runes recommandées officielles Riot, interface en français, mises à jour automatiques. Installe `MimicConduit.exe` sur le PC, scanne le QR code ou installe `Mimic.apk`, approuve l'appareil, et joue !
