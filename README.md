# Solana Desk Dashboard

Plain white, minimal desk for **Christian Sanchez** — bots wander the floor; status line and three cards stay easy to read.

| Agent | Role |
|-------|------|
| **Grok Bot** | Coordinator |
| **Solana Scout** | Research / watch |
| **Solana Trader** | Execution under caps |
| **Portfolio Guard** | Risk / PnL |

**Mode: LIVE.** Display-only — no signing wallet, no secrets, no order placement. Feed may stay sample until bots append to `data/activity.json`.

### Caps (LIVE)

| Cap | Value |
|-----|-------|
| Per trade | **$25** |
| Max open | **$75** |
| Daily loss halt | **$50** |

**ADMIN trading wallet:** `3GfDwiEtei62mumu1J8XnaqkUFtbkVLQE2Btpr5yAeek` — **~0.35 SOL** — public address only.

![Mode](https://img.shields.io/badge/mode-LIVE-171717?style=flat-square&labelColor=f5f5f5) ![License](https://img.shields.io/badge/license-MIT-525252?style=flat-square&labelColor=f5f5f5)

## Quick start

```bash
cd solana-desk-dashboard
npm start          # http://127.0.0.1:8765
# or: python3 server.py
```

> Use HTTP — `file://` may block JSON fetch.

## Layout

```
solana-desk-dashboard/
├── index.html
├── css/styles.css      # White · sparse · thin borders
├── js/app.js           # Status · floor bots · cards · feed
├── data/activity.json  # Shared desk state
├── server.js / server.py
├── vercel.json
└── README.md
```

## What you see

1. **Status line** — `LIVE · admin 3GfD…Aeek · PnL $0.00`
2. **Desk floor** — four bot sprites gently wander (CSS). Hover or click to pause and show last action from `activity.json`
3. **Cards** — Wallet · PnL · Caps (short labels, large type)
4. **Activity** — last few events, one line each

Still static-hostable (GitHub Pages / Vercel). Polls `data/activity.json` every 15s.

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

Also update `bots[].lastAction`, `wallet`, `pnl`, `riskCaps`, `status.tradingMode`, `meta.updatedAt` when state changes. Never put keys or secrets in this file.

## Security

- No wallet keys, seeds, or API secrets
- Dashboard never submits orders
- ADMIN address in JSON is public only

## License

MIT — see [LICENSE](LICENSE).
