/**
 * Solana Desk — CSS 3D bots + full activity console + Phantom connect
 * Trading always ON (tradingEnabled=true). Pause defaults OFF. Admin Connect optional.
 * Deposit $5 ≈ SOL transfer to AGENT bot wallet via Phantom (admin signs). No private keys stored.
 * Bot book / Wallet / PnL track AGENT_WALLET. Admin Connect gate remains ADMIN_WALLET.
 * Activity: every event from data/activity.json rendered; live stream when bots work.
 */
(function () {
  "use strict";

  const DATA_URL = "data/activity.json";
  const REFRESH_MS = 4000;
  const CHAIN_POLL_MS = 5000;
  const ADMIN_WALLET = "3GfDwiEtei62mumu1J8XnaqkUFtbkVLQE2Btpr5yAeek";
  /** Bot trading book — Wallet/PnL cards + RPC track this address */
  const AGENT_WALLET = "99hEnCqL2Tp59pkymd3zfpenKQVWZXCKpCViGXaHw92j";
  const DEPOSIT_USD = 5;
  const RPC_URLS = [
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana",
    "https://solana-rpc.publicnode.com",
  ];
  let rpcUrlIdx = 0;
  const RPC_URL = RPC_URLS[0];
  const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  const KNOWN_MINTS = {
    So11111111111111111111111111111111111111112: "SOL",
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
    DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP: "SI",
    "13YLkUncbg2gjEFxcnz4iAyLHJXyLqdLvghWjEgNpump": "NTDA",
    Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump: "baton",
    "9XKzy4KahcZaGJPJtz1PtqGPB3CiseoBrx7TcQhEpump": "GOMO",
    ADPN2aqzY5RhkBC7bNQWFhTFFEYKY4drHUQG887Cpump: "CATCRAFT",
  };
  const SOLSCAN_TX = "https://solscan.io/tx/";
  const SOLSCAN_TOKEN = "https://solscan.io/token/";
  const SOLSCAN_ACCOUNT = "https://solscan.io/account/";
  const SOL_PRICE_URLS = [
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    "https://price.jup.ag/v6/price?ids=SOL",
  ];

  const BOT_META = {
    "grok-bot": {
      short: "GROK",
      label: "Grok",
      statusHint: "Coordinating",
      accent: "grok-bot",
    },
    "solana-scout": {
      short: "SCOUT",
      label: "Scout",
      statusHint: "Watching",
      accent: "solana-scout",
    },
    "solana-trader": {
      short: "TRADER",
      label: "Trader",
      statusHint: "Ready",
      accent: "solana-trader",
    },
    "portfolio-guard": {
      short: "GUARD",
      label: "Guard",
      statusHint: "Watching book",
      accent: "portfolio-guard",
    },
    "coach-bot": {
      short: "COACH",
      label: "Coach",
      statusHint: "Coaching",
      accent: "coach-bot",
    },
  };

  const BOT_ORDER = [
    "grok-bot",
    "solana-scout",
    "solana-trader",
    "portfolio-guard",
    "coach-bot",
  ];

  /** Seed events if activity.json has none — realistic ops lines, CT times via fmtTime */
  const SAMPLE_EVENTS = [
    {
      id: "seed-001",
      ts: new Date(Date.now() - 48 * 60000).toISOString(),
      bot: "grok-bot",
      level: "info",
      title: "Desk boot",
      message: "Coordinator online · Scout → Trader → Guard → Coach · positive-PnL",
    },
    {
      id: "seed-002",
      ts: new Date(Date.now() - 42 * 60000).toISOString(),
      bot: "solana-scout",
      level: "info",
      title: "Scout boot",
      message: "Watchlist armed: SOL JUP BONK WIF RAY · momentum scanner idle",
    },
    {
      id: "seed-003",
      ts: new Date(Date.now() - 35 * 60000).toISOString(),
      bot: "solana-scout",
      level: "signal",
      title: "SOL momentum pulse",
      message: "SOL/USDC score 78 · above VWAP · volume confirm last 3 bars",
    },
    {
      id: "seed-004",
      ts: new Date(Date.now() - 28 * 60000).toISOString(),
      bot: "solana-trader",
      level: "info",
      title: "Caps armed",
      message: "Positive-PnL · no hard size caps · awaiting Scout / Coach clears",
    },
    {
      id: "seed-005",
      ts: new Date(Date.now() - 20 * 60000).toISOString(),
      bot: "portfolio-guard",
      level: "info",
      title: "Book baseline",
      message: "Open flat · positive-PnL · Coach online · soft risk",
    },
    {
      id: "seed-006",
      ts: new Date(Date.now() - 12 * 60000).toISOString(),
      bot: "grok-bot",
      level: "info",
      title: "ADMIN wallet set",
      message: "3GfDwi…Aeek marked ADMIN · public address only · no keys on site",
    },
    {
      id: "seed-007",
      ts: new Date(Date.now() - 5 * 60000).toISOString(),
      bot: "portfolio-guard",
      level: "info",
      title: "Risk sweep",
      message: "Exposure check OK · no halt flags · book healthy",
    },
  ];

  /** Rotating work lines streamed while a bot is marked active */
  const WORK_LINES = {
    "grok-bot": [
      { title: "Route tick", message: "Syncing Scout scores → Trader queue · Guard risk latch" },
      { title: "Policy broadcast", message: "Positive-PnL mode · no hard caps · Coach online" },
      { title: "Desk heartbeat", message: "All agents ack · orchestration OK" },
    ],
    "solana-scout": [
      { title: "Price poll", message: "SOL/USDC tick · scoring short-horizon momentum" },
      { title: "Watchlist scan", message: "JUP BONK WIF RAY · relative volume check" },
      { title: "Signal draft", message: "Bias update · waiting for bar close confirmation" },
    ],
    "solana-trader": [
      { title: "Open book", message: "SI + NTDA + baton held · TP 50% skim armed" },
      { title: "Size check", message: "No new SI adds · Coach/Guard review · soft sizing" },
      { title: "Exec halted", message: "IDEA-001 fills done · waiting Guard clear" },
    ],
    "portfolio-guard": [
      { title: "PnL mark", message: "Day PnL vs 0.17 SOL funded · TP armed · soft −20%" },
      { title: "Exposure sweep", message: "SI+NTDA+baton open · 50% USDC skim @ TP1 → BE" },
      { title: "Cash check", message: "Free SOL ~0.048 · Profit USDC $0 · Coach aware" },
    ],
    "coach-bot": [
      { title: "Lesson tick", message: "Reviewing −$0.28 day · refine SI timing next clear" },
      { title: "Pos-PnL check", message: "Priority: net-positive · no hard dollar caps" },
      { title: "Coach note", message: "SI held · cash thin · size with edge not caps" },
    ],
  };

  let state = null;
  let pausedBotId = null;
  let deskPaused = false;
  /** Desk trading always enabled — not gated on admin Connect */
  let tradingEnabled = true;
  let connectedPubkey = null;
  let isAdminConnected = false;
  let solPriceUsd = null;
  let agentLive = null; // { solBalance, solUsd, lamports, source }
  let knownEventIds = new Set();
  let activeBotId = null;
  let streamTimer = null;
  let rotateTimer = null;
  let streamSeq = 0;
  let reduceMotion = false;
  let savedActiveBotId = null;
  let idleStudyTimer = null;
  let learnFxTimer = null;
  let motionBooted = false;
  let soundMuted = false;
  let audioCtx = null;
  let audioUnlocked = false;
  let knownTxSigs = null; // Set | null until first chain poll seeds
  let lastChainSigs = []; // last ~25 getSignaturesForAddress rows
  let chainPollBusy = false;
  let lastHoldingsSnap = "";
  let chartTf = "5m";
  const CHART_TF_KEY = "solana-desk-chart-tf";
  const TF_MS = { "1m": 60_000, "5m": 300_000, "1h": 3_600_000 };
  const SOUND_KEY = "solana-desk-sound-muted";
  const EQUITY_STORE_KEY = "solana-desk-equity-99hEn";
  const TX_STORE_KEY = "solana-desk-txsigs-99hEn";

  const $ = (sel, el = document) => el.querySelector(sel);

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtUsd(n, digits = 2) {
    if (n == null || Number.isNaN(n)) return "—";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    return `${sign}$${abs.toFixed(digits)}`;
  }

  function fmtPct(n) {
    if (n == null) return "—";
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}%`;
  }

  function shortAddr(addr) {
    if (!addr || addr.length < 12) return addr || "—";
    return addr.slice(0, 4) + "…" + addr.slice(-4);
  }

  function fmtTime(iso) {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleString("en-US", {
          timeZone: "America/Chicago",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }) + " CT"
      );
    } catch {
      return iso || "";
    }
  }

  function fmtTimeCompact(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return iso || "";
    }
  }

  function pnlClass(n) {
    if (n > 0) return "pos";
    if (n < 0) return "neg";
    return "flat";
  }

  function botShort(botId) {
    return BOT_META[botId]?.short || String(botId || "?").toUpperCase();
  }

  function getProvider() {
    const p = window.solana;
    if (p && p.isPhantom) return p;
    if (p) return p;
    return null;
  }

  async function loadData() {
    const res = await fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
    return res.json();
  }

  function ensureEvents(data) {
    const events = Array.isArray(data.events) ? data.events.slice() : [];
    if (events.length === 0) {
      data.events = SAMPLE_EVENTS.map((e) => ({ ...e }));
      data._seeded = true;
    } else {
      // Newest-first for display; keep every row
      data.events = events.slice().sort((a, b) => {
        const ta = new Date(a.ts || 0).getTime();
        const tb = new Date(b.ts || 0).getTime();
        return tb - ta;
      });
    }
    return data;
  }


  async function rpcCall(method, params, tries = 3) {
    let lastErr = null;
    for (let t = 0; t < tries; t++) {
      const url = RPC_URLS[(rpcUrlIdx + t) % RPC_URLS.length];
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now() + t,
            method,
            params,
          }),
        });
        if (!r.ok) throw new Error("RPC HTTP " + r.status);
        const j = await r.json();
        if (j.error) throw new Error(j.error.message || "RPC error");
        rpcUrlIdx = (rpcUrlIdx + t) % RPC_URLS.length;
        return j.result;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("RPC failed");
  }

  function shortSig(sig) {
    if (!sig || sig.length < 12) return String(sig || "—");
    return sig.slice(0, 6) + "…" + sig.slice(-4);
  }

  function shortMint(mint) {
    if (!mint || mint.length < 12) return String(mint || "—");
    return mint.slice(0, 4) + "…" + mint.slice(-4);
  }

  function solscanTxUrl(sig) {
    return SOLSCAN_TX + encodeURIComponent(sig || "");
  }

  function solscanTokenUrl(mint) {
    return SOLSCAN_TOKEN + encodeURIComponent(mint || "");
  }

  function solscanAccountUrl(addr) {
    return SOLSCAN_ACCOUNT + encodeURIComponent(addr || "");
  }

  function extLink(href, label, cls) {
    const safeHref = escapeHtml(href);
    const safeLabel = escapeHtml(label);
    const c = cls ? ` ${escapeHtml(cls)}` : "";
    return `<a class="ext-link${c}" href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  }

  function copyBtn(value, title) {
    const v = escapeHtml(value || "");
    const t = escapeHtml(title || "Copy");
    return `<button type="button" class="btn-copy-mini" data-copy="${v}" title="${t}" aria-label="${t}">Copy</button>`;
  }

  function mintSymbol(mint) {
    return KNOWN_MINTS[mint] || (mint ? mint.slice(0, 4) + "…" : "?");
  }

  function loadKnownTxSigs() {
    try {
      const raw = localStorage.getItem(TX_STORE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      return new Set();
    }
  }

  function saveKnownTxSigs(set) {
    try {
      localStorage.setItem(TX_STORE_KEY, JSON.stringify([...set].slice(-80)));
    } catch (_) { /* ignore */ }
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
      const ctx = ensureAudio();
      if (ctx?.state === "suspended") ctx.resume();
    } catch (_) { /* ignore */ }
  }

  async function fetchSolPrice() {
    try {
      const r = await fetch(SOL_PRICE_URLS[0], { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (j?.solana?.usd) return Number(j.solana.usd);
      }
    } catch (_) { /* fall through */ }
    try {
      const r = await fetch(SOL_PRICE_URLS[1], { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        const p = j?.data?.SOL?.price;
        if (p) return Number(p);
      }
    } catch (_) { /* fall through */ }
    return 140;
  }

  async function fetchAgentSolBalance() {
    try {
      const lamports = await rpcCall("getBalance", [AGENT_WALLET]);
      const value = typeof lamports === "object" ? lamports?.value : lamports;
      if (value == null) throw new Error("no balance");
      const solBalance = value / 1e9;
      const price = solPriceUsd || 140;
      return {
        lamports: value,
        solBalance,
        solUsd: solBalance * price,
        source: "rpc",
      };
    } catch (err) {
      console.warn("agent balance RPC failed", err);
      return null;
    }
  }

  function agentAddress() {
    return (
      state?.wallet?.address ||
      state?.agentWallet?.address ||
      AGENT_WALLET
    );
  }

  function renderAgentTrack() {
    const addr = agentAddress();
    const shortEl = $("#agent-addr-short");
    const fullEl = $("#agent-addr-full");
    const solEl = $("#agent-bal-sol");
    const usdEl = $("#agent-bal-usd");
    const srcEl = $("#agent-bal-src");
    if (shortEl) shortEl.textContent = shortAddr(addr);
    if (fullEl) fullEl.textContent = addr;

    const w = state?.wallet || {};
    const live = agentLive;
    const solBal =
      live?.solBalance ?? w.solBalance ?? null;
    const equity = w.totalUsd ?? state?.pnl?.equityUsd ?? null;
    if (solEl) {
      solEl.textContent =
        solBal != null ? `${Number(solBal).toFixed(6)} SOL` : "— SOL";
    }
    if (usdEl) {
      const si = w.siBalance ?? state?.pnl?.siQty;
      const parts = [];
      if (equity != null) parts.push(`equity ${fmtUsd(equity)}`);
      if (si != null) parts.push(`${Number(si).toFixed(2)} SI`);
      usdEl.textContent = parts.join(" · ") || "—";
    }
    if (srcEl) {
      srcEl.textContent = live?.source === "rpc" ? "RPC live" : "activity.json";
    }
  }

  function solForDeposit() {
    const price = solPriceUsd || 120;
    return DEPOSIT_USD / price;
  }

  function updateJupiterLink() {
    const link = $("#link-jupiter");
    if (!link) return;
    const sol = solForDeposit();
    link.href =
      "https://jup.ag/swap/SOL-USDC?inAmount=" +
      encodeURIComponent(sol.toFixed(4));
    link.title = `Open Jupiter (~${sol.toFixed(4)} SOL ≈ $${DEPOSIT_USD})`;
  }

  function setBanner(kind, html) {
    const el = $("#wallet-banner");
    if (!el) return;
    if (!html) {
      el.hidden = true;
      el.textContent = "";
      el.className = "wallet-banner";
      return;
    }
    el.hidden = false;
    el.className = "wallet-banner " + (kind || "info");
    el.innerHTML = html;
  }

  function syncConnectButtons(label, disabled, wrong) {
    const headerBtn = $("#btn-connect");
    if (!headerBtn) return;
    headerBtn.textContent = label;
    headerBtn.disabled = !!disabled;
    headerBtn.classList.toggle("wrong", !!wrong);
  }

  function syncTradingStatusLine() {
    const modeEl = $("#status-mode");
    const tradingEl = $("#status-trading");
    // Trading is always enabled; Pause only freezes desk motion/stream UI
    if (deskPaused) {
      if (modeEl) {
        modeEl.textContent = "PAUSED";
        modeEl.className = "status-mode off";
      }
      if (tradingEl) tradingEl.textContent = tradingEnabled ? "Trading ON · paused" : "Trading off";
    } else {
      if (modeEl) {
        modeEl.textContent = "LIVE";
        modeEl.className = "status-mode live";
      }
      if (tradingEl) tradingEl.textContent = tradingEnabled ? "Trading ON" : "Trading off";
    }
  }

  function updateConnectUi() {
    const disc = $("#btn-disconnect");
    const walletEl = $("#status-wallet");
    const deposit = $("#deposit-panel");

    tradingEnabled = true;
    syncTradingStatusLine();

    if (connectedPubkey) {
      if (disc) disc.hidden = false;

      if (isAdminConnected) {
        syncConnectButtons("Admin connected", true, false);
        if (walletEl) {
          walletEl.innerHTML = `Admin <span class="status-wallet-short" title="${escapeHtml(connectedPubkey)}">${escapeHtml(shortAddr(connectedPubkey))}</span>`;
        }
        setBanner(
          "ok",
          `<strong>Admin</strong> · Trading ON · Positive-PnL · Coach online · Bot book <code>${escapeHtml(shortAddr(AGENT_WALLET))}</code> · Connected <code>${escapeHtml(shortAddr(connectedPubkey))}</code>`
        );
        if (deposit) deposit.hidden = false;
        updateDepositHint();
      } else {
        syncConnectButtons("Wrong wallet", false, true);
        if (walletEl) {
          walletEl.innerHTML = `<span class="status-wallet-short" title="${escapeHtml(connectedPubkey)}">${escapeHtml(shortAddr(connectedPubkey))}</span>`;
        }
        setBanner(
          "warn",
          `<strong>Non-admin wallet</strong> — trading stays ON via bot book <code>${escapeHtml(shortAddr(AGENT_WALLET))}</code>. Admin <code>${escapeHtml(shortAddr(ADMIN_WALLET))}</code> is optional for deposit. Connected: <code>${escapeHtml(shortAddr(connectedPubkey))}</code>`
        );
        if (deposit) deposit.hidden = true;
      }
    } else {
      syncConnectButtons("Connect Wallet", false, false);
      if (disc) disc.hidden = true;
      if (walletEl) walletEl.textContent = "agent book";
      // Keep banner subtle — trading already ON without connect
      const banner = $("#wallet-banner");
      if (banner) {
        banner.hidden = true;
        banner.innerHTML = "";
      }
      if (deposit) deposit.hidden = true;
    }

    if (state) renderStatusPnl(state);
  }

  function updateDepositHint() {
    const hint = $("#deposit-hint");
    const sol = solForDeposit();
    if (hint) {
      hint.textContent =
        `Sends ~${sol.toFixed(4)} SOL (≈ $${DEPOSIT_USD}) to bot AGENT ${shortAddr(AGENT_WALLET)} via Phantom (admin signs). No private keys are stored on this site.`;
    }
    updateJupiterLink();
  }

  function renderStatusPnl(data) {
    const pnl = data.pnl || {};
    const day = pnl.dayPnlUsd ?? 0;
    const sign = day > 0 ? "+" : "";
    const pEl = $("#status-pnl");
    if (pEl) {
      pEl.className = pnlClass(day);
      pEl.textContent = `Trade PnL ${sign}${fmtUsd(day)}`;
    }
  }

  function renderStatusLine(data) {
    renderStatusPnl(data);
  }

  function oneLineStatus(bot) {
    const hint = BOT_META[bot.id]?.statusHint || "Online";
    if (bot.status && bot.status !== "online") return bot.status;
    const src = bot.focus || bot.tagline || hint;
    const cut = src.split("·")[0].trim();
    return cut.length > 28 ? cut.slice(0, 26) + "…" : cut;
  }

  function shortName(b) {
    const map = {
      "grok-bot": "Grok",
      "solana-scout": "Scout",
      "solana-trader": "Trader",
      "portfolio-guard": "Guard",
      "coach-bot": "Coach",
    };
    return map[b.id] || b.name || "Bot";
  }

  function $$bots(el) {
    return [...el.querySelectorAll(".bot")];
  }

  function botFigureHtml(botId) {
    const letter =
      botId === "grok-bot"
        ? "G"
        : botId === "solana-scout"
          ? "S"
          : botId === "solana-trader"
            ? "T"
            : botId === "portfolio-guard"
              ? "R"
              : botId === "coach-bot"
                ? "C"
                : "?";
    return `
      <span class="bot-figure bot-ghost" aria-hidden="true">
        <span class="bot-glow"></span>
        <span class="bot-shadow"></span>
        <span class="bot-body-3d">
          <span class="ghost-sheet">
            <span class="bot-head">
              <span class="ghost-eye l"></span>
              <span class="ghost-eye r"></span>
              <span class="ghost-mouth"></span>
            </span>
            <span class="bot-arm l"></span>
            <span class="bot-arm r"></span>
            <span class="bot-badge">${letter}</span>
            <span class="ghost-hem" aria-hidden="true"></span>
          </span>
        </span>
      </span>`;
  }

  function renderBots(bots) {
    const el = $("#bots");
    if (!el) return;

    const list = bots?.length
      ? bots
      : [
          { id: "grok-bot", name: "Grok Bot", status: "online", lastAction: "—" },
          { id: "solana-scout", name: "Solana Scout", status: "online", lastAction: "—" },
          { id: "solana-trader", name: "Solana Trader", status: "online", lastAction: "—" },
          { id: "portfolio-guard", name: "Portfolio Guard", status: "online", lastAction: "—" },
          { id: "coach-bot", name: "Coach", status: "online", lastAction: "—" },
        ];

    const FIGURE_VER = "ghost1";
    const existing = $$bots(el);
    if (existing.length === list.length && el.dataset.figureVer === FIGURE_VER) {
      list.forEach((b) => {
        const node = el.querySelector(`[data-bot="${CSS.escape(b.id)}"]`);
        if (!node) return;
        node.dataset.lastAction = b.lastAction || "";
        node.dataset.lastAt = b.lastAt || "";
        const nameEl = node.querySelector(".bot-name");
        if (nameEl) nameEl.textContent = shortName(b);
        node.classList.toggle("active", activeBotId === b.id);
        node.classList.toggle("paused", deskPaused || pausedBotId === b.id);
      });
      return;
    }
    el.dataset.figureVer = FIGURE_VER;

    el.innerHTML = list
      .map((b, i) => {
        const active = activeBotId === b.id ? " active" : "";
        const paused = pausedBotId === b.id ? " paused" : "";
        return `
        <button type="button" class="bot${active}${paused}"
          data-bot="${escapeHtml(b.id)}"
          data-path="${i % 5}"
          data-last-action="${escapeHtml(b.lastAction || "")}"
          data-last-at="${escapeHtml(b.lastAt || "")}"
          aria-label="${escapeHtml(b.name)} — ${escapeHtml(oneLineStatus(b))}">
          ${botFigureHtml(b.id)}
          <span class="bot-name">${escapeHtml(shortName(b))}</span>
          <span class="bot-status-line">${escapeHtml(oneLineStatus(b))}</span>
        </button>`;
      })
      .join("");

    bindBotInteractions();
  }

  function showTooltip(botEl) {
    const tip = $("#bot-tooltip");
    const floor = $("#desk-floor");
    if (!tip || !floor || !botEl) return;

    const action = botEl.dataset.lastAction || "No recent action";
    const when = botEl.dataset.lastAt ? fmtTime(botEl.dataset.lastAt) : "";
    const name = botEl.querySelector(".bot-name")?.textContent || "Bot";

    tip.innerHTML = `<strong>${escapeHtml(name)}</strong>${escapeHtml(action)}${when ? `<span class="when">${escapeHtml(when)}</span>` : ""}`;
    tip.hidden = false;

    const floorRect = floor.getBoundingClientRect();
    const botRect = botEl.getBoundingClientRect();
    let left = botRect.left - floorRect.left + botRect.width / 2 - 100;
    let top = botRect.top - floorRect.top - 12;

    tip.style.left = "0px";
    tip.style.top = "0px";
    const tipW = tip.offsetWidth || 220;
    const tipH = tip.offsetHeight || 80;

    left = Math.max(8, Math.min(left, floorRect.width - tipW - 8));
    top = top - tipH;
    if (top < 8) top = botRect.bottom - floorRect.top + 8;
    top = Math.max(8, Math.min(top, floorRect.height - tipH - 8));

    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  function hideTooltip() {
    const tip = $("#bot-tooltip");
    if (tip) tip.hidden = true;
  }

  function setPaused(botId) {
    pausedBotId = botId;
    $$bots($("#bots")).forEach((el) => {
      const freeze = deskPaused || el.dataset.bot === botId;
      el.classList.toggle("paused", freeze);
    });
  }

  function setActiveBot(botId) {
    activeBotId = botId;
    $$bots($("#bots")).forEach((el) => {
      el.classList.toggle("active", el.dataset.bot === botId);
    });
    document.querySelectorAll(".tag-chip").forEach((chip) => {
      const hot =
        botId &&
        (chip.classList.contains(botId) ||
          [...chip.classList].some((c) => c === botId));
      chip.classList.toggle("is-hot", !!hot);
    });
    const shell = $(".activity-console");
    if (shell) shell.classList.toggle("is-streaming", !!botId);
    const live = $("#console-live");
    if (live) {
      if (deskPaused) live.textContent = "PAUSED";
      else {
        live.textContent = botId
          ? "STREAM · " + botShort(botId)
          : "IDLE";
      }
    }
  }

  function bindBotInteractions() {
    const bots = $$bots($("#bots"));
    bots.forEach((botEl) => {
      botEl.addEventListener("mouseenter", () => {
        setPaused(botEl.dataset.bot);
        showTooltip(botEl);
      });
      botEl.addEventListener("mouseleave", () => {
        if (pausedBotId === botEl.dataset.bot && !botEl.dataset.sticky) {
          setPaused(null);
          hideTooltip();
        }
      });
      botEl.addEventListener("focus", () => {
        setPaused(botEl.dataset.bot);
        showTooltip(botEl);
      });
      botEl.addEventListener("blur", () => {
        if (!botEl.dataset.sticky) {
          setPaused(null);
          hideTooltip();
        }
      });
      botEl.addEventListener("click", (e) => {
        e.preventDefault();
        const id = botEl.dataset.bot;
        const wasSticky = botEl.dataset.sticky === "1";
        bots.forEach((b) => delete b.dataset.sticky);
        if (wasSticky) {
          setPaused(null);
          hideTooltip();
        } else {
          botEl.dataset.sticky = "1";
          setPaused(id);
          showTooltip(botEl);
        }
      });
    });

    const floor = $("#desk-floor");
    if (floor && !floor.dataset.boundClear) {
      floor.dataset.boundClear = "1";
      floor.addEventListener("click", (e) => {
        if (e.target.closest(".bot")) return;
        $$bots($("#bots")).forEach((b) => delete b.dataset.sticky);
        setPaused(null);
        hideTooltip();
      });
    }
  }

  function getHoldings(wallet) {
    const fromWallet = wallet?.holdings || state?.wallet?.holdings || state?.pnl?.holdings;
    if (Array.isArray(fromWallet) && fromWallet.length) return fromWallet;
    const w = wallet || state?.wallet || {};
    const p = state?.pnl || {};
    const liveSol = agentLive?.solBalance;
    const rows = [];
    const solBal = liveSol ?? w.solBalance ?? p.solBalance;
    if (solBal != null) {
      rows.push({
        symbol: "SOL",
        mint: "So11111111111111111111111111111111111111112",
        label: "Free SOL cash",
        kind: "native",
        qty: Number(solBal),
        priceUsd: w.solPriceUsd ?? p.solPriceUsd ?? solPriceUsd,
        valueUsd: w.solUsd ?? p.solUsd,
      });
    }
    if (w.siBalance != null || p.siQty != null) {
      rows.push({
        symbol: "SI",
        mint: "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP",
        name: "Super Inu",
        label: "SI · Token-2022",
        kind: "token2022",
        qty: Number(w.siBalance ?? p.siQty),
        priceUsd: w.siMark ?? p.siMark,
        valueUsd: w.siMarkUsd ?? p.siMarkUsd,
        costUsd: w.siCostUsd ?? p.siCostUsd,
      });
    }
    if (w.ntdaBalance != null || p.ntdaQty != null) {
      rows.push({
        symbol: "NTDA",
        mint: "13YLkUncbg2gjEFxcnz4iAyLHJXyLqdLvghWjEgNpump",
        label: "NTDA · Token-2022",
        kind: "token2022",
        qty: Number(w.ntdaBalance ?? p.ntdaQty),
        priceUsd: w.ntdaMark ?? p.ntdaMark,
        valueUsd: w.ntdaMarkUsd ?? p.ntdaMarkUsd,
        costUsd: w.ntdaCostUsd ?? p.ntdaCostUsd,
      });
    }
    if (w.batonBalance != null || p.batonQty != null) {
      rows.push({
        symbol: "baton",
        mint: "Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump",
        label: "baton · Token-2022",
        kind: "token2022",
        qty: Number(w.batonBalance ?? p.batonQty),
        priceUsd: w.batonMark ?? p.batonMark,
        valueUsd: w.batonMarkUsd ?? p.batonMarkUsd,
        costUsd: w.batonCostUsd ?? p.batonCostUsd,
      });
    }
    return rows;
  }

  function renderWallet(wallet) {
    const el = $("#wallet-body");
    if (!el) return;
    const addr = wallet?.address || AGENT_WALLET;
    const liveSol = agentLive?.solBalance;
    const solBal = liveSol ?? wallet?.solBalance ?? 0;
    const equity = wallet?.totalUsd ?? wallet?.equityUsd;
    const holdings = getHoldings(wallet);
    const tokenBits = holdings
      .filter((h) => h.symbol !== "SOL")
      .map((h) => {
        const q = h.displayQty || Number(h.qty).toFixed(2);
        return `${q} ${h.symbol}`;
      })
      .join(" · ");
    if (!wallet && !agentLive) {
      el.innerHTML = `<p class="muted">No wallet data</p>`;
      return;
    }
    el.innerHTML = `
      <span class="admin-tag">Trading wallet · AGENT · token holder</span>
      <div class="big">${fmtUsd(equity)}</div>
      <div class="sub">${Number(solBal).toFixed(6)} SOL free${tokenBits ? ` · ${escapeHtml(tokenBits)}` : ""}</div>
      <div class="sub" style="margin-top:0.35rem;color:var(--text-mute)">See Day equity panel for qty + $ per token</div>
      <div class="mono" title="${escapeHtml(addr)}">${escapeHtml(shortAddr(addr))}</div>
      <div class="wallet-full">${escapeHtml(addr)}</div>
      <div class="sub" style="margin-top:0.45rem;color:var(--text-mute)">Funded ${wallet?.fundedSol ?? wallet?.baselineSol ?? 0.17} SOL deposited · admin gate ${escapeHtml(shortAddr(ADMIN_WALLET))}</div>
    `;
    renderAgentTrack();
    renderHoldingsTable(wallet);
  }

  function renderPnL(pnl) {
    const el = $("#pnl-body");
    if (!el) return;
    const day = pnl?.dayPnlUsd ?? 0;
    const sign = day > 0 ? "+" : "";
    const open = pnl?.openExposureUsd ?? 0;
    const equity = pnl?.equityUsd ?? state?.wallet?.totalUsd;
    const funded = pnl?.fundedSol ?? pnl?.baselineSol ?? state?.wallet?.fundedSol ?? 0.17;
    const tp = pnl?.takeProfit || state?.takeProfit || {};
    const tpOn = tp.active !== false && (state?.riskCaps?.takeProfitActive !== false);
    const profitUsdc = tp.profitUsdc ?? state?.wallet?.profitUsdc ?? 0;
    const si = pnl?.siQty != null ? Number(pnl.siQty).toFixed(2) : "—";
    const ntda = pnl?.ntdaQty != null ? Number(pnl.ntdaQty).toFixed(2) : "—";
    const baton = pnl?.batonQty != null ? Number(pnl.batonQty).toFixed(2) : "—";
    const levels = tp.levels || {};
    const lvlLine = ["SI", "NTDA", "baton"]
      .filter((s) => levels[s])
      .map((s) => {
        const L = levels[s];
        return `${s} TP1 $${Number(L.tp1).toFixed(5)} / stop $${Number(L.stop).toFixed(5)}`;
      })
      .join(" · ");
    el.innerHTML = `
      <div class="big ${pnlClass(day)}">${sign}${fmtUsd(day)}</div>
      <div class="sub">Day · ${fmtPct(pnl?.dayPnlPct)} · equity ${fmtUsd(equity)} · vs ${funded} SOL funded</div>
      <div class="sub" style="margin-top:0.55rem;color:var(--text-mute)">
        Open ${fmtUsd(open)} · SI ${si} · NTDA ${ntda} · baton ${baton}
      </div>
      <div class="sub" style="margin-top:0.35rem;color:var(--ok)">
        ${tpOn ? "TP ACTIVE · 50% USDC skim @ TP1 → BE stop" : "TP off"} · Profit USDC ${fmtUsd(profitUsdc)}
      </div>
      ${lvlLine ? `<div class="sub" style="margin-top:0.35rem;color:var(--text-mute)">${escapeHtml(lvlLine)}</div>` : ""}
      <div class="sub" style="margin-top:0.35rem">${escapeHtml(pnl?.goalLabel || "TP ACTIVE · positive-PnL")}</div>
    `;
    syncVitalCards(pnl);
  }

  function renderCaps(caps) {
    const el = $("#caps-body");
    if (!el) return;
    const c = caps || {};
    const tp = state?.takeProfit || state?.pnl?.takeProfit || {};
    const modeLabel =
      c.label ||
      (c.takeProfitActive || tp.active
        ? "TP ACTIVE · 50% USDC skim @ TP1 → BE"
        : c.hardCaps === false
          ? "Positive-PnL mode · no hard caps"
          : "Positive-PnL mode");
    const coachOn = c.coachOnline !== false && (state?.status?.coachOnline !== false);
    const learn = c.learnFromMistakes ?? state?.status?.learnFromMistakes;
    const profitUsdc = c.profitUsdc ?? tp.profitUsdc ?? 0;
    el.innerHTML = `
      <span class="admin-tag tag-tp">TP ${tp.active === false ? "off" : "ARMED"}</span>
      <span class="admin-tag tag-coach" style="margin-left:0.35rem">Coach ${coachOn ? "online" : "—"}</span>
      <div class="big" style="font-size:1.05rem;letter-spacing:-0.015em">${escapeHtml(modeLabel)}</div>
      <ul class="caps-list" style="margin-top:0.65rem">
        <li><span class="label">Size / trade</span><span class="val">≤10–15% free SOL</span></li>
        <li><span class="label">Win skim</span><span class="val">50% → USDC</span></li>
        <li><span class="label">Rest</span><span class="val">Compound</span></li>
        <li><span class="label">Profit USDC</span><span class="val">${fmtUsd(profitUsdc)}</span></li>
        <li><span class="label">Learn</span><span class="val">${learn === false ? "Off" : "ON"}</span></li>
      </ul>
      <div class="sub" style="margin-top:0.55rem;color:var(--text-mute)">${escapeHtml(c.strategy || "≤10–15% free SOL/trade · 50% skim USDC · compound rest")}</div>
    `;
  }


  function renderGoal(data) {
    const el = $("#goal-body");
    if (!el) return;
    const g = data?.goal || {};
    const w = data?.wallet || {};
    const p = data?.pnl || {};
    const target = Number(g.targetUsd ?? p.goalTargetUsd ?? 3000);
    const solUsd = Number(g.components?.solCashUsd ?? w.solUsd ?? 0);
    const usdc = Number(g.components?.usdcBalance ?? w.usdcBalance ?? 0);
    const profitUsdc = Number(
      g.components?.profitUsdc ?? w.profitUsdc ?? p.profitUsdc ?? 0
    );
    const current = Number(
      g.currentUsd ?? p.goalCurrentUsd ?? w.solUsdcStackUsd ?? solUsd + usdc + profitUsdc
    );
    const pct = Math.max(
      0,
      Math.min(100, Number(g.progressPct ?? p.goalProgressPct ?? (target ? (100 * current) / target : 0)))
    );
    const risk = data?.risk || {};
    el.innerHTML = `
      <div class="goal-meter-big">${fmtUsd(current)} <span style="font-size:0.85rem;color:var(--text-mute);font-weight:500">/ ${fmtUsd(target)}</span></div>
      <div class="goal-meter" role="meter" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${current}" aria-label="Progress to first $3000 SOL plus USDC goal">
        <div class="goal-meter-track"><div class="goal-meter-fill" style="width:${pct.toFixed(3)}%"></div></div>
        <div class="goal-meter-meta">
          <span>${pct.toFixed(2)}% to first $3,000</span>
          <span>${fmtUsd(Math.max(0, target - current))} remaining</span>
        </div>
      </div>
      <div class="goal-chips">
        <span class="goal-chip strong">SOL cash ${fmtUsd(solUsd)}</span>
        <span class="goal-chip strong">USDC ${fmtUsd(usdc)}</span>
        <span class="goal-chip strong">Profit USDC ${fmtUsd(profitUsdc)}</span>
        <span class="goal-chip">${escapeHtml(risk.maxFreeSolPctLabel || "≤10–15% free SOL / trade")}</span>
        <span class="goal-chip">${escapeHtml(risk.compoundLabel || "50% win skim → USDC · compound rest")}</span>
      </div>
      <div class="sub" style="margin-top:0.55rem;color:var(--text-mute)">${escapeHtml(g.note || "Counts free SOL (USD) + USDC pocket only — not open token marks")}</div>
    `;
  }

  function renderHoldingsTable(wallet) {
    const el = $("#holdings-table");
    const totalEl = $("#holdings-total");
    if (!el) return;
    const holdings = getHoldings(wallet || state?.wallet);
    const tp = state?.takeProfit || state?.pnl?.takeProfit || {};
    const levels = tp.levels || {};
    if (!holdings.length) {
      el.innerHTML = `<p class="muted">No token holdings</p>`;
      if (totalEl) totalEl.textContent = "—";
      return;
    }
    let sum = 0;
    el.innerHTML = holdings
      .map((h) => {
        const qty = Number(h.qty);
        let value = h.valueUsd;
        if (value == null && h.priceUsd != null && !Number.isNaN(qty)) {
          value = qty * Number(h.priceUsd);
        }
        if (value != null && !Number.isNaN(Number(value))) sum += Number(value);
        const mark = h.priceUsd != null ? `$${Number(h.priceUsd).toFixed(h.symbol === "SOL" ? 2 : 5)}` : "—";
        const qtyStr =
          h.displayQty ||
          (h.symbol === "SOL"
            ? qty.toFixed(6)
            : qty.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              }));
        const qtyLab = h.displayLabel || (h.symbol === "SOL" ? "Free SOL" : `${h.symbol} held`);
        const L = levels[h.symbol] || {};
        const upnl =
          h.costUsd != null && value != null ? Number(value) - Number(h.costUsd) : null;
        const upnlCls = upnl == null ? "" : upnl < 0 ? "neg" : upnl > 0 ? "pos" : "";
        const isLive = h.label?.includes("live") || h.kind === "spl" || h.kind === "token2022" || h.kind === "native";
        const livePill = isLive
          ? `<span class="live-pill" title="On-chain via RPC">LIVE</span>`
          : "";
        const tpPill =
          h.symbol === "SOL"
            ? `<span class="tp-pill">cash</span>`
            : `<span class="tp-pill">TP armed</span>`;
        const tpDetail =
          h.symbol !== "SOL" && (h.tp1 || L.tp1)
            ? ` · TP1 $${Number(h.tp1 || L.tp1).toFixed(5)} · stop $${Number(h.stop || L.stop).toFixed(5)}`
            : "";
        const costBit =
          h.costUsd != null ? ` · cost ${fmtUsd(h.costUsd)}` : "";
        const mint = h.mint || (h.symbol === "SOL" ? "So11111111111111111111111111111111111111112" : "");
        const mintRow = mint
          ? `<div class="mint-row">
              <code class="mint-short" title="${escapeHtml(mint)}">${escapeHtml(shortMint(mint))}</code>
              ${copyBtn(mint, "Copy mint")}
              ${extLink(solscanTokenUrl(mint), "Solscan", "solscan-link")}
            </div>`
          : "";
        return `<div class="holding-row${h.symbol === "SOL" ? " is-sol" : ""}">
          <div>
            <span class="sym">${escapeHtml(h.symbol)}</span>${livePill}
            <span class="sym-sub">${escapeHtml(h.label || h.name || h.kind || "token")}</span>
            ${mintRow}
          </div>
          <div class="qty"><span class="qty-lab">${escapeHtml(qtyLab)}</span><span class="holding-qty-big">${escapeHtml(qtyStr)}</span></div>
          <div>
            <div class="val">${fmtUsd(value)}</div>
            <div class="mark">mark ${escapeHtml(mark)}</div>
          </div>
          ${tpPill}
          <div class="upnl ${upnlCls}">${
            upnl == null
              ? "Native SOL cash"
              : `uPnL ${upnl >= 0 ? "+" : ""}${fmtUsd(upnl)}${costBit}${tpDetail}`
          }</div>
        </div>`;
      })
      .join("");
    if (totalEl) {
      totalEl.textContent = `book ${fmtUsd(sum)} · ${holdings.length} lines`;
    }
    bindCopyButtons(el);
  }

  function bindCopyButtons(root) {
    if (!root) return;
    root.querySelectorAll("[data-copy]").forEach((btn) => {
      if (btn.dataset.boundCopy === "1") return;
      btn.dataset.boundCopy = "1";
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = btn.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(val);
          const prev = btn.textContent;
          btn.textContent = "✓";
          setTimeout(() => { btn.textContent = prev || "Copy"; }, 900);
        } catch (_) { /* ignore */ }
      });
    });
  }

  function renderTxPanel(sigs) {
    const el = $("#tx-table");
    const countEl = $("#tx-count");
    if (!el) return;
    const list = Array.isArray(sigs) ? sigs.slice(0, 25) : [];
    if (countEl) {
      countEl.textContent = list.length
        ? `${list.length} recent · RPC live`
        : "waiting for chain…";
    }
    if (!list.length) {
      el.innerHTML = `<p class="muted">No recent signatures yet — polling ${escapeHtml(shortAddr(AGENT_WALLET))}</p>`;
      return;
    }
    el.innerHTML = list
      .map((s) => {
        const sig = s?.signature || "";
        const err = s?.err;
        const ok = !err;
        const ts = s?.blockTime
          ? new Date(s.blockTime * 1000).toISOString()
          : null;
        const status = ok
          ? `<span class="tx-status ok">OK</span>`
          : `<span class="tx-status fail">FAIL</span>`;
        return `<div class="tx-row${ok ? "" : " is-fail"}">
          <div class="tx-time">${escapeHtml(ts ? fmtTimeCompact(ts) : "—")}</div>
          <div class="tx-status-cell">${status}</div>
          <div class="tx-sig">
            <code title="${escapeHtml(sig)}">${escapeHtml(shortSig(sig))}</code>
            ${copyBtn(sig, "Copy signature")}
          </div>
          <div class="tx-links">
            ${extLink(solscanTxUrl(sig), "Solscan ↗", "solscan-link")}
          </div>
        </div>`;
      })
      .join("");
    bindCopyButtons(el);
  }

  function eventKey(e) {
    return e.id || `${e.ts}|${e.bot}|${e.title}`;
  }

  function classifyEvent(e) {
    const blob = `${e?.title || ""} ${e?.message || ""} ${(e?.tags || []).join(" ")} ${e?.level || ""}`.toLowerCase();
    const bot = e?.bot || "";
    const isTrade =
      e?.source === "chain" ||
      /\b(buy|sell|fill|filled|execut|trade|order|swap|routed|jupiter|on-chain)\b/.test(blob) ||
      /→|->|⇒/.test(`${e?.title || ""} ${e?.message || ""}`) ||
      (e?.level === "signal" && (bot === "solana-trader" || bot === "solana-scout")) ||
      (e?.tags || []).some((t) => /buy|sell|fill|trade|swap|tx|chain/i.test(t));
    const isLearn =
      bot === "coach-bot" ||
      /\b(learn|lesson|coach|review|mistak)/.test(blob) ||
      (e?.tags || []).some((t) => /learn|coach|review|lesson/i.test(t));
    return { isTrade, isLearn };
  }

  function buildFeedItem(e, opts) {
    const fresh = opts?.fresh ? " fresh" : "";
    const level = e.level ? ` level-${escapeHtml(e.level)}` : "";
    const botClass = escapeHtml(e.bot || "");
    const kind = classifyEvent(e);
    const kindClass = kind.isTrade ? " is-trade" : kind.isLearn ? " is-learn" : "";
    const solscanBit =
      e.signature
        ? ` ${extLink(solscanTxUrl(e.signature), "Solscan ↗", "solscan-inline")}`
        : "";
    const msg = e.message
      ? `<span class="line-msg">${escapeHtml(e.message)}${solscanBit}</span>`
      : solscanBit
        ? `<span class="line-msg">${solscanBit}</span>`
        : "";
    const learnBadge = kind.isLearn
      ? `<span class="line-level learn-tag">LEARN</span>`
      : "";
    const levelBadge = e.level
      ? `<span class="line-level">${escapeHtml(e.level)}</span>`
      : "";
    return `<li class="${fresh}${level}${kindClass}" data-eid="${escapeHtml(eventKey(e))}">
      <span class="ts">${escapeHtml(fmtTimeCompact(e.ts))}</span>
      <span class="bot-tag ${botClass}">${escapeHtml(botShort(e.bot))}</span>
      <span class="line-body">
        <span class="line-title">${escapeHtml(e.title || "event")}</span>${learnBadge}${levelBadge}
        ${msg}
      </span>
    </li>`;
  }

  /** Full log — every event, no silent truncation */
  function renderFeed(events, opts) {
    const el = $("#activity-feed");
    const countEl = $("#console-count");
    const viewport = $("#console-viewport");
    if (!el) return;

    const list = Array.isArray(events) ? events.slice() : [];
    // Display newest first for ops console (already sorted in ensureEvents)
    if (!list.length) {
      el.innerHTML = `<li class="muted-line">No activity yet — waiting for data/activity.json</li>`;
      if (countEl) countEl.textContent = "0 events";
      knownEventIds = new Set();
      return;
    }

    const stickBottom =
      viewport &&
      viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 40;

    const prevIds = knownEventIds;
    const nextIds = new Set(list.map(eventKey));
    const isFirstPaint = prevIds.size === 0;

    el.innerHTML =
      list
        .map((e) => {
          const key = eventKey(e);
          const fresh = !isFirstPaint && !prevIds.has(key);
          return buildFeedItem(e, { fresh });
        })
        .join("") +
      (deskPaused
        ? `<li class="cursor-line" aria-hidden="true">desk paused — press Resume</li>`
        : activeBotId
          ? `<li class="cursor-line" aria-hidden="true">[${botShort(activeBotId)}] working</li>`
          : "");

    const freshEvents = isFirstPaint
      ? []
      : list.filter((e) => !prevIds.has(eventKey(e)));
    knownEventIds = nextIds;
    if (countEl) {
      countEl.textContent =
        list.length === 1 ? "1 event" : `${list.length} events`;
    }

    if (opts?.scrollTop || isFirstPaint) {
      if (viewport) viewport.scrollTop = 0;
    } else if (stickBottom && viewport) {
      viewport.scrollTop = 0; // newest at top — stay at top on refresh
    }

    if (!isFirstPaint && freshEvents.length) {
      reactToEvents(freshEvents);
    } else if (isFirstPaint && list.length && !motionBooted) {
      motionBooted = true;
      // Soft boot cue from newest persisted event
      const top = list.find((e) => !e._ephemeral) || list[0];
      if (top) reactToEvents([top], { soft: true });
    }
  }

  function prependStreamLine(botId, title, message) {
    if (!state || deskPaused) return;
    streamSeq += 1;
    const evt = {
      id: `live-${botId}-${streamSeq}-${Date.now()}`,
      ts: new Date().toISOString(),
      bot: botId,
      level: "info",
      title,
      message,
      _ephemeral: true,
    };
    // Keep full persisted history + ephemeral stream lines at front
    const persisted = (state.events || []).filter((e) => !e._ephemeral);
    const ephemeral = (state.events || []).filter((e) => e._ephemeral).slice(0, 24);
    state.events = [evt, ...ephemeral, ...persisted];
    renderFeed(state.events);
    const viewport = $("#console-viewport");
    if (viewport) viewport.scrollTop = 0;
  }

  function clearEphemeral() {
    if (!state?.events) return;
    state.events = state.events.filter((e) => !e._ephemeral);
  }

  function stopBotStream(opts) {
    const keepActive = !!(opts && opts.keepActive);
    if (streamTimer) {
      clearInterval(streamTimer);
      streamTimer = null;
    }
    if (!keepActive) {
      setActiveBot(null);
      clearEphemeral();
      if (state) renderFeed(state.events);
    } else if (state) {
      // Freeze feed cursor text while paused
      renderFeed(state.events);
    }
  }

  function startBotStream(botId) {
    if (deskPaused) {
      savedActiveBotId = botId;
      setActiveBot(botId);
      return;
    }
    if (reduceMotion) {
      setActiveBot(botId);
      return;
    }
    stopBotStream();
    setActiveBot(botId);
    const lines = WORK_LINES[botId] || [
      { title: "tick", message: "working…" },
    ];
    let i = 0;
    const push = () => {
      if (deskPaused) return;
      const line = lines[i % lines.length];
      i += 1;
      prependStreamLine(botId, line.title, line.message);
    };
    push();
    streamTimer = setInterval(push, 2200);
  }

  function scheduleBotRotation(opts) {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
    if (reduceMotion || deskPaused) return;

    const skipImmediate = !!(opts && opts.skipImmediate);
    let idx = 0;
    const cycle = () => {
      if (deskPaused) return;
      // Prefer bot that has the newest persisted event
      let pick = BOT_ORDER[idx % BOT_ORDER.length];
      if (state?.events?.length) {
        const persisted = state.events.filter((e) => !e._ephemeral);
        if (persisted[0]?.bot && BOT_META[persisted[0].bot]) {
          // Alternate: sometimes follow newest writer, sometimes round-robin
          pick = idx % 2 === 0 ? persisted[0].bot : pick;
        }
      }
      idx += 1;
      startBotStream(pick);
    };

    if (!skipImmediate) cycle();
    rotateTimer = setInterval(cycle, 9000);
  }

  function syncPauseUi() {
    syncTradingStatusLine();
    const btn = $("#btn-pause");
    const floor = $("#desk-floor");
    const consoleEl = $(".activity-console");
    if (btn) {
      btn.textContent = deskPaused ? "Resume" : "Pause";
      btn.classList.toggle("is-paused", deskPaused);
      btn.setAttribute("aria-pressed", deskPaused ? "true" : "false");
      btn.title = deskPaused
        ? "Resume bot motion and activity streaming"
        : "Pause all bot motion and activity streaming";
    }
    if (floor) floor.classList.toggle("is-desk-paused", deskPaused);
    if (consoleEl) consoleEl.classList.toggle("is-desk-paused", deskPaused);
    document.body.classList.toggle("is-desk-paused", deskPaused);
    if (deskPaused) {
      clearTradeFx();
      clearLearnFx();
      clearIdleStudy();
    }
    const live = $("#console-live");
    if (live && deskPaused) {
      live.textContent = "PAUSED";
    } else if (live && !deskPaused) {
      live.textContent = activeBotId
        ? "STREAM · " + botShort(activeBotId)
        : "IDLE";
    }
    // Force all bots into paused animation state when desk is frozen
    $$bots($("#bots") || document).forEach((el) => {
      if (deskPaused) el.classList.add("paused");
      else el.classList.toggle("paused", pausedBotId === el.dataset.bot);
    });
  }

  function setDeskPaused(next) {
    deskPaused = !!next;
    if (deskPaused) {
      savedActiveBotId = activeBotId;
      if (rotateTimer) {
        clearInterval(rotateTimer);
        rotateTimer = null;
      }
      stopBotStream({ keepActive: true });
      // Keep last active highlight but freeze motion via CSS + .paused
      if (savedActiveBotId) setActiveBot(savedActiveBotId);
      syncPauseUi();
      return;
    }
    const resumeBot = savedActiveBotId;
    savedActiveBotId = null;
    syncPauseUi();
    if (resumeBot) {
      startBotStream(resumeBot);
      scheduleBotRotation({ skipImmediate: true });
    } else {
      scheduleBotRotation();
    }
    syncPauseUi();
  }

  function toggleDeskPause() {
    setDeskPaused(!deskPaused);
  }

  function paint(data, ephemeralKeep) {
    ensureEvents(data);
    const ephemeral = Array.isArray(ephemeralKeep)
      ? ephemeralKeep
      : (state?.events || []).filter((e) => e._ephemeral);
    const fromFile = (data.events || []).filter((e) => !e._ephemeral);
    data.events = [...ephemeral, ...fromFile];
    state = data;
    renderStatusLine(data);
    renderBots(data.bots || []);
    // ALWAYS bind Wallet/PnL to AGENT trading book — never the admin Connect pubkey
    if (!data.wallet) data.wallet = {};
    data.wallet.address = AGENT_WALLET;
    data.wallet.role = "agent";
    data.wallet.isAgent = true;
    data.wallet.isAdmin = false;
    data.wallet.adminAddress = ADMIN_WALLET;
    if (!data.pnl) data.pnl = {};
    data.pnl.walletAddress = AGENT_WALLET;
    renderWallet(data.wallet);
    renderPnL(data.pnl || {});
    renderCaps(data.riskCaps);
    renderGoal(data);
    renderHoldingsTable(data.wallet);
    renderTxPanel(lastChainSigs);
    renderFeed(state.events);
    renderAgentTrack();
    updateConnectUi();
    if (data?.pnl?.equityUsd != null || data?.wallet?.totalUsd != null) {
      pushEquityMark(
        Number(data?.pnl?.equityUsd ?? data.wallet.totalUsd),
        "file mark",
        false
      );
    }
    renderEquityChart(data);
    refreshAgentBalance();
    const upd = $("#data-updated");
    if (upd) {
      upd.textContent = data.meta?.updatedAt
        ? `Updated ${fmtTime(data.meta.updatedAt)}`
        : data._seeded
          ? "Sample activity seeded (file empty)"
          : "";
    }
  }


  function holdingsSnapshot(holdings) {
    return (holdings || [])
      .map((h) => `${h.symbol || "?"}:${Number(h.qty || 0).toFixed(6)}`)
      .sort()
      .join("|");
  }

  function estimateEquityFromHoldings(holdings, solBal) {
    let sum = 0;
    let used = false;
    for (const h of holdings || []) {
      if (h.valueUsd != null && !Number.isNaN(Number(h.valueUsd))) {
        sum += Number(h.valueUsd);
        used = true;
      } else if (h.priceUsd != null && h.qty != null) {
        sum += Number(h.qty) * Number(h.priceUsd);
        used = true;
      }
    }
    if (!used && solBal != null) {
      sum = Number(solBal) * (solPriceUsd || state?.wallet?.solPriceUsd || 140);
      used = true;
    }
    return used ? sum : null;
  }

  function pushEquityMark(equityUsd, label, force) {
    if (equityUsd == null || Number.isNaN(Number(equityUsd))) return;
    const pts = readStoredEquity();
    const now = Date.now();
    const last = pts[pts.length - 1];
    if (
      !force &&
      last &&
      Math.abs(Number(last.equityUsd) - Number(equityUsd)) < 0.0005 &&
      now - new Date(last.ts).getTime() < 4000
    ) {
      return;
    }
    pts.push({
      ts: new Date(now).toISOString(),
      equityUsd: Number(equityUsd),
      label: label || "mark",
    });
    writeStoredEquity(pts);
  }

  function injectChainEvents(events) {
    if (!state || !events?.length) return;
    const persisted = (state.events || []).filter((e) => !e._ephemeral);
    const ephemeral = (state.events || []).filter((e) => e._ephemeral);
    state.events = [...events, ...ephemeral, ...persisted];
    renderFeed(state.events);
  }

  async function fetchParsedTokenAccounts(programId) {
    const result = await rpcCall("getTokenAccountsByOwner", [
      AGENT_WALLET,
      { programId },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ]);
    return result?.value || [];
  }

  function mergeLiveTokenRows(accounts, kind) {
    const priceByMint = {};
    const prev = state?.wallet?.holdings || [];
    for (const h of prev) {
      if (h.mint && h.priceUsd != null) priceByMint[h.mint] = Number(h.priceUsd);
    }
    const rows = [];
    for (const acc of accounts || []) {
      const info = acc?.account?.data?.parsed?.info;
      const tok = info?.tokenAmount;
      if (!info?.mint || !tok) continue;
      const qty = Number(tok.uiAmount);
      if (!qty || qty <= 0) continue;
      const mint = info.mint;
      const symbol = mintSymbol(mint);
      const priceUsd = priceByMint[mint];
      const valueUsd =
        priceUsd != null && !Number.isNaN(priceUsd) ? qty * priceUsd : null;
      rows.push({
        symbol,
        mint,
        kind,
        qty,
        decimals: tok.decimals,
        priceUsd: priceUsd ?? null,
        valueUsd,
        displayQty: qty >= 1 ? qty.toFixed(2) : qty.toFixed(6),
        displayLabel: `${symbol} held`,
        label: `${symbol} · live`,
      });
    }
    return rows;
  }

  async function refreshLiveHoldings(opts) {
    const forceMark = !!(opts && opts.forceMark);
    const fillLabel = opts?.fillLabel || "live mark";
    try {
      const [solLive, classic, t22] = await Promise.all([
        fetchAgentSolBalance(),
        fetchParsedTokenAccounts(TOKEN_PROGRAM).catch(() => []),
        fetchParsedTokenAccounts(TOKEN_2022_PROGRAM).catch(() => []),
      ]);
      if (solLive) agentLive = solLive;
      if (!state) return null;

      const tokenRows = [
        ...mergeLiveTokenRows(classic, "spl"),
        ...mergeLiveTokenRows(t22, "token2022"),
      ];
      const prevHoldings = getHoldings(state.wallet);
      const priceBySym = {};
      for (const h of prevHoldings) {
        if (h.symbol && h.priceUsd != null) priceBySym[h.symbol] = h.priceUsd;
        if (h.mint && h.priceUsd != null) priceBySym[h.mint] = h.priceUsd;
      }
      for (const row of tokenRows) {
        if (row.priceUsd == null) {
          const p = priceBySym[row.symbol] ?? priceBySym[row.mint];
          if (p != null) {
            row.priceUsd = p;
            row.valueUsd = row.qty * p;
          }
        }
      }

      const solBal = solLive?.solBalance ?? state.wallet?.solBalance;
      const solPrice = state.wallet?.solPriceUsd ?? solPriceUsd ?? 140;
      const solRow = {
        symbol: "SOL",
        mint: "So11111111111111111111111111111111111111112",
        kind: "native",
        qty: Number(solBal || 0),
        decimals: 9,
        priceUsd: solPrice,
        valueUsd: Number(solBal || 0) * solPrice,
        displayQty: Number(solBal || 0).toFixed(6),
        displayLabel: "Free SOL",
        label: "Free SOL cash",
      };

      // Prefer live token rows; keep prior rows for mints not yet visible if qty was >0 and RPC lag
      const byMint = new Map();
      byMint.set(solRow.mint, solRow);
      for (const r of tokenRows) byMint.set(r.mint, r);

      const holdings = [...byMint.values()];
      const snap = holdingsSnapshot(holdings);
      const changed = snap !== lastHoldingsSnap && lastHoldingsSnap !== "";
      lastHoldingsSnap = snap || lastHoldingsSnap;

      state.wallet.holdings = holdings;
      state.wallet.solBalance = solRow.qty;
      state.wallet.solUsd = solRow.valueUsd;
      const equity = estimateEquityFromHoldings(holdings, solRow.qty);
      if (equity != null) {
        state.wallet.totalUsd = equity;
        if (!state.pnl) state.pnl = {};
        state.pnl.equityUsd = equity;
        pushEquityMark(equity, changed || forceMark ? fillLabel : "mark", changed || forceMark);
      }

      // Sync known symbol balances for cards
      for (const h of holdings) {
        if (h.symbol === "SI") {
          state.wallet.siBalance = h.qty;
          state.wallet.siMarkUsd = h.valueUsd;
        }
        if (h.symbol === "NTDA") {
          state.wallet.ntdaBalance = h.qty;
          state.wallet.ntdaMarkUsd = h.valueUsd;
        }
        if (h.symbol === "baton") {
          state.wallet.batonBalance = h.qty;
          state.wallet.batonMarkUsd = h.valueUsd;
        }
      }

      renderWallet(state.wallet);
      renderHoldingsTable(state.wallet);
      renderPnL(state.pnl || {});
      renderAgentTrack();
      renderEquityChart(state);
      renderGoal(state);
      return { holdings, equity, changed };
    } catch (err) {
      console.warn("live holdings refresh failed", err);
      return null;
    }
  }

  async function pollAgentChain() {
    if (chainPollBusy) return;
    chainPollBusy = true;
    try {
      const sigs = await rpcCall("getSignaturesForAddress", [
        AGENT_WALLET,
        { limit: 25 },
      ]);
      const list = Array.isArray(sigs) ? sigs : [];
      lastChainSigs = list;
      renderTxPanel(lastChainSigs);
      if (!knownTxSigs) {
        knownTxSigs = loadKnownTxSigs();
        // Seed without notifying so we don't chime historical txs on first load
        if (knownTxSigs.size === 0) {
          for (const s of list) if (s?.signature) knownTxSigs.add(s.signature);
          saveKnownTxSigs(knownTxSigs);
          await refreshLiveHoldings({ forceMark: true, fillLabel: "boot mark" });
          return;
        }
      }

      const fresh = [];
      for (const s of list) {
        const sig = s?.signature;
        if (!sig || knownTxSigs.has(sig)) continue;
        knownTxSigs.add(sig);
        fresh.push(s);
      }
      if (fresh.length) saveKnownTxSigs(knownTxSigs);

      const newEvents = [];
      // Oldest first so feed + chimes follow fill order
      fresh
        .slice()
        .reverse()
        .forEach((s) => {
          const sig = s.signature;
          const err = s.err;
          const ts = s.blockTime
            ? new Date(s.blockTime * 1000).toISOString()
            : new Date().toISOString();
          newEvents.push({
            id: `tx-${sig}`,
            ts,
            bot: "solana-trader",
            level: err ? "warn" : "signal",
            title: err ? "On-chain tx failed" : "On-chain fill",
            message: err
              ? `Tx ${shortSig(sig)} errored on AGENT book · open Solscan`
              : `Live tx ${shortSig(sig)} on 99hEn… · refreshing holdings/PnL`,
            tags: ["fill", "tx", "chain"],
            source: "chain",
            signature: sig,
            _ephemeral: true,
          });
        });

      if (newEvents.length) {
        injectChainEvents(newEvents);
        // Chime already fired via renderFeed → reactToEvents per trade
      }

      await refreshLiveHoldings({
        forceMark: newEvents.length > 0,
        fillLabel: newEvents.length ? "fill mark" : "mark",
      });
    } catch (err) {
      console.warn("chain poll failed", err);
      // Still try a holdings mark so chart keeps ticking
      try {
        await refreshLiveHoldings({ fillLabel: "mark" });
      } catch (_) { /* ignore */ }
    } finally {
      chainPollBusy = false;
    }
  }

  async function refreshAgentBalance() {
    const live = await fetchAgentSolBalance();
    if (!live) {
      renderAgentTrack();
      return;
    }
    agentLive = live;
    if (state?.wallet) {
      state.wallet.solBalance = live.solBalance;
      // Keep equity/SI from activity.json; only refresh residual SOL from chain
    }
    renderWallet(state?.wallet);
    renderAgentTrack();
  }

  async function refresh() {
    try {
      const ephemeral = state?.events?.filter((e) => e._ephemeral) || [];
      const data = await loadData();
      paint(data, ephemeral);
    } catch (err) {
      console.error(err);
      const el = $("#activity-feed");
      if (el) {
        el.innerHTML =
          `<li class="muted-line">Could not load data/activity.json — serve over HTTP (npm start).</li>`;
      }
      const countEl = $("#console-count");
      if (countEl) countEl.textContent = "0 events";
      updateConnectUi();
    }
  }

  function applyConnected(pubkey) {
    connectedPubkey = pubkey || null;
    isAdminConnected = !!(pubkey && pubkey === ADMIN_WALLET);
    updateConnectUi();
    if (state) renderWallet(state.wallet);
  }

  async function connectWallet() {
    const provider = getProvider();
    if (!provider) {
      setBanner(
        "warn",
        `Phantom not found. Install <a href="https://phantom.app/" target="_blank" rel="noopener">Phantom</a>, then refresh.`
      );
      window.open("https://phantom.app/", "_blank", "noopener");
      return;
    }
    try {
      const resp = await provider.connect();
      const key =
        resp?.publicKey?.toString?.() ||
        provider.publicKey?.toString?.() ||
        null;
      applyConnected(key);
    } catch (err) {
      console.error(err);
      setBanner("warn", `Connect cancelled or failed: ${escapeHtml(err?.message || String(err))}`);
    }
  }

  async function disconnectWallet() {
    const provider = getProvider();
    try {
      if (provider?.disconnect) await provider.disconnect();
    } catch (_) { /* ignore */ }
    applyConnected(null);
  }

  function setDepositStatus(msg, kind) {
    const el = $("#deposit-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "deposit-status" + (kind ? " " + kind : "");
  }

  async function depositFiveDollars() {
    if (!isAdminConnected) {
      setDepositStatus("Connect the admin wallet first.", "err");
      return;
    }
    const provider = getProvider();
    if (!provider) {
      setDepositStatus("Phantom not available.", "err");
      return;
    }
    if (!window.solanaWeb3) {
      setDepositStatus("Solana web3 library failed to load. Use Open Jupiter as fallback.", "err");
      return;
    }

    const btn = $("#btn-deposit");
    if (btn) btn.disabled = true;
    setDepositStatus("Fetching SOL price…");

    try {
      solPriceUsd = await fetchSolPrice();
      updateDepositHint();
      const solAmount = solForDeposit();
      const lamports = Math.round(solAmount * 1e9);
      if (lamports < 1000) throw new Error("Computed lamports too small");

      setDepositStatus(`Preparing transfer of ~${solAmount.toFixed(4)} SOL (≈ $${DEPOSIT_USD})…`);

      const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } =
        window.solanaWeb3;
      const connection = new Connection(RPC_URL, "confirmed");
      const from = new PublicKey(connectedPubkey);
      const to = new PublicKey(AGENT_WALLET);

      if (from.equals(to)) {
        const amt = solAmount.toFixed(4);
        try {
          await navigator.clipboard.writeText(AGENT_WALLET);
        } catch (_) { /* ignore */ }
        setDepositStatus(
          `Guided fund · ~${amt} SOL (≈ $${DEPOSIT_USD}) into bot AGENT ${shortAddr(AGENT_WALLET)} (address copied). Opening Jupiter — swap/buy SOL into this wallet. No keys leave Phantom.`,
          "ok"
        );
        const link = $("#link-jupiter");
        if (link?.href) window.open(link.href, "_blank", "noopener");
        return;
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: from,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: to,
          lamports,
        })
      );

      setDepositStatus("Approve the transfer in Phantom…");
      const signed = await provider.signAndSendTransaction(tx);
      const sig = signed?.signature || signed;
      setDepositStatus(
        `Submitted ${typeof sig === "string" ? sig.slice(0, 12) + "…" : "tx"} · ~${solAmount.toFixed(4)} SOL ($${DEPOSIT_USD})`,
        "ok"
      );
      if (typeof sig === "string") {
        console.info("Deposit signature", sig, "until", lastValidBlockHeight);
      }
      void LAMPORTS_PER_SOL;
    } catch (err) {
      console.error(err);
      const msg = err?.message || String(err);
      setDepositStatus(`Deposit failed: ${msg}. Try Open Jupiter for a guided ~$${DEPOSIT_USD} flow.`, "err");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bindWalletUi() {
    $("#btn-pause")?.addEventListener("click", toggleDeskPause);
    $("#btn-mute")?.addEventListener("click", () => {
      toggleMute();
      unlockAudio();
      if (!soundMuted) ensureAudio()?.resume?.();
    });
    $("#btn-connect")?.addEventListener("click", connectWallet);
    $("#btn-disconnect")?.addEventListener("click", disconnectWallet);
    $("#btn-deposit")?.addEventListener("click", depositFiveDollars);
    $("#btn-copy-agent")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(agentAddress());
        const b = $("#btn-copy-agent");
        if (b) {
          const prev = b.textContent;
          b.textContent = "Copied";
          setTimeout(() => { b.textContent = prev || "Copy"; }, 1200);
        }
      } catch (_) { /* ignore */ }
    });

    const provider = getProvider();
    if (provider) {
      provider.on?.("accountChanged", (pk) => {
        applyConnected(pk ? pk.toString() : null);
      });
      provider.on?.("disconnect", () => applyConnected(null));
      if (provider.isConnected && provider.publicKey) {
        applyConnected(provider.publicKey.toString());
      } else if (provider.publicKey) {
        applyConnected(provider.publicKey.toString());
      }
    }
  }


  function deskPoint(el, floor) {
    if (!el || !floor) return null;
    const a = el.getBoundingClientRect();
    const b = floor.getBoundingClientRect();
    return {
      x: a.left - b.left + a.width / 2,
      y: a.top - b.top + a.height * 0.35,
    };
  }

  function ensureFxSvg() {
    const svg = $("#desk-fx");
    if (!svg) return null;
    if (!svg.querySelector("#beamGrad")) {
      svg.innerHTML = `
        <defs>
          <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="100%" stop-color="#6ee7b7"/>
          </linearGradient>
        </defs>`;
    }
    return svg;
  }

  function clearTradeFx() {
    const floor = $("#desk-floor");
    const cons = $(".activity-console");
    const ripple = $("#desk-ripple");
    const svg = $("#desk-fx");
    floor?.classList.remove("is-trade-flash");
    cons?.classList.remove("is-trade-flash");
    ripple?.classList.remove("is-on");
    if (ripple) ripple.hidden = true;
    $$bots($("#bots") || document).forEach((b) => b.classList.remove("is-firing"));
    svg?.querySelectorAll(".fx-beam").forEach((n) => n.remove());
    $("#card-pnl")?.classList.remove("is-pnl-pulse");
    $("#card-wallet")?.classList.remove("is-pnl-pulse");
  }

  function clearLearnFx() {
    if (learnFxTimer) {
      clearTimeout(learnFxTimer);
      learnFxTimer = null;
    }
    const cons = $(".activity-console");
    cons?.classList.remove("is-learn-flash");
    $$bots($("#bots") || document).forEach((b) => b.classList.remove("coach-glow"));
    const svg = $("#desk-fx");
    svg?.querySelectorAll(".fx-link,.fx-node").forEach((n) => n.remove());
  }

  function playTradeFx(soft) {
    if (reduceMotion || deskPaused) return;
    const floor = $("#desk-floor");
    const trader = document.querySelector('.bot[data-bot="solana-trader"]');
    const monitor = floor?.querySelector(".desk-monitor") || floor?.querySelector(".monitor-screen");
    const svg = ensureFxSvg();
    if (!floor || !trader || !monitor || !svg) return;

    clearTradeFx();
    const from = deskPoint(trader, floor);
    const to = deskPoint(monitor, floor);
    if (!from || !to) return;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const mx = (from.x + to.x) / 2;
    const my = Math.min(from.y, to.y) - 28;
    line.setAttribute(
      "d",
      `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
    );
    line.setAttribute("class", "fx-beam is-on");
    svg.appendChild(line);

    trader.classList.add("is-firing");
    floor.classList.add("is-trade-flash");
    $(".activity-console")?.classList.add("is-trade-flash");
    const ripple = $("#desk-ripple");
    if (ripple) {
      ripple.hidden = false;
      ripple.classList.remove("is-on");
      void ripple.offsetWidth;
      ripple.classList.add("is-on");
    }
    if (!soft) {
      $("#card-pnl")?.classList.add("is-pnl-pulse");
      $("#card-wallet")?.classList.add("is-pnl-pulse");
    }
    setTimeout(clearTradeFx, soft ? 700 : 1000);
  }

  function playLearnFx(soft) {
    if (reduceMotion || deskPaused) return;
    const floor = $("#desk-floor");
    const svg = ensureFxSvg();
    const coach = document.querySelector('.bot[data-bot="coach-bot"]');
    if (!floor || !svg || !coach) return;

    clearLearnFx();
    const peers = ["solana-scout", "solana-trader", "portfolio-guard"]
      .map((id) => document.querySelector(`.bot[data-bot="${id}"]`))
      .filter(Boolean);
    const c = deskPoint(coach, floor);
    if (!c) return;

    coach.classList.add("coach-glow");
    $(".activity-console")?.classList.add("is-learn-flash");

    for (const peer of peers) {
      const p = deskPoint(peer, floor);
      if (!p) continue;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const mx = (c.x + p.x) / 2;
      const my = (c.y + p.y) / 2 - 16;
      path.setAttribute(
        "d",
        `M ${c.x.toFixed(1)} ${c.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      );
      path.setAttribute("class", "fx-link is-on");
      svg.appendChild(path);
      const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      node.setAttribute("cx", p.x.toFixed(1));
      node.setAttribute("cy", p.y.toFixed(1));
      node.setAttribute("r", "3");
      node.setAttribute("class", "fx-node is-on");
      svg.appendChild(node);
    }
    const hub = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hub.setAttribute("cx", c.x.toFixed(1));
    hub.setAttribute("cy", c.y.toFixed(1));
    hub.setAttribute("r", "4");
    hub.setAttribute("class", "fx-node is-on");
    svg.appendChild(hub);

    learnFxTimer = setTimeout(clearLearnFx, soft ? 1600 : 2800);
  }



  const THEME_KEY = "solana-desk-theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (_) { /* ignore */ }
    syncThemeUi();
    // Re-paint chart so SVG stop-colors match theme
    if (state) renderEquityChart(state);
  }

  function syncThemeUi() {
    const btn = $("#btn-theme");
    if (!btn) return;
    const dark = currentTheme() === "dark";
    btn.textContent = dark ? "Neon" : "Light";
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    btn.title = dark
      ? "Switch to light theme"
      : "Switch to dark neon theme";
  }

  function toggleTheme() {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  }

  function loadSoundPref() {
    try {
      soundMuted = localStorage.getItem(SOUND_KEY) === "1";
    } catch (_) {
      soundMuted = false;
    }
  }

  function syncMuteUi() {
    const btn = $("#btn-mute");
    if (!btn) return;
    btn.textContent = soundMuted ? "Muted" : "Sound";
    btn.classList.toggle("is-muted", soundMuted);
    btn.setAttribute("aria-pressed", soundMuted ? "true" : "false");
    btn.title = soundMuted
      ? "Unmute trade chimes"
      : "Mute trade chimes";
  }

  function toggleMute() {
    soundMuted = !soundMuted;
    try {
      localStorage.setItem(SOUND_KEY, soundMuted ? "1" : "0");
    } catch (_) { /* ignore */ }
    syncMuteUi();
  }

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  /** Clear ping for each trade fill — no external assets; safe to stack */
  function playTradeChime() {
    if (soundMuted || deskPaused) return;
    try {
      const ctx = ensureAudio();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.2, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      master.connect(ctx.destination);

      // Bright two-tone ping + soft click overtone
      const tones = [
        { f: 988, type: "sine", peak: 0.55, start: 0, dur: 0.28 },
        { f: 1480, type: "triangle", peak: 0.28, start: 0.04, dur: 0.22 },
        { f: 2200, type: "sine", peak: 0.12, start: 0.0, dur: 0.08 },
      ];
      tones.forEach((t) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = t.type;
        osc.frequency.setValueAtTime(t.f, now + t.start);
        g.gain.setValueAtTime(0.0001, now + t.start);
        g.gain.exponentialRampToValueAtTime(t.peak, now + t.start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
        osc.connect(g);
        g.connect(master);
        osc.start(now + t.start);
        osc.stop(now + t.start + t.dur + 0.02);
      });
    } catch (err) {
      console.warn("chime failed", err);
    }
  }

  function playTradeChimes(count) {
    const n = Math.max(0, Math.min(8, Number(count) || 0));
    for (let i = 0; i < n; i++) {
      setTimeout(() => playTradeChime(), i * 150);
    }
  }

  function readStoredEquity() {
    try {
      const raw = localStorage.getItem(EQUITY_STORE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writeStoredEquity(points) {
    try {
      localStorage.setItem(
        EQUITY_STORE_KEY,
        JSON.stringify((points || []).slice(-720))
      );
    } catch (_) { /* ignore */ }
  }

  function mergeEquitySeries(data) {
    const fromFile = Array.isArray(data?.equitySeries)
      ? data.equitySeries.map((p) => ({
          ts: p.ts,
          equityUsd: Number(p.equityUsd),
          label: p.label || "",
        }))
      : [];
    const stored = readStoredEquity();
    const liveEq =
      data?.pnl?.equityUsd ?? data?.wallet?.totalUsd ?? null;
    const live =
      liveEq != null
        ? [
            {
              ts: new Date().toISOString(),
              equityUsd: Number(liveEq),
              label: "live",
            },
          ]
        : [];
    const map = new Map();
    for (const p of [...fromFile, ...stored, ...live]) {
      if (p?.ts == null || Number.isNaN(p.equityUsd)) continue;
      // Bucket identical second timestamps lightly by label preference
      const key = `${p.ts}|${Number(p.equityUsd).toFixed(4)}`;
      map.set(key, p);
    }
    const merged = [...map.values()].sort(
      (a, b) => new Date(a.ts) - new Date(b.ts)
    );
    writeStoredEquity(merged);
    // Keep chart moving with latest mark
    if (liveEq != null) pushEquityMark(Number(liveEq), "live", false);
    return merged;
  }

  function loadChartTf() {
    try {
      const t = localStorage.getItem(CHART_TF_KEY);
      if (t && TF_MS[t]) chartTf = t;
    } catch (_) { /* ignore */ }
  }

  function syncChartTfUi() {
    const root = $("#pnl-tf");
    if (!root) return;
    root.querySelectorAll("[data-tf]").forEach((btn) => {
      const on = btn.getAttribute("data-tf") === chartTf;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setChartTf(tf) {
    if (!TF_MS[tf]) return;
    chartTf = tf;
    try {
      localStorage.setItem(CHART_TF_KEY, tf);
    } catch (_) { /* ignore */ }
    syncChartTfUi();
    if (state) renderEquityChart(state);
  }

  function pointsForTimeframe(allPoints) {
    const windowMs = TF_MS[chartTf] || TF_MS["5m"];
    const now = Date.now();
    const cut = now - windowMs;
    let pts = (allPoints || []).filter((p) => {
      const t = new Date(p.ts).getTime();
      return !Number.isNaN(t) && t >= cut && t <= now + 1000;
    });
    // If window is empty, show last point extended so chart isn't blank
    if (!pts.length && allPoints?.length) {
      const last = allPoints[allPoints.length - 1];
      pts = [
        { ts: new Date(cut).toISOString(), equityUsd: last.equityUsd, label: "carry" },
        { ...last, ts: new Date(now).toISOString(), label: last.label || "live" },
      ];
    }
    return { pts, windowMs, now, cut };
  }

  function renderEquityChart(data) {
    const svg = $("#pnl-chart");
    const deltaEl = $("#pnl-chart-delta");
    const lastEl = $("#pnl-chart-last");
    if (!svg) return;
    const all = mergeEquitySeries(data);
    const { pts: points, windowMs, now, cut } = pointsForTimeframe(all);
    if (points.length < 2) {
      svg.innerHTML =
        '<text x="24" y="96" class="axis-label">Waiting for live equity marks…</text>';
      if (deltaEl) deltaEl.textContent = "—";
      if (lastEl) lastEl.textContent = "—";
      return;
    }

    const W = 640;
    const H = 180;
    const pad = { l: 44, r: 16, t: 16, b: 28 };
    const vals = points.map((p) => p.equityUsd);
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    if (minV === maxV) {
      minV -= Math.max(0.05, Math.abs(minV) * 0.002);
      maxV += Math.max(0.05, Math.abs(maxV) * 0.002);
    }
    const span = maxV - minV || 1;
    const tSpan = Math.max(1, now - cut);
    const xs = points.map((p) => {
      const t = new Date(p.ts).getTime();
      return pad.l + ((t - cut) / tSpan) * (W - pad.l - pad.r);
    });
    const ys = vals.map(
      (v) => pad.t + (1 - (v - minV) / span) * (H - pad.t - pad.b)
    );
    const line = points
      .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`)
      .join(" ");
    const area =
      line +
      ` L ${xs[xs.length - 1].toFixed(1)} ${(H - pad.b).toFixed(1)} L ${xs[0].toFixed(1)} ${(H - pad.b).toFixed(1)} Z`;
    const first = vals[0];
    const last = vals[vals.length - 1];
    const dlt = last - first;
    const neg = dlt < 0;
    const gridYs = [0, 0.5, 1].map(
      (t) => pad.t + t * (H - pad.t - pad.b)
    );
    const gridVals = [maxV, (maxV + minV) / 2, minV];
    const fillMarks = points
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => /fill|tx|swap|buy|sell/i.test(p.label || ""));

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const dark = currentTheme() === "dark";
    const strokePos = dark ? "#22d3ee" : "#10b981";
    const strokeNeg = dark ? "#f472b6" : "#f59e0b";
    const fill = neg ? strokeNeg : strokePos;
    const tfLabel = chartTf;
    svg.innerHTML = `
      <defs>
        <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${fill}" stop-opacity="${dark ? 0.32 : 0.28}"/>
          <stop offset="100%" stop-color="${fill}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${gridYs
        .map(
          (y, i) =>
            `<line class="grid-line" x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W - pad.r}" y2="${y.toFixed(1)}"/><text class="axis-label" x="4" y="${(y + 3).toFixed(1)}">$${gridVals[i].toFixed(2)}</text>`
        )
        .join("")}
      <path class="eq-area" d="${area}"></path>
      <path class="eq-line${neg ? " is-neg" : ""}" d="${line}"></path>
      ${points
        .map((p, i) => {
          const latest = i === points.length - 1 ? " is-latest" : "";
          return `<circle class="eq-dot${neg ? " is-neg" : ""}${latest}" cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${i === points.length - 1 ? 4 : 2.2}"><title>${escapeHtml(p.label || "")} · $${p.equityUsd.toFixed(2)} · ${escapeHtml(fmtTimeCompact(p.ts))}</title></circle>`;
        })
        .join("")}
      ${fillMarks
        .map(({ i }) => `<circle class="fill-mark" cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3.2"></circle>`)
        .join("")}
      <text class="axis-label" x="${pad.l}" y="${H - 8}">${escapeHtml(fmtTimeCompact(new Date(cut).toISOString()))}</text>
      <text class="axis-label" x="${W - pad.r}" y="${H - 8}" text-anchor="end">${escapeHtml(fmtTimeCompact(new Date(now).toISOString()))} · ${tfLabel}</text>
    `;

    if (deltaEl) {
      const sign = dlt > 0 ? "+" : "";
      deltaEl.textContent = `${sign}${fmtUsd(dlt)} ${tfLabel}`;
      deltaEl.className = "pnl-chart-delta " + (dlt < 0 ? "neg" : dlt > 0 ? "pos" : "");
    }
    if (lastEl) {
      lastEl.textContent = `equity ${fmtUsd(last)} · ${points.length} pts · ${tfLabel}`;
    }
  }

  function reactToEvents(events, opts) {
    if (!events?.length || deskPaused) return;
    const soft = !!(opts && opts.soft);
    let tradeCount = 0;
    let learn = false;
    for (const e of events) {
      const k = classifyEvent(e);
      if (k.isTrade) tradeCount += 1;
      if (k.isLearn) learn = true;
    }
    if (tradeCount) {
      if (!reduceMotion) playTradeFx(soft);
      // One ping per fill/tx — not a single shared beep for the whole batch
      if (!soft) playTradeChimes(tradeCount);
    }
    if (learn && !reduceMotion) playLearnFx(soft);
  }

  function syncVitalCards(pnl) {
    const day = pnl?.dayPnlUsd;
    const wallet = $("#card-wallet");
    const card = $("#card-pnl");
    for (const el of [wallet, card]) {
      if (!el) continue;
      el.classList.remove("is-healthy", "is-warn");
      if (day == null || Number.isNaN(Number(day))) continue;
      if (Number(day) < 0) el.classList.add("is-warn");
      else el.classList.add("is-healthy");
    }
  }

  function clearIdleStudy() {
    $$bots($("#bots") || document).forEach((b) => {
      b.classList.remove("is-study-monitor", "is-study-peer");
    });
  }

  function runIdleStudyTick() {
    if (deskPaused || reduceMotion) return;
    clearIdleStudy();
    const bots = $$bots($("#bots") || document);
    if (!bots.length) return;
    // Guard always alert
    const guard = document.querySelector('.bot[data-bot="portfolio-guard"]');
    guard?.classList.add("guard-alert");

    const scanners = bots.filter((b) => b.dataset.bot !== "portfolio-guard");
    if (!scanners.length) return;
    const pick = scanners[Math.floor(Math.random() * scanners.length)];
    const mode = Math.random() > 0.45 ? "monitor" : "peer";
    if (mode === "monitor") {
      pick.classList.add("is-study-monitor");
    } else {
      pick.classList.add("is-study-peer");
      const others = scanners.filter((b) => b !== pick);
      if (others.length) {
        others[Math.floor(Math.random() * others.length)].classList.add("is-study-peer");
      }
    }
    setTimeout(() => {
      if (!deskPaused) clearIdleStudy();
    }, 3200);
  }

  function scheduleIdleStudy() {
    if (idleStudyTimer) clearInterval(idleStudyTimer);
    if (reduceMotion) return;
    document.querySelector('.bot[data-bot="portfolio-guard"]')?.classList.add("guard-alert");
    idleStudyTimer = setInterval(runIdleStudyTick, 7000);
    setTimeout(runIdleStudyTick, 1800);
  }


  function bindParallax() {
    const floor = $("#desk-floor");
    if (!floor || reduceMotion) return;
    floor.addEventListener("pointermove", (e) => {
      const r = floor.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 6;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 4;
      floor.style.transform = `rotateX(${2 - y}deg) rotateY(${x}deg)`;
    });
    floor.addEventListener("pointerleave", () => {
      floor.style.transform = "";
    });
  }

  async function init() {
    reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    loadSoundPref();
    // Treat reduced-motion as default-muted unless user explicitly unmuted
    if (reduceMotion && localStorage.getItem(SOUND_KEY) == null) {
      soundMuted = true;
    }
    syncThemeUi();
    $("#btn-theme")?.addEventListener("click", toggleTheme);
    bindWalletUi();
    updateConnectUi();
    syncPauseUi();
    syncMuteUi();
    bindParallax();
    fetchSolPrice().then((p) => {
      solPriceUsd = p;
      updateDepositHint();
    });
    loadChartTf();
    syncChartTfUi();
    $("#pnl-tf")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tf]");
      if (!btn) return;
      setChartTf(btn.getAttribute("data-tf"));
    });
    const unlock = () => unlockAudio();
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    await refresh();
    scheduleBotRotation();
    scheduleIdleStudy();
    setInterval(refresh, REFRESH_MS);
    // Live agent wallet txs + holdings → chart marks + fill sounds
    pollAgentChain();
    setInterval(pollAgentChain, CHAIN_POLL_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refresh();
        pollAgentChain();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
