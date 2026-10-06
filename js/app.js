/**
 * Solana Desk Dashboard — client renderer
 * Loads data/activity.json. Mode chip follows status.tradingMode (live/paper).
 * Banner stays honest: UI is visualization; feed may be sample until bots write.
 * No wallet keys. No order placement from this UI.
 */
(function () {
  "use strict";

  const DATA_URL = "data/activity.json";
  const REFRESH_MS = 15000;

  const BOT_SHORT = {
    "grok-bot": { short: "GRK", cls: "grok-bot", label: "Grok Bot" },
    "solana-scout": { short: "SCT", cls: "solana-scout", label: "Scout" },
    "solana-trader": { short: "TRD", cls: "solana-trader", label: "Trader" },
    "portfolio-guard": { short: "GRD", cls: "portfolio-guard", label: "Guard" },
  };

  let state = null;
  let botFilter = "all";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function fmtUsd(n, digits = 2) {
    if (n == null || Number.isNaN(n)) return "—";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
    return `${sign}$${abs.toFixed(digits)}`;
  }

  function fmtPrice(n) {
    if (n == null) return "—";
    if (n >= 100) return n.toFixed(2);
    if (n >= 1) return n.toFixed(3);
    if (n >= 0.01) return n.toFixed(4);
    return n.toPrecision(3);
  }

  function fmtPct(n, digits = 2) {
    if (n == null) return "—";
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(digits)}%`;
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
      return iso;
    }
  }

  function fmtClock() {
    return (
      new Date().toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }) + " CT"
    );
  }

  function clsPnL(n) {
    if (n > 0) return "pos";
    if (n < 0) return "neg";
    return "";
  }

  function pnlClass(n) {
    if (n > 0) return "pnl-pos";
    if (n < 0) return "pnl-neg";
    return "";
  }

  function applyDemoTick(prices) {
    return prices.map((p) => {
      const wobble = (Math.random() - 0.5) * 0.0012;
      return { ...p, price: p.price * (1 + wobble), _demoTick: true };
    });
  }

  async function loadData() {
    const res = await fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
    return res.json();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderBanner(meta, status) {
    const el = $("#demo-banner");
    if (!el) return;
    const live = (status?.tradingMode || meta?.mode) === "live";
    const label = meta?.label || (live
      ? "LIVE — visualization UI; feed may still show sample until bots write"
      : "DEMO — live feeds not connected");
    const chip = live
      ? `<span class="chip live"><span class="dot"></span> Live</span>`
      : `<span class="chip demo"><span class="dot"></span> Demo data</span>`;
    el.innerHTML = `
      <span><strong>${escapeHtml(label)}</strong>
      — Organized desk for Christian Sanchez: Grok Bot · Scout · Trader · Guard.
      ${live
        ? "Activity may still be sample until bots append to <code>data/activity.json</code>."
        : "Live mode pending."}</span>
      ${chip}
    `;
  }

  function renderStatusChips(status) {
    const mode = status?.tradingMode || "live";
    $("#chip-mode").className = "chip " + (mode === "live" ? "live" : "paper");
    $("#chip-mode").innerHTML = `<span class="dot"></span> ${mode === "live" ? "Live" : "Paper"} mode`;
    const liveNote = $("#chip-live-pending");
    if (status?.livePending) {
      liveNote.hidden = false;
      liveNote.innerHTML = `<span class="dot"></span> Live pending`;
    } else {
      liveNote.hidden = true;
    }
  }

  function renderBotPanels(bots) {
    const el = $("#bot-panels");
    if (!el) return;
    const list = bots?.length
      ? bots
      : [
          { id: "grok-bot", name: "Grok Bot", role: "Coordinator", status: "online", tagline: "Coordinator", focus: "—", lastAction: "—", metrics: [] },
          { id: "solana-scout", name: "Solana Scout", role: "Research", status: "online", tagline: "—", focus: "—", lastAction: "—", metrics: [] },
          { id: "solana-trader", name: "Solana Trader", role: "Execution", status: "online", tagline: "—", focus: "—", lastAction: "—", metrics: [] },
          { id: "portfolio-guard", name: "Portfolio Guard", role: "Risk / PnL", status: "online", tagline: "—", focus: "—", lastAction: "—", metrics: [] },
        ];

    el.innerHTML = list
      .map((b) => {
        const meta = BOT_SHORT[b.id] || { short: "?", cls: b.id };
        const metrics = (b.metrics || [])
          .map(
            (m) => `
          <div class="bot-metric">
            <span class="k">${escapeHtml(m.label)}</span>
            <span class="v">${escapeHtml(m.value)}</span>
          </div>`
          )
          .join("");
        return `
        <article class="bot-card ${escapeHtml(b.id)}" data-bot="${escapeHtml(b.id)}">
          <div class="bot-card-top">
            <div class="bot-identity">
              <div class="bot-avatar ${meta.cls}">${meta.short}</div>
              <div>
                <h3>${escapeHtml(b.name)}</h3>
                <div class="role">${escapeHtml(b.role)}</div>
              </div>
            </div>
            <span class="bot-status ${escapeHtml(b.status || "online")}">${escapeHtml(b.status || "online")}</span>
          </div>
          <p class="bot-tagline">${escapeHtml(b.tagline || "")}</p>
          <div class="bot-focus">${escapeHtml(b.focus || "")}</div>
          <div class="bot-metrics">${metrics}</div>
          <div class="bot-last">
            ${escapeHtml(b.lastAction || "")}
            <span class="when">${b.lastAt ? fmtTime(b.lastAt) : ""}</span>
          </div>
        </article>`;
      })
      .join("");
  }

  function renderWallet(wallet) {
    const el = $("#wallet-panel");
    if (!el || !wallet) {
      if (el) el.innerHTML = `<p class="muted">No wallet demo data</p>`;
      return;
    }
    const target = wallet.targetSolUsd || 40;
    const solUsd = wallet.solUsd ?? 0;
    const pct = Math.min(100, (solUsd / target) * 100);
    const onTarget = solUsd >= target * 0.9;
    const isAdmin = wallet.isAdmin || wallet.role === "admin";
    const adminChip = isAdmin
      ? `<span class="admin-chip wallet-admin-chip" title="ADMIN trading wallet"><span class="dot"></span> Admin</span>`
      : "";

    el.innerHTML = `
      <div class="wallet-hero">
        <div>
          <div class="label-row">
            <div class="label">${escapeHtml(wallet.label || "Wallet")}</div>
            ${adminChip}
          </div>
          <div class="total">${fmtUsd(wallet.totalUsd)}</div>
        </div>
        <div class="wallet-target">
          <div class="label">SOL target</div>
          <div class="tgt">${fmtUsd(solUsd)} / ~${fmtUsd(target, 0)}</div>
          <div class="pct">${onTarget ? "On target" : "Building toward"} · ${pct.toFixed(0)}%</div>
        </div>
      </div>
      <div class="target-bar" title="SOL USD vs ~$${target} target"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="wallet-rows">
        <div class="wallet-row">
          <span class="asset"><span class="pip sol"></span> SOL</span>
          <span class="amt">${fmtUsd(solUsd)}<span class="sub">${(wallet.solBalance ?? 0).toFixed(4)} SOL</span></span>
        </div>
        <div class="wallet-row">
          <span class="asset"><span class="pip usdc"></span> USDC</span>
          <span class="amt">${fmtUsd(wallet.usdcBalance)}<span class="sub">dry powder</span></span>
        </div>
        <div class="wallet-row">
          <span class="asset"><span class="pip other"></span> Other</span>
          <span class="amt">${fmtUsd(wallet.otherUsd || 0)}<span class="sub">alts / dust</span></span>
        </div>
      </div>
      <p class="wallet-note">${escapeHtml(wallet.note || "")}<br/><code>${escapeHtml(wallet.address || "demo")}</code></p>
    `;
  }

  function renderPrices(prices) {
    const strip = $("#price-strip");
    if (!strip) return;
    strip.innerHTML = prices
      .map((p, i) => {
        const up = p.change24hPct >= 0;
        return `
        <div class="ticker${i === 0 ? " primary" : ""}" data-symbol="${escapeHtml(p.symbol)}">
          <div class="sym">${escapeHtml(p.pair || p.symbol)}</div>
          <div class="price">$${fmtPrice(p.price)}</div>
          <div class="chg ${up ? "up" : "down"}">${fmtPct(p.change24hPct)}</div>
          <div class="vol">Vol 24h ${fmtUsd(p.volume24h, 0)}</div>
        </div>`;
      })
      .join("");
  }

  function renderPnL(pnl) {
    const dayCls = clsPnL(pnl.dayPnlUsd);
    const status = pnl.goalStatus || (pnl.dayPnlUsd >= 0 ? "on_track" : "at_risk");
    const goalLabel = pnl.goalLabel || "Stay net-positive";
    const badge = $("#pnl-goal-badge");
    if (badge) {
      badge.textContent = status === "on_track" ? "on track" : status.replace("_", " ");
    }

    $("#pnl-summary").innerHTML = `
      <div class="pnl-goal-banner ${escapeHtml(status)}">
        <span class="goal-title">🎯 ${escapeHtml(goalLabel)}</span>
        <span class="goal-meta">${pnl.dayPnlUsd >= 0 ? "Net +" : "Net −"} today · ${pnl.streakGreenSessions || 0} green sessions</span>
      </div>
      <div class="stat hero">
        <label>Day PnL</label>
        <div class="val ${dayCls}">${pnl.dayPnlUsd >= 0 ? "+" : ""}${fmtUsd(pnl.dayPnlUsd)}
          <span style="font-size:0.85rem;font-weight:500;opacity:0.85">${fmtPct(pnl.dayPnlPct)}</span>
        </div>
        <div class="sub">Starting book ${fmtUsd(pnl.startingBookUsd)} · Guard prioritizes green</div>
      </div>
      <div class="stat">
        <label>Realized today</label>
        <div class="val ${clsPnL(pnl.realizedTodayUsd)}">${pnl.realizedTodayUsd >= 0 ? "+" : ""}${fmtUsd(pnl.realizedTodayUsd)}</div>
      </div>
      <div class="stat">
        <label>Unrealized</label>
        <div class="val ${clsPnL(pnl.unrealizedUsd)}">${pnl.unrealizedUsd >= 0 ? "+" : ""}${fmtUsd(pnl.unrealizedUsd)}</div>
      </div>
      <div class="stat">
        <label>Open exposure</label>
        <div class="val">${fmtUsd(pnl.openExposureUsd)}</div>
        <div class="sub">vs $${state.riskCaps?.maxOpenUsd ?? 75} max open</div>
      </div>
      <div class="stat">
        <label>Strategy</label>
        <div class="val" style="font-size:0.95rem;font-family:var(--font)">${escapeHtml(state.riskCaps?.strategy || "—")}</div>
      </div>
    `;
  }

  function renderGauges(pnl, caps) {
    const openPct = Math.min(100, (pnl.openExposureUsd / caps.maxOpenUsd) * 100);
    const tradeUsed = Math.max(...(state.positions || []).map((p) => p.sizeUsd), 0);
    const tradePct = Math.min(100, (tradeUsed / caps.perTradeUsd) * 100);
    const lossUsed = pnl.dayPnlUsd < 0 ? Math.abs(pnl.dayPnlUsd) : 0;
    const haltPct = Math.min(100, (lossUsed / caps.dailyLossHaltUsd) * 100);
    const haltBarClass = haltPct > 70 ? "halt" : haltPct > 40 ? "warn" : "";

    $("#risk-gauges").innerHTML = `
      <div class="gauge-row">
        <label><span>Per-trade cap used (largest open)</span><span>${fmtUsd(tradeUsed)} / ${fmtUsd(caps.perTradeUsd)}</span></label>
        <div class="bar"><i style="width:${tradePct.toFixed(1)}%"></i></div>
      </div>
      <div class="gauge-row">
        <label><span>Max open exposure</span><span>${fmtUsd(pnl.openExposureUsd)} / ${fmtUsd(caps.maxOpenUsd)}</span></label>
        <div class="bar ${openPct > 80 ? "warn" : ""}"><i style="width:${openPct.toFixed(1)}%"></i></div>
      </div>
      <div class="gauge-row">
        <label><span>Daily loss halt distance</span><span>${fmtUsd(lossUsed)} / ${fmtUsd(caps.dailyLossHaltUsd)} used</span></label>
        <div class="bar ${haltBarClass}"><i style="width:${Math.max(haltPct, 2).toFixed(1)}%"></i></div>
      </div>
      <p class="caps-note">Caps: $${caps.perTradeUsd}/trade · $${caps.maxOpenUsd} max open · $${caps.dailyLossHaltUsd} daily loss halt. Mode follows status chip. This UI never places orders. Goal: stay net-positive.</p>
    `;
  }

  function renderPositions(positions) {
    const tbody = $("#positions-body");
    if (!positions?.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="muted">No open positions</td></tr>`;
      return;
    }
    tbody.innerHTML = positions
      .map((p) => {
        const bot = BOT_SHORT[p.bot]?.label || p.bot;
        return `<tr>
          <td><strong>${escapeHtml(p.symbol)}</strong></td>
          <td><span class="side-pill ${p.side}">${escapeHtml(p.side)}</span></td>
          <td>${fmtUsd(p.sizeUsd)}</td>
          <td>$${fmtPrice(p.entry)}</td>
          <td>$${fmtPrice(p.mark)}</td>
          <td class="${pnlClass(p.pnlUsd)}">${p.pnlUsd >= 0 ? "+" : ""}${fmtUsd(p.pnlUsd)} (${fmtPct(p.pnlPct)})</td>
          <td><span class="bot-tag">${escapeHtml(bot)}</span></td>
          <td style="font-family:var(--font);color:var(--text-dim);font-size:0.72rem">${escapeHtml(p.note || "")}</td>
        </tr>`;
      })
      .join("");
  }

  function renderWatchlist(list) {
    const el = $("#watchlist");
    el.innerHTML = (list || [])
      .map(
        (w) => `
      <div class="watch-item">
        <div class="sym">${escapeHtml(w.symbol)}</div>
        <div class="meta">
          <div>${escapeHtml(w.horizon)} · score <span class="score">${w.scoutScore}</span></div>
          <div class="note">${escapeHtml(w.note || "")}</div>
        </div>
        <div class="bias ${escapeHtml(w.bias)}">${escapeHtml(w.bias)}</div>
      </div>`
      )
      .join("");
  }

  function renderConnections(status) {
    const conns = status?.connections || {};
    const el = $("#connections");
    el.innerHTML = Object.values(conns)
      .map((c) => {
        const st = c.state || "demo";
        return `
        <div class="conn ${escapeHtml(st)}">
          <div class="left">
            <span class="dot"></span>
            <div>
              <div class="name">${escapeHtml(c.label)}</div>
              <div class="detail">${escapeHtml(c.detail || "")}</div>
            </div>
          </div>
          <span class="state-label">${escapeHtml(st)}</span>
        </div>`;
      })
      .join("");
  }

  function renderFeed(events) {
    const filtered =
      botFilter === "all" ? events : events.filter((e) => e.bot === botFilter);
    const el = $("#activity-feed");
    if (!filtered.length) {
      el.innerHTML = `<p class="muted">No events for this filter.</p>`;
      return;
    }
    el.innerHTML = filtered
      .map((e) => {
        const meta = BOT_SHORT[e.bot] || { short: "?", cls: "grok-bot", label: e.bot };
        const level = e.level || "info";
        const tags = (e.tags || [])
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join("");
        return `
        <article class="event ${escapeHtml(level)}">
          <div class="event-bot ${meta.cls}" title="${escapeHtml(meta.label)}">${meta.short}</div>
          <div>
            <div class="event-head">
              <span class="title">${escapeHtml(e.title)}</span>
              <span class="ts">${fmtTime(e.ts)}</span>
            </div>
            <div class="msg">${escapeHtml(e.message)}</div>
            <div class="tags">${tags}</div>
          </div>
        </article>`;
      })
      .join("");
  }

  function bindFilters() {
    $$(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        botFilter = btn.dataset.filter;
        $$(".filter-btn").forEach((b) =>
          b.classList.toggle("active", b.dataset.filter === botFilter)
        );
        if (state?.events) renderFeed(state.events);
      });
    });
  }

  function paint(data, { tickPrices = false } = {}) {
    state = data;
    const prices = tickPrices && data.prices ? applyDemoTick(data.prices) : data.prices;
    if (tickPrices && prices) state = { ...data, prices };

    renderBanner(data.meta || {}, data.status || {});
    renderStatusChips(data.status || {});
    renderBotPanels(data.bots || []);
    renderWallet(data.wallet);
    renderPrices(prices || []);
    renderPnL(data.pnl || {});
    renderGauges(data.pnl || {}, data.riskCaps || { perTradeUsd: 25, maxOpenUsd: 75, dailyLossHaltUsd: 50 });
    renderPositions(data.positions || []);
    renderWatchlist(data.watchlist || []);
    renderConnections(data.status || {});
    renderFeed(data.events || []);
    $("#data-updated").textContent = data.meta?.updatedAt
      ? `Data updated ${fmtTime(data.meta.updatedAt)}`
      : "";
  }

  async function refresh({ tick = false } = {}) {
    try {
      const data = await loadData();
      paint(data, { tickPrices: tick });
    } catch (err) {
      console.error(err);
      $("#activity-feed").innerHTML =
        `<p class="muted">Could not load <code>data/activity.json</code>. Serve the folder over HTTP (see README).</p>`;
    }
  }

  function startClock() {
    const el = $("#clock");
    const tick = () => {
      if (el) el.textContent = fmtClock();
    };
    tick();
    setInterval(tick, 1000);
  }

  async function init() {
    bindFilters();
    startClock();
    await refresh({ tick: false });
    setInterval(() => {
      if (state?.prices) paint(state, { tickPrices: true });
    }, 4000);
    setInterval(() => refresh({ tick: false }), REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
