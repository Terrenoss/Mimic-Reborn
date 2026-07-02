# :iphone: Mimic Reborn - Web

The mobile UI, built with React 18 + Vite + TypeScript. In production it is served by Conduit itself on the local network, so the connection target is simply the page's own origin.

## Structure

- `src/lib/` — the platform layer: `socket.ts` (encrypted websocket + request/observe primitives), `crypto.ts` (ECDH/AES-GCM, mirrors `conduit/Crypto/SessionCrypto.cs`), `lcu.ts` (React hooks), `static-data.ts` (DataDragon/CommunityDragon loaders — champions and runes always up to date, nothing hardcoded).
- `src/components/` — one folder per screen: connect flow, lobby (create, members, roles, invites), received invitations, queue, ready check, and the champion select suite (picker, bans, timer, summoner spells, skins, runes, ARAM bench).

All feature panels are mounted simultaneously and self-gate on LCU state, like the original Mimic.

## Development

```
npm install
npm run dev     # Vite dev server; proxies /mobile + /api to a Conduit on localhost:51000
npm run build   # type-checks and outputs dist/ (embedded into Conduit by ../publish.ps1)
```

Crypto uses `@noble/*` libraries instead of WebCrypto so the app works on plain `http://` LAN origins, where `crypto.subtle` is unavailable.
