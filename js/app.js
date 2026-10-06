/**
 * Solana Desk — white sprite desk + Phantom connect
 * Connect Wallet (window.solana). Admin address → Trading ON + LIVE.
 * Deposit $5 ≈ SOL transfer to admin wallet via Phantom. No private keys stored.
 */
(function () {
  "use strict";

  const DATA_URL = "data/activity.json";
  const REFRESH_MS = 15000;
  const FEED_LIMIT = 8;
  const ADMIN_WALLET = "3GfDwiEtei62mumu1J8XnaqkUFtbkVLQE2Btpr5yAeek";
  const DEPOSIT_USD = 5;
  const RPC_URL = "https://api.mainnet-beta.solana.com";
  const SOL_PRICE_URLS = [
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    "https://price.jup.ag/v6/price?ids=SOL",
  ];

  const BOT_META = {
    "grok-bot": {
      short: "GRK",
      label: "Grok Bot",
      statusHint: "Coordinating",
      sprite: "assets/grok-bot.png",
    },
    "solana-scout": {
      short: "SCT",
      label: "Scout",
      statusHint: "Watching",
      sprite: "assets/solana-scout.png",
    },
    "solana-trader": {
      short: "TRD",
      label: "Trader",
      statusHint: "Ready",
      sprite: "assets/solana-trader.png",
    },
    "portfolio-guard": {
      short: "GRD",
      label: "Guard",
      statusHint: "Watching book",
      sprite: "assets/portfolio-guard.png",
    },
  };

  let state = null;
  let pausedBotId = null;
  let connectedPubkey = null;
  let isAdminConnected = false;
  let solPriceUsd = null;

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
          hour12: true,
        }) + " CT"
      );
    } catch {
      return iso || "";
    }
  }

  function pnlClass(n) {
    if (n > 0) return "pos";
    if (n < 0) return "neg";
    return "flat";
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
    return 120; // fallback estimate
  }

  function solForDeposit() {
    const price = solPriceUsd || 120;
    return DEPOSIT_USD / price;
  }

  function updateJupiterLink() {
    const link = $("#link-jupiter");
    if (!link) return;
    const sol = solForDeposit();
    // Jupiter swap UI as optional path; deposit button prefers Phantom transfer
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

  function updateConnectUi() {
    const btn = $("#btn-connect");
    const disc = $("#btn-disconnect");
    const modeEl = $("#status-mode");
    const tradingEl = $("#status-trading");
    const walletEl = $("#status-wallet");
    const deposit = $("#deposit-panel");

    if (connectedPubkey) {
      if (btn) {
        btn.textContent = isAdminConnected ? "Admin connected" : "Wrong wallet";
        btn.disabled = true;
      }
      if (disc) disc.hidden = false;

      if (isAdminConnected) {
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
          `<strong>Admin</strong> · Trading ON · Caps $25 / $75 / $50 · Connected as <code>${escapeHtml(shortAddr(connectedPubkey))}</code>`
        );
        if (deposit) deposit.hidden = false;
        updateDepositHint();
      } else {
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
      if (btn) {
        btn.textContent = "Connect Wallet";
        btn.disabled = false;
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
        `Connect Phantom with admin wallet <code>${escapeHtml(shortAddr(ADMIN_WALLET))}</code> to go <strong>LIVE</strong> and enable Trading ON.`
      );
      if (deposit) deposit.hidden = true;
    }

    // Keep PnL from JSON when available
    if (state) renderStatusPnl(state);
  }

  function updateDepositHint() {
    const hint = $("#deposit-hint");
    const sol = solForDeposit();
    if (hint) {
      hint.textContent =
        `Sends ~${sol.toFixed(4)} SOL (≈ $${DEPOSIT_USD}) to ${shortAddr(ADMIN_WALLET)} via Phantom. No private keys are stored on this site.`;
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
      pEl.textContent = `PnL ${sign}${fmtUsd(day)}`;
    }
  }

  function renderStatusLine(data) {
    // Wallet/trading status driven by Phantom; PnL from JSON
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
      "grok-bot": "Grok Bot",
      "solana-scout": "Scout",
      "solana-trader": "Trader",
      "portfolio-guard": "Guard",
    };
    return map[b.id] || b.name || "Bot";
  }

  function $$bots(el) {
    return [...el.querySelectorAll(".bot")];
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
        ];

    const existing = $$bots(el);
    if (existing.length === list.length) {
      list.forEach((b) => {
        const node = el.querySelector(`[data-bot="${CSS.escape(b.id)}"]`);
        if (!node) return;
        node.dataset.lastAction = b.lastAction || "";
        node.dataset.lastAt = b.lastAt || "";
        const nameEl = node.querySelector(".bot-name");
        if (nameEl) nameEl.textContent = shortName(b);
      });
      return;
    }

    el.innerHTML = list
      .map((b, i) => {
        const meta = BOT_META[b.id] || { short: "?", label: b.name, sprite: "" };
        const sprite = meta.sprite
          ? `<img class="bot-sprite" src="${escapeHtml(meta.sprite)}" width="80" height="80" alt="" draggable="false" />`
          : `<span class="bot-sprite fallback">${escapeHtml(meta.short)}</span>`;
        return `
        <button type="button" class="bot${pausedBotId === b.id ? " paused" : ""}"
          data-bot="${escapeHtml(b.id)}"
          data-path="${i % 4}"
          data-last-action="${escapeHtml(b.lastAction || "")}"
          data-last-at="${escapeHtml(b.lastAt || "")}"
          aria-label="${escapeHtml(b.name)} — ${escapeHtml(oneLineStatus(b))}">
          ${sprite}
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
      el.classList.toggle("paused", el.dataset.bot === botId);
    });
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
    if (!wallet) {
      el.innerHTML = `<p class="muted">No wallet data</p>`;
      return;
    }
    const showAdmin = isAdminConnected || wallet.isAdmin || wallet.role === "admin";
    el.innerHTML = `
      ${showAdmin && isAdminConnected ? `<span class="admin-tag">Admin · Trading ON</span>` : isAdminConnected ? `<span class="admin-tag">Admin</span>` : `<span class="admin-tag" style="color:var(--text-mute);border-color:var(--border);background:var(--bg-soft)">Waiting for connect</span>`}
      <div class="big">${fmtUsd(wallet.totalUsd)}</div>
      <div class="sub">${(wallet.solBalance ?? 0).toFixed(2)} SOL · ${escapeHtml(wallet.label || "Wallet")}</div>
      <div class="mono" title="${escapeHtml(wallet.address || ADMIN_WALLET)}">${escapeHtml(shortAddr(wallet.address || ADMIN_WALLET))}</div>
    `;
  }

  function renderPnL(pnl) {
    const el = $("#pnl-body");
    if (!el) return;
    const day = pnl?.dayPnlUsd ?? 0;
    const sign = day > 0 ? "+" : "";
    el.innerHTML = `
      <div class="big ${pnlClass(day)}">${sign}${fmtUsd(day)}</div>
      <div class="sub">${escapeHtml(pnl?.goalLabel || "Net-positive goal")} · ${fmtPct(pnl?.dayPnlPct)}</div>
      <div class="sub" style="margin-top:0.55rem;color:var(--text-mute)">
        Realized ${fmtUsd(pnl?.realizedTodayUsd)} · Open ${fmtUsd(pnl?.openExposureUsd)}
      </div>
    `;
  }

  function renderCaps(caps) {
    const el = $("#caps-body");
    if (!el) return;
    const c = caps || { perTradeUsd: 25, maxOpenUsd: 75, dailyLossHaltUsd: 50 };
    el.innerHTML = `
      <ul class="caps-list">
        <li><span class="label">Per trade</span><span class="val">${fmtUsd(c.perTradeUsd, 0)}</span></li>
        <li><span class="label">Max open</span><span class="val">${fmtUsd(c.maxOpenUsd, 0)}</span></li>
        <li><span class="label">Daily halt</span><span class="val">${fmtUsd(c.dailyLossHaltUsd, 0)}</span></li>
      </ul>
    `;
  }

  function renderFeed(events) {
    const el = $("#activity-feed");
    if (!el) return;
    const list = (events || []).slice(0, FEED_LIMIT);
    if (!list.length) {
      el.innerHTML = `<li class="muted">No activity yet</li>`;
      return;
    }
    el.innerHTML = list
      .map((e) => {
        const meta = BOT_META[e.bot] || { label: e.bot };
        const short =
          e.bot === "grok-bot"
            ? "Grok"
            : e.bot === "solana-scout"
              ? "Scout"
              : e.bot === "solana-trader"
                ? "Trader"
                : e.bot === "portfolio-guard"
                  ? "Guard"
                  : meta.label;
        return `<li>
          <span class="bot-label ${escapeHtml(e.bot || "")}">${escapeHtml(short)}</span>
          <span class="title">${escapeHtml(e.title)}</span>
          <span class="ts">${fmtTime(e.ts)}</span>
        </li>`;
      })
      .join("");
  }

  function paint(data) {
    state = data;
    renderStatusLine(data);
    renderBots(data.bots || []);
    renderWallet(data.wallet);
    renderPnL(data.pnl || {});
    renderCaps(data.riskCaps);
    renderFeed(data.events || []);
    updateConnectUi();
    const upd = $("#data-updated");
    if (upd) {
      upd.textContent = data.meta?.updatedAt
        ? `Updated ${fmtTime(data.meta.updatedAt)}`
        : "";
    }
  }

  async function refresh() {
    try {
      const data = await loadData();
      paint(data);
    } catch (err) {
      console.error(err);
      const el = $("#activity-feed");
      if (el) {
        el.innerHTML =
          `<li class="muted">Could not load <code>data/activity.json</code>. Serve over HTTP.</li>`;
      }
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
      const to = new PublicKey(ADMIN_WALLET);

      // Admin wallet IS the agent wallet — cannot self-transfer meaningfully.
      // Guided fund: copy amount, open Jupiter (or Phantom browse) for ~$5 SOL.
      if (from.equals(to)) {
        const amt = solAmount.toFixed(4);
        try {
          await navigator.clipboard.writeText(ADMIN_WALLET);
        } catch (_) { /* ignore */ }
        setDepositStatus(
          `Guided fund · ~${amt} SOL (≈ $${DEPOSIT_USD}) into agent ${shortAddr(ADMIN_WALLET)} (address copied). Opening Jupiter — swap/buy SOL into this wallet. No keys leave Phantom.`,
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
    $("#btn-connect")?.addEventListener("click", connectWallet);
    $("#btn-disconnect")?.addEventListener("click", disconnectWallet);
    $("#btn-deposit")?.addEventListener("click", depositFiveDollars);

    const provider = getProvider();
    if (provider) {
      provider.on?.("accountChanged", (pk) => {
        applyConnected(pk ? pk.toString() : null);
      });
      provider.on?.("disconnect", () => applyConnected(null));
      // Eager reconnect if already trusted
      if (provider.isConnected && provider.publicKey) {
        applyConnected(provider.publicKey.toString());
      } else if (provider.publicKey) {
        applyConnected(provider.publicKey.toString());
      }
    }
  }

  async function init() {
    bindWalletUi();
    updateConnectUi();
    fetchSolPrice().then((p) => {
      solPriceUsd = p;
      updateDepositHint();
    });
    await refresh();
    setInterval(refresh, REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
