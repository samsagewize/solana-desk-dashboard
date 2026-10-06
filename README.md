# Solana Desk Dashboard

Plain white desk for **Christian Sanchez** — large sprite bots on a clean floor; **Connect Wallet** (Phantom) turns trading **LIVE** when the admin wallet connects.

| Agent | Role | Sprite |
|-------|------|--------|
| **Grok Bot** | Coordinator | White round + orange star badge |
| **Solana Scout** | Research / watch | Teal teardrop |
| **Solana Trader** | Execution under caps | Purple round |
| **Portfolio Guard** | Risk / PnL | Green round + status bubble |

Sprites from `assets/*.png` (flat sheet characters).

### Caps

| Cap | Value |
|-----|-------|
| Per trade | **$25** |
| Max open | **$75** |
| Daily loss halt | **$50** |

**ADMIN / agent wallet:** `3GfDwiEtei62mumu1J8XnaqkUFtbkVLQE2Btpr5yAeek` — public address only. **No private keys** are stored in this repo or in the browser app.

![Mode](https://img.shields.io/badge/mode-LIVE_when_admin_connects-171717?style=flat-square&labelColor=f5f5f5) ![License](https://img.shields.io/badge/license-MIT-525252?style=flat-square&labelColor=f5f5f5)

## Quick start

```bash
cd solana-desk-dashboard
npm start          # http://127.0.0.1:8765
# or: python3 server.py
```

> Use HTTP — `file://` may block JSON fetch and wallet injection.

**Live (GitHub Pages):** https://samsagewize.github.io/solana-desk-dashboard/

## Connect Wallet (Phantom)

A large **Connect Wallet** CTA sits under the status line (copy: *Connect Phantom (admin) to start trading*), and the header keeps a Connect button too. Both use `window.solana` (Phantom):

1. Install [Phantom](https://phantom.app/) and unlock it in the browser.
2. Click **Connect Wallet** and approve the connection.
3. If the connected address equals the **admin** wallet above:
   - Status shows **LIVE** · **Trading ON** · **Admin**
   - The **Deposit $5 to test agent** panel appears
4. If any other address connects:
   - Status stays **OFF** / Trading off
   - A **wrong-wallet** warning asks you to switch to the admin address
5. **Disconnect** clears the session (trading off again).

Trading visualization is gated on admin connect only. The dashboard still does **not** place exchange orders by itself; it never asks for or stores seeds/private keys.

## Deposit $5 to test agent

Shown only when the **admin** wallet is connected.

| Control | What it does |
|---------|----------------|
| **Deposit $5** | Looks up SOL/USD, computes ≈ $5 in SOL, then either (a) opens a **guided Jupiter** fund flow into the admin/agent wallet (usual case — admin *is* the agent address), or (b) if a *different* funding pubkey were used, builds a Phantom-signed `SystemProgram.transfer` of that SOL amount to the admin wallet via `@solana/web3.js` (CDN). |
| **Open Jupiter** | Same ~$5 SOL amount as a Jupiter swap deep link for manual funding. |

- Address is copied to the clipboard on guided fund when possible.
- RPC: public Solana mainnet endpoint for blockhash / send when a transfer is built.
- **Never** paste a private key into this site.

## Layout

```
solana-desk-dashboard/
├── index.html
├── css/styles.css      # White · larger sprites · sparse chrome
├── js/app.js           # Phantom connect · deposit · floor bots · cards
├── assets/             # Flat bot sprites
├── data/activity.json  # Shared desk state
├── server.js / server.py
├── vercel.json
└── README.md
```

## What you see

1. **Header** — Connect Wallet · status line (`LIVE` only when admin connected)
2. **Connect CTA** — large primary button under status: *Connect Phantom (admin) to start trading*
3. **Desk floor** — four large sprites wander; hover/click for last action
4. **Deposit panel** — admin-only $5 test fund controls
5. **Cards** — Wallet · PnL · Caps ($25 / $75 / $50)
6. **Activity** — last few events from `data/activity.json`

Polls `data/activity.json` every 15s. Static-hostable (GitHub Pages / Vercel).

## How bots append events

Append to `events` (**newest first**):

```json
{
  "id": "evt-015",
  "ts": "2026-10-06T23:00:00Z",
  "bot": "solana-scout",
  "level": "signal",
  "title": "Short title",
  "message": "Detail for bots / tooling.",
  "tags": ["SOL"]
}
```

| Field | Values |
|-------|--------|
| `bot` | `grok-bot` \| `solana-scout` \| `solana-trader` \| `portfolio-guard` |
| `level` | `info` \| `signal` \| `trade` \| `warn` \| `research` |

Also update `bots[].lastAction`, `wallet`, `pnl`, `riskCaps`, `meta.updatedAt` when state changes. Never put keys or secrets in this file.

## Security

- No wallet keys, seeds, or API secrets in the repo
- Phantom holds keys; the page only requests connect / optional transfer signature
- ADMIN address in JSON and UI is public only

## License

MIT — see [LICENSE](LICENSE).
