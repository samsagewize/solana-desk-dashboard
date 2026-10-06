/**
 * Solana Desk — minimal client
 * Loads data/activity.json. Display-only. No wallet keys / orders.
 */
(function () {
  "use strict";

  const DATA_URL = "data/activity.json";
  const REFRESH_MS = 15000;
  const FEED_LIMIT = 8;

  const BOT_META = {
    "grok-bot": { short: "GRK", label: "Grok Bot", statusHint: "Coordinating" },
    "solana-scout": { short: "SCT", label: "Scout", statusHint: "Watching" },
    "solana-trader": { short: "TRD", label: "Trader", statusHint: "Ready" },
    "portfolio-guard": { short: "GRD", label: "Guard", statusHint: "Watching book" },
  };

  let state = null;
  let pausedBotId = null;

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

  async function loadData() {
    const res = await fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
    return res.json();
  }

  function renderStatusLine(data) {
    const mode = (data.status?.tradingMode || data.meta?.mode || "live").toUpperCase();
    const wallet = data.wallet || {};
    const pnl = data.pnl || {};
    const addr = shortAddr(wallet.address);
    const admin = wallet.isAdmin || wallet.role === "admin" ? "admin " : "";
    const day = pnl.dayPnlUsd ?? 0;
    const sign = day > 0 ? "+" : "";

    const liveEl = $(".status-live");
    if (liveEl) liveEl.textContent = mode;

    const wEl = $("#status-wallet");
    if (wEl) {
      wEl.innerHTML = `${escapeHtml(admin)}<span class="status-wallet-short" title="${escapeHtml(wallet.address || "")}">${escapeHtml(addr)}</span>`;
    }

    const pEl = $("#status-pnl");
    if (pEl) {
      pEl.className = pnlClass(day);
      pEl.textContent = `PnL ${sign}${fmtUsd(day)}`;
    }
  }

  function oneLineStatus(bot) {
    const hint = BOT_META[bot.id]?.statusHint || "Online";
    if (bot.status && bot.status !== "online") return bot.status;
    // Prefer a short focus / tagline fragment
    const src = bot.focus || bot.tagline || hint;
    const cut = src.split("·")[0].trim();
    return cut.length > 28 ? cut.slice(0, 26) + "…" : cut;
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

    // Keep DOM stable if already rendered (preserve pause / animation)
    const existing = $$bots(el);
    if (existing.length === list.length) {
      list.forEach((b) => {
        const node = el.querySelector(`[data-bot="${CSS.escape(b.id)}"]`);
        if (!node) return;
        node.dataset.lastAction = b.lastAction || "";
        node.dataset.lastAt = b.lastAt || "";
        const statusEl = node.querySelector(".bot-status-line");
        if (statusEl) statusEl.textContent = oneLineStatus(b);
        const nameEl = node.querySelector(".bot-name");
        if (nameEl) nameEl.textContent = shortName(b);
      });
      return;
    }

    el.innerHTML = list
      .map((b, i) => {
        const meta = BOT_META[b.id] || { short: "?", label: b.name };
        return `
        <button type="button" class="bot${pausedBotId === b.id ? " paused" : ""}"
          data-bot="${escapeHtml(b.id)}"
          data-path="${i % 4}"
          data-last-action="${escapeHtml(b.lastAction || "")}"
          data-last-at="${escapeHtml(b.lastAt || "")}"
          aria-label="${escapeHtml(b.name)} — ${escapeHtml(oneLineStatus(b))}">
          <span class="bot-sprite ${escapeHtml(b.id)}">${meta.short}</span>
          <span class="bot-name">${escapeHtml(shortName(b))}</span>
          <span class="bot-status-line">${escapeHtml(oneLineStatus(b))}</span>
        </button>`;
      })
      .join("");

    bindBotInteractions();
  }

  function $$bots(el) {
    return [...el.querySelectorAll(".bot")];
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

  function showTooltip(botEl) {
    const tip = $("#bot-tooltip");
    const floor = $("#desk-floor");
    if (!tip || !floor || !botEl) return;

    const action = botEl.dataset.lastAction || "No recent action";
    const when = botEl.dataset.lastAt ? fmtTime(botEl.dataset.lastAt) : "";
    const name = botEl.querySelector(".bot-name")?.textContent || "Bot";

    tip.innerHTML = `<strong>${escapeHtml(name)}</strong>${escapeHtml(action)}${when ? `<span class="when">${escapeHtml(when)}</span>` : ""}`;
    tip.hidden = false;

    // Position near bot within floor
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
      const on = el.dataset.bot === botId;
      el.classList.toggle("paused", on);
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
        if (pausedBotId === botEl.dataset.bot) {
          // keep paused if clicked-sticky; only clear hover pause if not sticky
          if (!botEl.dataset.sticky) {
            setPaused(null);
            hideTooltip();
          }
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
        // clear sticky on all
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

    // Click floor background to clear sticky
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
    const isAdmin = wallet.isAdmin || wallet.role === "admin";
    el.innerHTML = `
      ${isAdmin ? `<span class="admin-tag">Admin</span>` : ""}
      <div class="big">${fmtUsd(wallet.totalUsd)}</div>
      <div class="sub">${(wallet.solBalance ?? 0).toFixed(2)} SOL · ${escapeHtml(wallet.label || "Wallet")}</div>
      <div class="mono" title="${escapeHtml(wallet.address || "")}">${escapeHtml(shortAddr(wallet.address))}</div>
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
    }
  }

  async function init() {
    await refresh();
    setInterval(refresh, REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
