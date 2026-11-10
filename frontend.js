// UnoRouter Price Monitor — Lumiverse Spindle frontend extension
// Uses UnoRouter's public pricing catalogue; no API key or account token is needed.

const CATALOG_URL = "https://api.unorouter.com/api/pricing/catalog";
const STORAGE_KEY = "unorouter_price_monitor_watchlist_v1";
const REFRESH_STORAGE_KEY = "unorouter_price_monitor_refresh_v1";
const SORT_STORAGE_KEY = "unorouter_price_monitor_sort_v1";
const REFRESH_OPTIONS = [["0","Off"],["60000","1 minute"],["300000","5 minutes"],["900000","15 minutes"],["1800000","30 minutes"],["3600000","60 minutes"]];

export function setup(ctx) {
  const tab = ctx.ui.registerDrawerTab({
    id: "unorouter-prices",
    title: "UnoRouter Price Monitor",
    shortName: "Prices",
    headerTitle: "UnoRouter Prices",
    description: "Live model pricing and availability",
    keywords: ["unorouter", "models", "pricing", "tokens", "cost", "free"],
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/></svg>'
  });

  const root = tab.root;
  root.replaceChildren();

  const style = document.createElement("style");
  style.textContent = `
    .urm { color: var(--text-primary, inherit); font: inherit; padding: 14px; box-sizing: border-box; }
    .urm * { box-sizing: border-box; }
    .urm-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
    .urm-title { font-size:18px; font-weight:700; }
    .urm-sub { opacity:.68; font-size:12px; margin-top:3px; }
    .urm-actions { display:flex; gap:7px; align-items:center; }
    .urm button, .urm input, .urm select { font:inherit; }
    .urm button { cursor:pointer; border:1px solid var(--border-color, #7775); color:inherit; background:var(--surface-2, #8881); border-radius:8px; padding:7px 10px; }
    .urm button:hover { filter:brightness(1.12); }
    .urm button.primary { background:var(--accent, #7864c8); color:white; border-color:transparent; }
    .urm button.star { border:0; background:transparent; padding:3px 7px; font-size:18px; }
    .urm input, .urm select { color:inherit; background:var(--input-bg, var(--surface-2, #8881)); border:1px solid var(--border-color, #7775); border-radius:8px; padding:9px 10px; min-width:0; }
    .urm input { flex:1; width:100%; }
    .urm .toolbar { display:flex; gap:8px; margin:12px 0; flex-wrap:wrap; }
    .urm .toolbar input { flex:1 1 180px; }
    .urm .toolbar select { flex:0 1 150px; }
    .urm .head-setting { display:flex; align-items:center; gap:6px; }
    .urm .head-setting label { font-size:11px; opacity:.7; }
    .urm .head-setting select { max-width:125px; padding:7px 8px; }
    .urm .stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:12px 0; }
    .urm .stat { border:1px solid var(--border-color, #7775); background:var(--surface-1, #8881); border-radius:10px; padding:10px; min-width:0; }
    .urm .stat strong { display:block; font-size:17px; }
    .urm .stat span { font-size:11px; opacity:.7; }
    .urm .section { font-size:13px; font-weight:700; margin:18px 0 8px; }
    .urm .active-panel { border:1px solid var(--accent, #7864c8); border-radius:11px; padding:0 10px 10px; margin:12px 0 16px; }
    .urm .active-panel .section { margin-top:10px; }
    .urm .pinned-list:empty { display:none; }
    .urm .model { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; border:1px solid var(--border-color, #7775); background:var(--surface-1, #8881); border-radius:10px; padding:10px; margin:7px 0; }
    .urm .model-name { font-size:13px; font-weight:650; overflow-wrap:anywhere; }
    .urm .model-meta { font-size:11px; opacity:.7; margin-top:3px; display:flex; gap:7px; flex-wrap:wrap; }
    .urm .prices { display:flex; gap:10px; flex-wrap:wrap; font-size:12px; margin-top:7px; }
    .urm .prices b { font-variant-numeric:tabular-nums; }
    .urm .status { font-size:10px; padding:2px 6px; border-radius:20px; background:var(--surface-2, #8882); }
    .urm .status.online { color:var(--success, #3a9b70); }
    .urm .status.offline { color:var(--danger, #c66); }
    .urm .empty, .urm .notice { opacity:.72; font-size:12px; padding:12px; border:1px dashed var(--border-color, #7775); border-radius:9px; }
    .urm .foot { font-size:11px; opacity:.6; margin-top:14px; line-height:1.5; }
    .urm .error { color:var(--danger, #c66); }
    @media (max-width:520px) { .urm {padding:10px;} .urm .stats {grid-template-columns:repeat(3,minmax(0,1fr));} .urm .stat {padding:8px;} .urm .stat strong {font-size:14px;} .urm .model {grid-template-columns:minmax(0,1fr) auto;} }
  `;
  root.appendChild(style);

  const app = document.createElement("div");
  app.className = "urm";
  root.appendChild(app);

  let models = [];
  let lastUpdated = null;
  let loading = false;
  let errorMessage = "";
  let watchlist = readWatchlist();
  let filter = "all";
  let search = "";
  let activeConnection = null;
  let activeProfileName = null;
  let refreshInterval = readNumberSetting(REFRESH_STORAGE_KEY, 0);
  let sortMode = readSetting(SORT_STORAGE_KEY, "input-asc");
  let refreshTimer = null;
  let destroyed = false;

  function readSetting(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }
  function readNumberSetting(key, fallback) {
    const value = Number(readSetting(key, String(fallback)));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }
  function saveSetting(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
  }
  function readWatchlist() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  function saveWatchlist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist)); } catch {}
  }
  function money(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    const n = Number(value);
    if (n === 0) return "$0";
    if (n < 0.01) return "$" + n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    if (n < 1) return "$" + n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return "$" + n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function addModelCard(parent, model) {
    const card = el("div", "model");
    const left = el("div");
    const name = el("div", "model-name", model.model_name || "Unknown model");
    left.appendChild(name);
    const meta = el("div", "model-meta");
    meta.appendChild(el("span", "status " + (model.online ? "online" : "offline"), model.online ? "Online" : "Offline"));
    meta.appendChild(el("span", "status", model.is_free ? "Free" : "Paid"));
    if (model.vendor) meta.appendChild(el("span", "", model.vendor));
    if (model.type) meta.appendChild(el("span", "", model.type));
    left.appendChild(meta);
    const prices = el("div", "prices");
    const input = el("span");
    input.append("In ");
    const ib = el("b", "", money(model.input_price));
    input.appendChild(ib);
    input.append(" / 1M");
    const output = el("span");
    output.append("Out ");
    output.appendChild(el("b", "", money(model.output_price)));
    output.append(" / 1M");
    prices.append(input, output);
    left.appendChild(prices);

    const star = el("button", "star", watchlist.includes(model.model_name) ? "★" : "☆");
    star.type = "button";
    star.title = watchlist.includes(model.model_name) ? "Remove from watchlist" : "Add to watchlist";
    star.setAttribute("aria-label", star.title);
    star.addEventListener("click", () => {
      if (watchlist.includes(model.model_name)) watchlist = watchlist.filter(x => x !== model.model_name);
      else watchlist.push(model.model_name);
      saveWatchlist();
      render();
    });
    card.append(left, star);
    parent.appendChild(card);
  }

  function render() {
    app.replaceChildren();
    const head = el("div", "urm-head");
    const titleWrap = el("div");
    titleWrap.append(el("div", "urm-title", "UnoRouter prices"));
    titleWrap.append(el("div", "urm-sub", lastUpdated ? "Updated " + lastUpdated.toLocaleTimeString() : "Live model catalogue"));
    head.appendChild(titleWrap);
    const actions = el("div", "urm-actions");
    const refreshSetting = el("div", "head-setting");
    const refreshLabel = el("label", "", "Auto");
    const refreshSelect = el("select");
    refreshSelect.setAttribute("aria-label", "Auto-refresh interval");
    REFRESH_OPTIONS.forEach(([value,label]) => {
      const option = el("option", "", label); option.value = value; refreshSelect.appendChild(option);
    });
    refreshSelect.value = String(refreshInterval);
    refreshSelect.addEventListener("change", e => {
      refreshInterval = Number(e.target.value) || 0;
      saveSetting(REFRESH_STORAGE_KEY, refreshInterval);
      scheduleAutoRefresh();
      render();
    });
    refreshSetting.append(refreshLabel, refreshSelect);
    const refresh = el("button", "primary", loading ? "Refreshing…" : "Refresh");
    refresh.disabled = loading;
    refresh.addEventListener("click", loadCatalog);
    actions.append(refreshSetting, refresh);
    head.append(actions);
    app.append(head);

    if (errorMessage) app.append(el("div", "notice error", errorMessage));
    if (loading && models.length === 0) app.append(el("div", "empty", "Loading UnoRouter catalogue…"));

    // Active Lumiverse LLM connection (read-only; no credentials are exposed).
    if (activeConnection) {
      const activeModelId = activeConnection.model || "";
      const activeProvider = activeConnection.provider || "Unknown provider";
      const activeName = activeProfileName || activeProvider;
      const normalized = value => String(value || "").toLowerCase().replace(/^models\//, "").trim();
      const matched = models.find(m => {
        const candidates = [m.model_name, m.id, m.model, m.model_id, m.slug];
        return candidates.some(v => normalized(v) === normalized(activeModelId));
      });
      const looksLikeUnoRouter = /unorouter/i.test(activeProvider + " " + activeName) || !!matched;
      const panel = el("div", "active-panel");
      panel.append(el("div", "section", "Currently connected"));
      const row = el("div", "model");
      const info = el("div");
      info.append(el("div", "model-name", activeModelId || "No model selected"));
      info.append(el("div", "model-meta", activeName + " · " + activeProvider));
      if (matched) {
        info.append(el("div", "model-meta", "UnoRouter catalogue match"));
        const prices = el("div", "prices");
        prices.append(el("span", "", "In " + money(matched.input_price) + " / 1M"));
        prices.append(el("span", "", "Out " + money(matched.output_price) + " / 1M"));
        info.append(prices);
      } else {
        info.append(el("div", "model-meta", looksLikeUnoRouter
          ? "Model not found in the current UnoRouter catalogue"
          : "This connection is not identified as an UnoRouter model"));
      }
      row.appendChild(info);
      panel.appendChild(row);
      app.appendChild(panel);
    }

    if (models.length) {
      const stats = el("div", "stats");
      const free = models.filter(m => m.is_free).length;
      const online = models.filter(m => m.online).length;
      [[models.length, "Models"], [free, "Free"], [online, "Online"]].forEach(([v, label]) => {
        const s = el("div", "stat");
        s.append(el("strong", "", String(v)), el("span", "", label));
        stats.appendChild(s);
      });
      app.append(stats);

      const toolbar = el("div", "toolbar");
      const searchInput = el("input");
      searchInput.type = "search";
      searchInput.placeholder = "Search model or provider…";
      searchInput.value = search;
      searchInput.addEventListener("input", e => { search = e.target.value; renderLists(); });
      const select = el("select");
      [["all","All models"],["watchlist","Watchlist"],["free","Free only"],["paid","Paid only"],["online","Online only"]].forEach(([v,l]) => {
        const o = el("option", "", l); o.value = v; select.appendChild(o);
      });
      select.value = filter;
      select.addEventListener("change", e => { filter = e.target.value; renderLists(); });
      const sortSelect = el("select");
      sortSelect.setAttribute("aria-label", "Sort models");
      [["input-asc","Input: low to high"],["input-desc","Input: high to low"],["output-asc","Output: low to high"],["output-desc","Output: high to low"],["name-asc","Name: A–Z"]].forEach(([value,label]) => {
        const option = el("option", "", label); option.value = value; sortSelect.appendChild(option);
      });
      sortSelect.value = sortMode;
      sortSelect.addEventListener("change", e => {
        sortMode = e.target.value; saveSetting(SORT_STORAGE_KEY, sortMode); renderLists();
      });
      toolbar.append(searchInput, select, sortSelect);
      app.append(toolbar);

      const pinned = el("div", "pinned-list");
      app.append(pinned);
      const lists = el("div", "lists");
      app.append(lists);
      function renderLists() {
        pinned.replaceChildren();
        lists.replaceChildren();
        if (filter === "all" || filter === "watchlist") {
          const pinnedModels = models.filter(m => watchlist.includes(m.model_name));
          if (pinnedModels.length) {
            pinned.append(el("div", "section", "Pinned models"));
            pinnedModels.sort((a,b) => (a.model_name || "").localeCompare(b.model_name || ""));
            pinnedModels.forEach(m => addModelCard(pinned, m));
          }
        }
        const q = search.trim().toLowerCase();
        let visible = models.filter(m => {
          const matches = (m.model_name + " " + (m.vendor || "") + " " + (m.type || "")).toLowerCase().includes(q);
          if (!matches) return false;
          if (filter === "watchlist" || (filter === "all" && watchlist.includes(m.model_name))) return false;
          if (filter === "free") return !!m.is_free;
          if (filter === "paid") return !m.is_free;
          if (filter === "online") return !!m.online;
          return true;
        });
        if (filter === "watchlist") {
          lists.append(el("div", "section", "Pinned models"));
        } else {
          lists.append(el("div", "section", "Models (" + visible.length + ")"));
        }
        if (!visible.length) {
          if (filter === "watchlist" && pinned.childElementCount) return;
          lists.append(el("div", "empty", filter === "watchlist" ? "No pinned models yet. Switch to All models and tap ☆ beside a model." : "No models match this search."));
          return;
        }
        visible.sort(compareModels);
        visible.forEach(m => addModelCard(lists, m));
      }
      renderLists();
    }

    const refreshDescription = refreshInterval === 0 ? "Auto-refresh is off; use Refresh to update prices manually." : "Auto-refreshes every " + (REFRESH_OPTIONS.find(([value]) => Number(value) === refreshInterval)?.[1] || "custom interval") + " while this browser page is visible.";
    app.append(el("div", "foot", "Prices are UnoRouter's current routed prices in USD per 1 million tokens, not necessarily each provider's list price. The catalogue is public; this extension does not use or store your API keys. " + refreshDescription));
  }

  const pending = new Map();
  let requestCounter = 0;

  const unsubscribeBackend = ctx.onBackendMessage((payload) => {
    if (!payload || payload.type !== "catalog_result") return;
    const request = pending.get(payload.requestId);
    if (!request) return;
    pending.delete(payload.requestId);
    loading = false;
    if (payload.error) {
      errorMessage = "Couldn't load prices. " + payload.error;
    } else {
      try {
        const data = payload.data;
        if (!data || !Array.isArray(data.models)) throw new Error("Unexpected catalogue response.");
        models = data.models;
        lastUpdated = new Date();
        errorMessage = "";
      } catch (err) {
        errorMessage = "Couldn't read UnoRouter's catalogue. " + (err.message || String(err));
      }
    }
    render();
    scheduleAutoRefresh();
  });

  function compareModels(a,b) {
    if (sortMode === "name-asc") return (a.model_name || "").localeCompare(b.model_name || "");
    const field = sortMode.startsWith("output") ? "output_price" : "input_price";
    const direction = sortMode.endsWith("desc") ? -1 : 1;
    const av = Number(a[field]), bv = Number(b[field]);
    const aValid = a[field] !== null && a[field] !== undefined && Number.isFinite(av);
    const bValid = b[field] !== null && b[field] !== undefined && Number.isFinite(bv);
    if (!aValid && !bValid) return (a.model_name || "").localeCompare(b.model_name || "");
    if (!aValid) return 1;
    if (!bValid) return -1;
    return (av-bv)*direction || (a.model_name || "").localeCompare(b.model_name || "");
  }

  function scheduleAutoRefresh() {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = null;
    if (destroyed || refreshInterval <= 0 || document.visibilityState === "hidden") return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      if (document.visibilityState !== "hidden") loadCatalog();
    }, refreshInterval);
  }

  async function loadCatalog() {
    if (loading) return;
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = null;
    loading = true;
    errorMessage = "";
    render();
    const requestId = "catalog-" + Date.now() + "-" + (++requestCounter);
    pending.set(requestId, true);
    try {
      ctx.sendToBackend({ type: "fetch_catalog", requestId });
    } catch (err) {
      pending.delete(requestId);
      loading = false;
      errorMessage = "Couldn't contact the extension backend. " + (err && err.message ? err.message : String(err));
      render();
      scheduleAutoRefresh();
    }
  }

  // Lumiverse exposes safe connection summaries (never API keys or endpoint secrets).
  function syncActiveConnection(connection) {
    activeConnection = connection || null;
    activeProfileName = null;
    try {
      const profiles = ctx.connections && typeof ctx.connections.list === "function"
        ? ctx.connections.list()
        : [];
      const active = Array.isArray(profiles)
        ? profiles.find(profile => profile.active || profile.id === activeConnection?.activeProfileId)
        : null;
      if (active) activeProfileName = active.name || null;
    } catch {}
    render();
  }
  try {
    if (ctx.connections && typeof ctx.connections.getActive === "function") {
      syncActiveConnection(ctx.connections.getActive());
    }
  } catch {}
  let unsubscribeConnection = null;
  try {
    if (ctx.connections && typeof ctx.connections.subscribe === "function") {
      unsubscribeConnection = ctx.connections.subscribe(connection => {
        syncActiveConnection(connection);
      });
    }
  } catch {}

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      refreshTimer = null;
    } else if (refreshInterval > 0 && (!lastUpdated || Date.now()-lastUpdated.getTime() >= refreshInterval)) {
      loadCatalog();
    } else {
      scheduleAutoRefresh();
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);

  render();
  loadCatalog();
  const unsubscribe = tab.onActivate(() => {
    if (!lastUpdated || (refreshInterval > 0 && Date.now()-lastUpdated.getTime() >= refreshInterval)) loadCatalog();
    else scheduleAutoRefresh();
  });

  return () => {
    destroyed = true;
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (typeof unsubscribe === "function") unsubscribe();
    if (typeof unsubscribeBackend === "function") unsubscribeBackend();
    if (typeof unsubscribeConnection === "function") unsubscribeConnection();
    pending.clear();
    tab.destroy();
    style.remove();
  };
}
