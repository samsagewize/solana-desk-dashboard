# Solana Desk Dashboard

Dark-theme single-page **trading desk** for **Christian Sanchez** — one organized surface for his Grok bots:

| Agent | Role on the desk |
|-------|------------------|
| **Grok Bot** | Coordinator — routes Scout → Trader → Guard, broadcasts caps/mode |
| **Solana Scout** | Price watch + research / scored signals |
| **Solana Trader** | Buy/sell under small caps (LIVE mode) |
| **Portfolio Guard** | PnL / risk — keep the book healthy & **net-positive** |

**Mode: LIVE.** Status chip shows **Live**. The UI is still a **visualization** — it does **not** place real trades, connect a signing wallet, or store secrets. Feed rows may remain sample until bots append to `data/activity.json`.

### Caps (LIVE)

| Cap | Value |
|-----|-------|
| Per trade | **$25** |
| Max open | **$75** |
| Daily loss halt | **$50** |

Starter strategy: **SOL/USDC short-horizon momentum**. **ADMIN trading wallet:** `3GfDwiEtei62mumu1J8XnaqkUFtbkVLQE2Btpr5yAeek` — **0.35 SOL (~$42 @ ~$121/SOL)** — public address only in JSON (no keys).

![Theme](https://img.shields.io/badge/theme-dark%20desk-14f195?style=flat-square) ![Mode](https://img.shields.io/badge/mode-LIVE-14f195?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-9945ff?style=flat-square)

## Quick start (local)

```bash
cd solana-desk-dashboard

# Node (no dependencies)
npm start
# → http://127.0.0.1:8765

# or Python 3
python3 server.py
# → http://127.0.0.1:8765

# custom port
node server.js 8080
python3 server.py 8080
```

Open the URL in a browser. Loads `data/activity.json`, refreshes every 15s. Price strip gently wobbles for viz when feeds are still sample.

> Opening `index.html` via `file://` may block JSON fetch — use a local server above.

## GitHub Pages

Static files only — no build step.

1. Push this folder as a repo (or project root / `/docs`).
2. Settings → Pages → Deploy from branch → `/` (root) or `/docs`.
3. Commit `data/activity.json` with the site.

## Layout

```
solana-desk-dashboard/
├── index.html          # Desk shell
├── css/styles.css      # Dark pro theme
├── js/app.js           # Renderer + poll (+ gentle price wobble)
├── data/
│   └── activity.json   # Desk state · bot roster · events (LIVE mode)
├── server.js           # Zero-dep Node static server
├── server.py           # Python static server
├── package.json
├── LICENSE             # MIT
├── .gitignore
└── README.md
```

## Panels (one desk)

1. **Status chips** — **Live** mode, agents, **goal: net +**, CT clock  
2. **Price strip** — SOL + placeholders (BONK, JUP, WIF, RAY)  
3. **Desk bots** — four organized cards: Grok Bot · Scout · Trader · Guard  
4. **Wallet** — **Admin** chip · ADMIN trading wallet · 0.35 SOL · ~$42 + public address  
5. **PnL · net-positive goal** — day / realized / unrealized + goal banner  
6. **Risk gauges** — $25 / $75 / $50 headroom  
7. **Open positions** — filled by Trader when it writes the book  
8. **Watchlist** — Scout scores & bias  
9. **Connections** — RPC / feed / coordinator / bots  
10. **Activity feed** — filterable by Grok / Scout / Trader / Guard  

Banner stays honest: **Live chip**, but activity may still be sample until bots write.

## How bots append events

Treat `data/activity.json` as shared desk state.

### Event schema

Append to `events` (**newest first**):

```json
{
  "id": "evt-015",
  "ts": "2026-10-06T23:00:00Z",
  "bot": "solana-scout",
  "level": "signal",
  "title": "Short title",
  "message": "Human-readable detail for the feed.",
  "tags": ["SOL", "momentum"]
}
```

| Field | Values |
|-------|--------|
| `bot` | `grok-bot` \| `solana-scout` \| `solana-trader` \| `portfolio-guard` |
| `level` | `info` \| `signal` \| `trade` \| `warn` \| `research` |
| `ts` | ISO-8601 UTC |

Also update when state changes:

- `bots[]` — per-agent cards (status, lastAction, metrics)
- `wallet` — balances / SOL progress / `isAdmin` + `role: "admin"` (public address only)
- `prices[]`, `positions[]`, `pnl`, `watchlist[]`
- `status.connections`, `status.tradingMode` (`live` | `paper`), `meta.updatedAt`
- `meta.mode` — keep in sync with `status.tradingMode`
- `riskCaps` — keep `$25` / `$75` / `$50` unless intentionally changed

### Safe append pattern

```bash
python3 - <<'PY'
import json, pathlib, tempfile, os, time
from datetime import datetime, timezone

path = pathlib.Path("data/activity.json")
data = json.loads(path.read_text())
data["events"].insert(0, {
    "id": f"evt-{int(time.time())}",
    "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "bot": "portfolio-guard",
    "level": "info",
    "title": "Heartbeat",
    "message": "Guard tick — book within caps · net-positive goal intact.",
    "tags": ["heartbeat", "goal"],
})
data["meta"]["updatedAt"] = data["events"][0]["ts"]
fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
os.close(fd)
pathlib.Path(tmp).write_text(json.dumps(data, indent=2) + "\n")
os.replace(tmp, path)
PY
```

Keep writes **small and atomic**. Never put private keys, RPC auth tokens, or seed phrases in this file or the repo.

## Security

- No wallet keys, seed phrases, or API secrets.
- `.gitignore` blocks `.env`, `*.pem`, `wallet*.json`, keypair files.
- Dashboard never submits orders — display-only JSON state.
- ADMIN trading wallet address in JSON is **public** only (no private material).
- Wallet panel shows a clear **Admin** chip/badge for the designated trading wallet.

## License

MIT — see [LICENSE](LICENSE).
