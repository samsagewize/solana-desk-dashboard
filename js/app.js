/**
 * Solana Desk — CSS 3D bots + full activity console + Phantom connect
 * Connect Wallet (window.solana). Admin address → Trading ON + LIVE.
 * Deposit $5 ≈ SOL transfer to AGENT bot wallet via Phantom (admin signs). No private keys stored.
 * Bot book / Wallet / PnL track AGENT_WALLET. Admin Connect gate remains ADMIN_WALLET.
 * Activity: every event from data/activity.json rendered; live stream when bots work.
 */
(function () {
  "use strict";

  const DATA_URL = "data/activity.json";
  const REFRESH_MS = 15000;
  const ADMIN_WALLET = "3GfDwiEtei62mumu1J8XnaqkUFtbkVLQE2Btpr5yAeek";
  /** Bot trading book — Wallet/PnL cards + RPC track this address */
  const AGENT_WALLET = "99hEnCqL2Tp59pkymd3zfpenKQVWZXCKpCViGXaHw92j";
  const DEPOSIT_USD = 5;
  const RPC_URL = "https://api.mainnet-beta.solana.com";
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
      { title: "SI book", message: "243.68 SI open · cost ~$6.66 · adds HALTED" },
      { title: "Size check", message: "No new SI adds · Coach/Guard review · soft sizing" },
      { title: "Exec halted", message: "IDEA-001 fills done · waiting Guard clear" },
    ],
    "portfolio-guard": [
      { title: "PnL mark", message: "Day PnL ≈ −$0.28 · equity ~$8.02 · soft −20% stop" },
      { title: "Exposure sweep", message: "Open ~$6.66 · no hard $ cap · SI held" },
      { title: "Cash check", message: "Residual SOL ~0.012 · cash thin · Coach aware" },
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
      const r = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [AGENT_WALLET],
        }),
      });
      if (!r.ok) throw new Error("RPC " + r.status);
      const j = await r.json();
      const lamports = j?.result?.value;
      if (lamports == null) throw new Error("no balance");
      const solBalance = lamports / 1e9;
      const price = solPriceUsd || 140;
      return {
        lamports,
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
    const mainBtn = $("#btn-connect-main");
    for (const btn of [headerBtn, mainBtn]) {
      if (!btn) continue;
      btn.textContent = label;
      btn.disabled = !!disabled;
      if (btn === mainBtn) {
        btn.classList.toggle("wrong", !!wrong);
      }
    }
  }

  function updateConnectUi() {
    const disc = $("#btn-disconnect");
    const modeEl = $("#status-mode");
    const tradingEl = $("#status-trading");
    const walletEl = $("#status-wallet");
    const deposit = $("#deposit-panel");
    const cta = $("#connect-cta");
    const ctaCopy = cta?.querySelector(".connect-cta-copy");

    if (connectedPubkey) {
      if (disc) disc.hidden = false;

      if (isAdminConnected) {
        syncConnectButtons("Admin connected", true, false);
        if (cta) cta.hidden = true;
        if (modeEl) {
          modeEl.textContent = "LIVE";
          modeEl.className = "status-mode live";
        }
        if (tradingEl) tradingEl.textContent = "Trading ON";
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
        syncConnectButtons("Wrong wallet", true, true);
        if (cta) cta.hidden = false;
        if (ctaCopy) {
          ctaCopy.textContent = "Connect Phantom (admin) to start trading";
        }
        if (modeEl) {
          modeEl.textContent = "OFF";
          modeEl.className = "status-mode off";
        }
        if (tradingEl) tradingEl.textContent = "Trading off";
        if (walletEl) {
          walletEl.innerHTML = `<span class="status-wallet-short" title="${escapeHtml(connectedPubkey)}">${escapeHtml(shortAddr(connectedPubkey))}</span>`;
        }
        setBanner(
          "warn",
          `<strong>Wrong wallet</strong> — connect the admin wallet <code>${escapeHtml(shortAddr(ADMIN_WALLET))}</code> to enable Trading ON. Connected: <code>${escapeHtml(shortAddr(connectedPubkey))}</code>`
        );
        if (deposit) deposit.hidden = true;
      }
    } else {
      syncConnectButtons("Connect Wallet", false, false);
      if (cta) cta.hidden = false;
      if (ctaCopy) {
        ctaCopy.textContent = "Connect Phantom (admin) to start trading";
      }
      if (disc) disc.hidden = true;
      if (modeEl) {
        modeEl.textContent = "OFF";
        modeEl.className = "status-mode off";
      }
      if (tradingEl) tradingEl.textContent = "Trading off";
      if (walletEl) walletEl.textContent = "not connected";
      setBanner(
        "info",
        `Connect Phantom admin <code>${escapeHtml(shortAddr(ADMIN_WALLET))}</code> for LIVE gate. Desk tracks bot book <code>${escapeHtml(shortAddr(AGENT_WALLET))}</code> for Wallet/PnL.`
      );
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
      <span class="bot-figure" aria-hidden="true">
        <span class="bot-glow"></span>
        <span class="bot-shadow"></span>
        <span class="bot-body-3d">
          <span class="bot-antenna"><span class="bot-antenna-tip"></span></span>
          <span class="bot-ear l"></span>
          <span class="bot-ear r"></span>
          <span class="bot-head">
            <span class="bot-visor"></span>
            <span class="bot-cheek l"></span>
            <span class="bot-cheek r"></span>
          </span>
          <span class="bot-arm l"></span>
          <span class="bot-arm r"></span>
          <span class="bot-torso"><span class="bot-badge">${letter}</span></span>
          <span class="bot-leg l"></span>
          <span class="bot-leg r"></span>
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

    const FIGURE_VER = "art2";
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

  function renderWallet(wallet) {
    const el = $("#wallet-body");
    if (!el) return;
    const addr = wallet?.address || AGENT_WALLET;
    const liveSol = agentLive?.solBalance;
    const solBal = liveSol ?? wallet?.solBalance ?? 0;
    const equity = wallet?.totalUsd ?? wallet?.equityUsd;
    const siQty = wallet?.siBalance ?? state?.pnl?.siQty;
    const siCost = wallet?.siCostUsd ?? state?.pnl?.costBasisUsd;
    const siMark = wallet?.siMark ?? state?.pnl?.siMark;
    if (!wallet && !agentLive) {
      el.innerHTML = `<p class="muted">No wallet data</p>`;
      return;
    }
    el.innerHTML = `
      <span class="admin-tag">Trading wallet · AGENT</span>
      <div class="big">${fmtUsd(equity)}</div>
      <div class="sub">${Number(solBal).toFixed(6)} SOL${siQty != null ? ` · ${Number(siQty).toFixed(2)} SI` : ""}${siCost != null ? ` · cost ${fmtUsd(siCost)}` : ""}</div>
      ${siMark != null ? `<div class="sub">SI mark ~$${Number(siMark).toFixed(5)}</div>` : ""}
      <div class="mono" title="${escapeHtml(addr)}">${escapeHtml(shortAddr(addr))}</div>
      <div class="wallet-full">${escapeHtml(addr)}</div>
      <div class="sub" style="margin-top:0.45rem;color:var(--text-mute)">Funded ${wallet?.fundedSol ?? wallet?.baselineSol ?? 0.07} SOL baseline · admin gate ${escapeHtml(shortAddr(ADMIN_WALLET))}</div>
    `;
    renderAgentTrack();
  }

  function renderPnL(pnl) {
    const el = $("#pnl-body");
    if (!el) return;
    const day = pnl?.dayPnlUsd ?? 0;
    const sign = day > 0 ? "+" : "";
    const open = pnl?.openExposureUsd ?? 0;
    const equity = pnl?.equityUsd ?? state?.wallet?.totalUsd;
    const stop = pnl?.stopPct ?? state?.riskCaps?.stopPct;
    const halted = state?.status?.siAddsHalted || state?.riskCaps?.siAddsHalted;
    const softStop =
      stop != null ? `Soft stop ${stop}%` : "Soft risk · Coach";
    el.innerHTML = `
      <div class="big ${pnlClass(day)}">${sign}${fmtUsd(day)}</div>
      <div class="sub">Day · ${fmtPct(pnl?.dayPnlPct)} · equity ${fmtUsd(equity)}</div>
      <div class="sub" style="margin-top:0.55rem;color:var(--text-mute)">
        Open ${fmtUsd(open)} · SI ${pnl?.siQty != null ? Number(pnl.siQty).toFixed(2) : "—"} · no hard caps
      </div>
      <div class="sub" style="margin-top:0.35rem;color:var(--text-mute)">
        ${halted ? "SI held / adds reviewed · " : ""}${escapeHtml(softStop)} · bot ${escapeHtml(shortAddr(pnl?.walletAddress || AGENT_WALLET))}
      </div>
      <div class="sub" style="margin-top:0.35rem">${escapeHtml(pnl?.goalLabel || "Positive-PnL mode")}</div>
    `;
  }

  function renderCaps(caps) {
    const el = $("#caps-body");
    if (!el) return;
    const c = caps || {};
    const modeLabel = c.label || (c.hardCaps === false ? "Positive-PnL mode · no hard caps" : "Positive-PnL mode");
    const coachOn = c.coachOnline !== false && (state?.status?.coachOnline !== false);
    const learn = c.learnFromMistakes ?? state?.status?.learnFromMistakes;
    el.innerHTML = `
      <span class="admin-tag" style="color:#be185d;border-color:#fbcfe8;background:#fdf2f8">Coach ${coachOn ? "online" : "—"}</span>
      <div class="big" style="font-size:1.05rem;letter-spacing:-0.015em">${escapeHtml(modeLabel)}</div>
      <ul class="caps-list" style="margin-top:0.65rem">
        <li><span class="label">Hard caps</span><span class="val">Off</span></li>
        <li><span class="label">Priority</span><span class="val">Pos-PnL</span></li>
        <li><span class="label">Learn</span><span class="val">${learn === false ? "Off" : "ON"}</span></li>
      </ul>
      <div class="sub" style="margin-top:0.55rem;color:var(--text-mute)">${escapeHtml(c.strategy || "Coach review · no hard dollar caps")}</div>
    `;
  }

  function eventKey(e) {
    return e.id || `${e.ts}|${e.bot}|${e.title}`;
  }

  function buildFeedItem(e, opts) {
    const fresh = opts?.fresh ? " fresh" : "";
    const level = e.level ? ` level-${escapeHtml(e.level)}` : "";
    const botClass = escapeHtml(e.bot || "");
    const msg = e.message
      ? `<span class="line-msg">${escapeHtml(e.message)}</span>`
      : "";
    const levelBadge = e.level
      ? `<span class="line-level">${escapeHtml(e.level)}</span>`
      : "";
    return `<li class="${fresh}${level}" data-eid="${escapeHtml(eventKey(e))}">
      <span class="ts">${escapeHtml(fmtTimeCompact(e.ts))}</span>
      <span class="bot-tag ${botClass}">${escapeHtml(botShort(e.bot))}</span>
      <span class="line-body">
        <span class="line-title">${escapeHtml(e.title || "event")}</span>${levelBadge}
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
    renderFeed(state.events);
    renderAgentTrack();
    updateConnectUi();
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
    $("#btn-connect")?.addEventListener("click", connectWallet);
    $("#btn-connect-main")?.addEventListener("click", connectWallet);
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
    bindWalletUi();
    updateConnectUi();
    syncPauseUi();
    bindParallax();
    fetchSolPrice().then((p) => {
      solPriceUsd = p;
      updateDepositHint();
    });
    await refresh();
    scheduleBotRotation();
    setInterval(refresh, REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
