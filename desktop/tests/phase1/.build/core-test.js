(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ui/src/core/install.js
  var install_exports = {};
  __export(install_exports, {
    installAll: () => installAll,
    refreshBadge: () => refreshBadge
  });

  // ui/src/core/store.js
  var store_exports = {};
  __export(store_exports, {
    MAIN_KEY: () => MAIN_KEY,
    dataVersion: () => dataVersion,
    installStore: () => installStore,
    onData: () => onData,
    touch: () => touch
  });

  // ui/src/core/util.js
  function createBus() {
    const fns = /* @__PURE__ */ new Set();
    return {
      on(fn) {
        fns.add(fn);
        return () => fns.delete(fn);
      },
      emit(...a) {
        fns.forEach((f) => {
          try {
            f(...a);
          } catch (e) {
            console.error("[AmanUI]", e);
          }
        });
      }
    };
  }
  var lsGet = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  };
  var lsSet = (k, v) => {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch (e) {
      return false;
    }
  };
  function debounce(fn, ms2) {
    let t = 0;
    const d = (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms2);
    };
    d.cancel = () => clearTimeout(t);
    d.flush = (...a) => {
      clearTimeout(t);
      fn(...a);
    };
    return d;
  }
  var typing = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.isContentEditable);
  var isHex = (s) => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

  // ui/src/core/store.js
  var MAIN_KEY = "ins_sys_v1";
  var bus = createBus();
  var ver = 0;
  var timer = 0;
  var hooked = false;
  var dataVersion = () => ver;
  var onData = (fn) => bus.on(fn);
  function touch() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = 0;
      ver++;
      bus.emit(ver);
    }, 30);
  }
  function installStore() {
    if (hooked) return;
    hooked = true;
    const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k) {
      const r = si.apply(this, arguments);
      if (this === localStorage && k === MAIN_KEY) touch();
      return r;
    };
  }

  // ui/src/core/prefs.js
  var prefs_exports = {};
  __export(prefs_exports, {
    BGS: () => BGS,
    FONTS: () => FONTS,
    NAV_PROTECTED: () => NAV_PROTECTED,
    PREFS_KEY: () => PREFS_KEY,
    SIZES: () => SIZES,
    THEMES: () => THEMES,
    VIEW_MODES: () => VIEW_MODES,
    applyPrefs: () => applyPrefs,
    buildCss: () => buildCss,
    clearHistory: () => clearHistory,
    getAlertPrefs: () => getAlertPrefs,
    getForm: () => getForm,
    getHistory: () => getHistory,
    getPrefs: () => getPrefs,
    getViewMode: () => getViewMode,
    isDefaultColors: () => isDefaultColors,
    isNavHidden: () => isNavHidden,
    listViews: () => listViews,
    onPrefs: () => onPrefs,
    pushHistory: () => pushHistory,
    rememberPage: () => rememberPage,
    removeHistory: () => removeHistory,
    removeView: () => removeView,
    resetAppearance: () => resetAppearance,
    resolveStart: () => resolveStart,
    saveView: () => saveView,
    setAlertPrefs: () => setAlertPrefs,
    setColors: () => setColors,
    setForm: () => setForm,
    setNavHidden: () => setNavHidden,
    setPrefs: () => setPrefs,
    setTheme: () => setTheme,
    setViewMode: () => setViewMode
  });
  var PREFS_KEY = "ins_ui_prefs";
  var NAV_PROTECTED = ["dash", "set"];
  var THEMES = {
    plum: { name: "\u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A (\u0628\u0646\u0641\u0633\u062C\u064A)", pri: "#7c3aed", pri2: "#0d9488" },
    royal: { name: "\u0623\u0632\u0631\u0642 \u0645\u0644\u0643\u064A", pri: "#2b4fc4", pri2: "#0b8aa6" },
    emerald: { name: "\u0623\u062E\u0636\u0631 \u0632\u0645\u0631\u062F\u064A", pri: "#0b8a63", pri2: "#0e7490" }
  };
  var BGS = {
    default: { name: "\u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629" },
    cool: { name: "\u0633\u0645\u0627\u0648\u064A\u0629 \u0647\u0627\u062F\u0626\u0629", l: "#eef2f8", d: "#0e1320" },
    warm: { name: "\u062F\u0627\u0641\u0626\u0629", l: "#f7f3ec", d: "#16120e" },
    pure: { name: "\u0646\u0642\u064A\u0629", l: "#ffffff", d: "#08080c" }
  };
  var FONTS = {
    cairo: { name: "Cairo (\u0627\u0644\u0623\u0635\u0644\u064A)", css: "Cairo,Tahoma,Arial,sans-serif" },
    plex: { name: "IBM Plex Sans Arabic", css: "'IBM Plex Sans Arabic',Cairo,Tahoma,sans-serif" },
    system: { name: "\u062E\u0637 \u0627\u0644\u0646\u0638\u0627\u0645", css: "'Segoe UI',Tahoma,Arial,sans-serif" }
  };
  var SIZES = [{ k: 90, l: "\u0635\u063A\u064A\u0631" }, { k: 100, l: "\u0639\u0627\u062F\u064A" }, { k: 112, l: "\u0643\u0628\u064A\u0631" }, { k: 125, l: "\u0643\u0628\u064A\u0631 \u062C\u062F\u064B\u0627" }];
  var VIEW_MODES = { req: ["kanban", "list"], cars: ["cards", "table"] };
  var DEFAULTS = {
    v: 1,
    theme: "plum",
    primary: "#7c3aed",
    secondary: "#0d9488",
    bg: "default",
    font: "cairo",
    size: 100,
    hideNav: [],
    start: "dash",
    last: "dash",
    view: {},
    views: [],
    search: [],
    // المرحلة 2 — لوحة التحكم: co الشركة (فارغ = الكل) • per الفترة بالأشهر • auto تحديث تلقائي • summary ملخص يومي عند الفتح • sumDay آخر يوم عُرض فيه الملخص
    dash: { co: "", per: 12, auto: true, summary: true, sumDay: "" },
    // المرحلة 3 — نموذج الموظف: review = عرض شاشة المراجعة قبل كل حفظ
    form: { review: true },
    // المرحلة 4 — التنبيهات: fileDays مهلة تقديم الطلب بالأيام (61) • retDays نافذة التنبيه قبل سن المعاش بالأيام (60) • off أنواع تنبيهات مُوقَفة
    alerts: { fileDays: 7, retDays: 180, off: [] }
  };
  var ID_RE = /^[a-z0-9_-]{1,24}$/i;
  var bus2 = createBus();
  function sanitize(o) {
    const p = JSON.parse(JSON.stringify(DEFAULTS));
    if (!o || typeof o !== "object") return p;
    if (THEMES[o.theme] || o.theme === "custom") p.theme = o.theme;
    if (isHex(o.primary)) p.primary = o.primary.toLowerCase();
    if (isHex(o.secondary)) p.secondary = o.secondary.toLowerCase();
    if (BGS[o.bg]) p.bg = o.bg;
    if (FONTS[o.font]) p.font = o.font;
    if (SIZES.some((s) => s.k === +o.size)) p.size = +o.size;
    if (Array.isArray(o.hideNav)) p.hideNav = [...new Set(o.hideNav.filter((x) => typeof x === "string" && ID_RE.test(x) && !NAV_PROTECTED.includes(x)))];
    if (typeof o.start === "string" && (o.start === "last" || ID_RE.test(o.start))) p.start = o.start;
    if (typeof o.last === "string" && ID_RE.test(o.last)) p.last = o.last;
    if (o.view && typeof o.view === "object") Object.keys(VIEW_MODES).forEach((k) => {
      if (VIEW_MODES[k].includes(o.view[k])) p.view[k] = o.view[k];
    });
    if (Array.isArray(o.views)) {
      p.views = o.views.filter((v) => v && typeof v.id === "string" && typeof v.name === "string" && typeof v.page === "string" && v.state && typeof v.state === "object").map((v) => ({ id: v.id.slice(0, 30), page: v.page.slice(0, 20), name: v.name.slice(0, 40), state: v.state, at: +v.at || 0 })).slice(-30);
    }
    if (o.dash && typeof o.dash === "object") {
      const d = o.dash;
      if (typeof d.co === "string" && d.co.length <= 40) p.dash.co = d.co;
      if ([3, 6, 12].includes(+d.per)) p.dash.per = +d.per;
      if (typeof d.auto === "boolean") p.dash.auto = d.auto;
      if (typeof d.summary === "boolean") p.dash.summary = d.summary;
      if (typeof d.sumDay === "string" && /^\d{4}-\d\d-\d\d$/.test(d.sumDay)) p.dash.sumDay = d.sumDay;
    }
    if (o.form && typeof o.form === "object" && typeof o.form.review === "boolean") p.form.review = o.form.review;
    if (o.alerts && typeof o.alerts === "object") {
      const a = o.alerts, n = (v, lo, hi) => Number.isFinite(+v) && +v >= lo && +v <= hi ? Math.round(+v) : null;
      const fd = n(a.fileDays, 1, 60), rd = n(a.retDays, 30, 730);
      if (fd !== null) p.alerts.fileDays = fd;
      if (rd !== null) p.alerts.retDays = rd;
      if (Array.isArray(a.off)) p.alerts.off = [...new Set(a.off.filter((x) => typeof x === "string" && ID_RE.test(x)))];
    }
    if (Array.isArray(o.search)) p.search = o.search.filter((x) => typeof x === "string" && x.trim()).map((x) => x.slice(0, 80)).slice(0, 12);
    return p;
  }
  function load() {
    try {
      return sanitize(JSON.parse(lsGet(PREFS_KEY, "null")));
    } catch (e) {
      return sanitize(null);
    }
  }
  var P = load();
  var persist = () => lsSet(PREFS_KEY, JSON.stringify(P));
  var getPrefs = () => JSON.parse(JSON.stringify(P));
  var onPrefs = (fn) => bus2.on(fn);
  var isDefaultColors = (p) => p.primary === THEMES.plum.pri && p.secondary === THEMES.plum.pri2;
  var mix = (c, pct, base) => `color-mix(in srgb,${c} ${pct}%,${base})`;
  var modeVars = (light, dark) => `html:root,html:root[data-theme="light"]{${light}}html:root[data-theme="dark"]{${dark}}@media (prefers-color-scheme:dark){html:root:not([data-theme="light"]){${dark}}}`;
  function buildCss(p) {
    let css = "";
    if (!isDefaultColors(p)) {
      const P2 = p.primary, S2 = p.secondary;
      const sh = { 50: mix(P2, 8, "#fff"), 100: mix(P2, 16, "#fff"), 200: mix(P2, 32, "#fff"), 300: mix(P2, 52, "#fff"), 400: mix(P2, 74, "#fff"), 500: P2, 600: mix(P2, 88, "#000"), 700: mix(P2, 74, "#000"), 800: mix(P2, 58, "#000"), 900: mix(P2, 42, "#000"), 950: mix(P2, 28, "#000") };
      css += `html:root{${Object.keys(sh).map((k) => `--p-primary-${k}:${sh[k]}`).join(";")}}`;
      css += modeVars(
        `--pri:${P2};--pri2:${S2};--pri-glow:${mix(P2, 15, "transparent")};--acc-glow:${mix(S2, 15, "transparent")}`,
        `--pri:${mix(P2, 78, "#fff")};--pri2:${mix(S2, 78, "#fff")};--pri-glow:${mix(P2, 25, "transparent")};--acc-glow:${mix(S2, 25, "transparent")}`
      );
      const dark = mix("var(--pri)", 80, "#000");
      css += `.hero{background:linear-gradient(120deg,${dark},var(--pri) 40%,var(--pri2))!important}`;
      css += `.lside{background:linear-gradient(135deg,${mix("var(--pri)", 55, "#000")},var(--pri) 55%,var(--pri2))!important}`;
      css += `#splash{background:linear-gradient(135deg,#100e17,${mix("var(--pri)", 40, "#000")} 55%,${mix("var(--pri2)", 40, "#000")})!important}`;
      css += `#chatfab{background:linear-gradient(135deg,var(--pri),var(--pri2))!important}#chatfab .pl{border-color:var(--pri2)!important}`;
      css += `.chd{background:linear-gradient(135deg,${dark},var(--pri) 50%,var(--pri2))!important}.cph{background:linear-gradient(135deg,${dark},var(--pri2))!important}`;
      css += `.kpi .ic[style*="#714b67"]{background:linear-gradient(135deg,var(--pri),${mix("var(--pri)", 73, "transparent")})!important}`;
      css += `.kpi .ic[style*="#017e84"]{background:linear-gradient(135deg,var(--pri2),${mix("var(--pri2)", 73, "transparent")})!important}`;
    }
    if (p.bg !== "default" && BGS[p.bg]) css += modeVars(`--bg:${BGS[p.bg].l}`, `--bg:${BGS[p.bg].d}`);
    if (p.font !== "cairo") {
      const f = FONTS[p.font].css;
      css += `html:root{--p-font-family:${f}}body,.p-component{font-family:${f}}`;
    }
    if (p.size !== 100) css += `html:root{font-size:${(16 * p.size / 100).toFixed(2)}px}body{font-size:${(14 * p.size / 100).toFixed(2)}px}`;
    if (p.hideNav.length) css += `${p.hideNav.map((id) => `#nav .ni[onclick="nv('${id}')"]`).join(",")}{display:none!important}`;
    return css;
  }
  function applyPrefs() {
    if (typeof document === "undefined") return;
    let st = document.getElementById("aman-ui-prefs");
    if (!st) {
      st = document.createElement("style");
      st.id = "aman-ui-prefs";
      document.head.appendChild(st);
    }
    st.textContent = buildCss(P);
    document.documentElement.dataset.amanTheme = P.theme;
  }
  function setPrefs(patch) {
    P = sanitize({ ...P, ...patch });
    persist();
    applyPrefs();
    bus2.emit(getPrefs());
    return getPrefs();
  }
  function setTheme(id) {
    const t = THEMES[id];
    if (!t) return getPrefs();
    return setPrefs({ theme: id, primary: t.pri, secondary: t.pri2 });
  }
  function setColors(primary, secondary) {
    const m = Object.keys(THEMES).find((k) => THEMES[k].pri === primary && THEMES[k].pri2 === secondary);
    return setPrefs({ primary, secondary, theme: m || "custom" });
  }
  var resetAppearance = () => setPrefs({ theme: "plum", primary: THEMES.plum.pri, secondary: THEMES.plum.pri2, bg: "default", font: "cairo", size: 100 });
  function setNavHidden(id, hidden) {
    if (NAV_PROTECTED.includes(id)) return getPrefs();
    const s = new Set(P.hideNav);
    hidden ? s.add(id) : s.delete(id);
    return setPrefs({ hideNav: [...s] });
  }
  var isNavHidden = (id) => P.hideNav.includes(id);
  function rememberPage(id) {
    if (!ID_RE.test(String(id)) || P.last === id) return;
    P.last = id;
    persist();
  }
  function resolveStart(validIds) {
    const want = P.start === "last" ? P.last : P.start;
    return validIds.includes(want) && !P.hideNav.includes(want) ? want : "dash";
  }
  var getViewMode = (page) => P.view[page] || "";
  function setViewMode(page, mode) {
    if (!VIEW_MODES[page] || !VIEW_MODES[page].includes(mode) || P.view[page] === mode) return;
    P.view = { ...P.view, [page]: mode };
    persist();
  }
  var listViews = (page) => P.views.filter((v) => v.page === page).map((v) => ({ ...v, state: JSON.parse(JSON.stringify(v.state)) }));
  function saveView(page, name, state) {
    name = String(name || "").trim().slice(0, 40);
    if (!name) return null;
    const rest = P.views.filter((v2) => !(v2.page === page && v2.name === name));
    const v = { id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), page, name, state: JSON.parse(JSON.stringify(state || {})), at: Date.now() };
    setPrefs({ views: [...rest, v].slice(-30) });
    return v.id;
  }
  var removeView = (id) => setPrefs({ views: P.views.filter((v) => v.id !== id) });
  var getHistory = () => P.search.slice();
  function pushHistory(q) {
    q = String(q || "").trim().slice(0, 80);
    if (q.length < 2) return;
    if (P.search[0] === q) return;
    P.search = [q, ...P.search.filter((x) => x !== q)].slice(0, 12);
    persist();
    bus2.emit(getPrefs());
  }
  var removeHistory = (q) => setPrefs({ search: P.search.filter((x) => x !== q) });
  var clearHistory = () => setPrefs({ search: [] });
  var getForm = () => ({ ...P.form });
  var setForm = (patch) => setPrefs({ form: { ...P.form, ...patch } });
  var getAlertPrefs = () => ({ ...P.alerts, off: [...P.alerts.off] });
  var setAlertPrefs = (patch) => setPrefs({ alerts: { ...P.alerts, ...patch } });

  // ui/src/core/notify.js
  var notify_exports = {};
  __export(notify_exports, {
    _reset: () => _reset,
    classify: () => classify,
    clearHistory: () => clearHistory2,
    dismiss: () => dismiss,
    getHistory: () => getHistory2,
    getToasts: () => getToasts,
    markAllRead: () => markAllRead,
    notify: () => notify,
    onHistory: () => onHistory,
    onToasts: () => onToasts,
    pause: () => pause,
    resume: () => resume,
    runAction: () => runAction,
    unreadCount: () => unreadCount
  });
  var DUR = { success: 3500, info: 4500, warn: 6500, error: 9e3 };
  var MAX_ACTIVE = 4;
  var MAX_HISTORY = 40;
  var toastBus = createBus();
  var histBus = createBus();
  var seq = 0;
  var active = [];
  var history = [];
  var snapshot = () => active.map(({ timer: timer2, ...r }) => r);
  function classify(msg, ok) {
    if (ok) return "success";
    const s = String(msg || "");
    if (/^(لم يتم|تعذر|تعذّر|فشل|خطأ|حدث خطأ)|فشل|خطأ/.test(s)) return "error";
    return "warn";
  }
  function arm(t) {
    clearTimeout(t.timer);
    if (t.sticky) return;
    t.since = Date.now();
    t.timer = setTimeout(() => dismiss(t.id), t.left);
  }
  function notify(msg, type, opts) {
    opts = opts || {};
    type = DUR[type] ? type : "info";
    msg = String(msg == null ? "" : msg);
    if (!msg) return 0;
    const now = Date.now();
    const dup = active.find((t2) => t2.msg === msg && t2.type === type);
    if (dup && !opts.action) {
      dup.count++;
      dup.t = now;
      dup.left = dup.dur;
      arm(dup);
      const h = history.find((x) => x.id === dup.hid);
      if (h) {
        h.count = dup.count;
        h.at = now;
      }
      toastBus.emit(snapshot());
      histBus.emit(getHistory2());
      return dup.id;
    }
    const id = ++seq;
    const dur = opts.duration || DUR[type];
    const t = { id, hid: id, msg, type, count: 1, sticky: !!opts.sticky, action: opts.action || null, t: now, dur, left: dur, timer: 0, since: 0 };
    active.push(t);
    while (active.length > MAX_ACTIVE) {
      const o = active.shift();
      clearTimeout(o.timer);
    }
    arm(t);
    history.unshift({ id, msg, type, at: now, count: 1, read: false });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    toastBus.emit(snapshot());
    histBus.emit(getHistory2());
    return id;
  }
  function dismiss(id) {
    const i = active.findIndex((t) => t.id === id);
    if (i < 0) return;
    clearTimeout(active[i].timer);
    active.splice(i, 1);
    toastBus.emit(snapshot());
  }
  function pause(id) {
    const t = active.find((x) => x.id === id);
    if (!t || t.sticky || !t.timer) return;
    clearTimeout(t.timer);
    t.timer = 0;
    t.left = Math.max(1200, t.left - (Date.now() - t.since));
  }
  function resume(id) {
    const t = active.find((x) => x.id === id);
    if (t && !t.sticky && !t.timer) arm(t);
  }
  function runAction(id) {
    const t = active.find((x) => x.id === id);
    if (!t || !t.action) return;
    try {
      t.action.fn();
    } catch (e) {
      console.error("[AmanUI]", e);
    }
    dismiss(id);
  }
  var getToasts = () => snapshot();
  var onToasts = (fn) => toastBus.on(fn);
  var getHistory2 = () => history.map((h) => ({ ...h }));
  var onHistory = (fn) => histBus.on(fn);
  var unreadCount = () => history.filter((h) => !h.read).length;
  function markAllRead() {
    if (!history.some((h) => !h.read)) return;
    history.forEach((h) => {
      h.read = true;
    });
    histBus.emit(getHistory2());
  }
  function clearHistory2() {
    history = [];
    histBus.emit(getHistory2());
  }
  function _reset() {
    active.forEach((t) => clearTimeout(t.timer));
    active = [];
    history = [];
    seq = 0;
  }

  // ui/src/core/search.js
  var search_exports = {};
  __export(search_exports, {
    advCount: () => advCount,
    advPredicate: () => advPredicate,
    clearAdv: () => clearAdv,
    distinctJobs: () => distinctJobs,
    getAdv: () => getAdv,
    onAdv: () => onAdv,
    setAdv: () => setAdv,
    suggestNames: () => suggestNames,
    suggestions: () => suggestions
  });

  // ui/src/core/legacy.js
  var getS = () => typeof S !== "undefined" ? S : null;
  var emps = () => {
    const s = getS();
    return s && Array.isArray(s.emps) ? s.emps : [];
  };
  var norm = (x) => typeof nz === "function" ? nz(x) : String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  var curPage = () => typeof cur !== "undefined" ? cur : "";
  var navGroups = () => typeof NAV !== "undefined" && Array.isArray(NAV) ? NAV : [];
  var navItems = () => {
    const o = [];
    navGroups().forEach((g) => (g[1] || []).forEach((x) => o.push({ id: x[0], icon: x[1], title: x[2], group: g[0] })));
    return o;
  };

  // ui/src/core/search.js
  var cache = /* @__PURE__ */ new WeakMap();
  function normOf(e) {
    const raw = e.name;
    let c = cache.get(e);
    if (!c || c.raw !== raw) {
      const name = String(raw == null ? "" : raw).trim();
      c = { raw, name, n: norm(name) };
      cache.set(e, c);
    }
    return c;
  }
  function suggestNames(q, limit) {
    limit = limit || 8;
    const nq = norm(q);
    if (!nq) return [];
    const toks = nq.split(" ").filter(Boolean);
    const out = [];
    for (const e of emps()) {
      const it = normOf(e);
      if (!it.name || !toks.every((t) => it.n.includes(t))) continue;
      let sc = it.n.startsWith(toks[0]) ? 3 : it.n.split(" ").some((w) => w.startsWith(toks[0])) ? 2 : 1;
      if (e.status === "active") sc += 0.5;
      out.push([sc, it.name]);
    }
    out.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1], "ar"));
    const seen = /* @__PURE__ */ new Set(), res = [];
    for (const [, name] of out) {
      if (seen.has(name)) continue;
      seen.add(name);
      res.push(name);
      if (res.length >= limit) break;
    }
    return res;
  }
  function suggestions(q, limit) {
    limit = limit || 8;
    const nq = norm(q);
    const hist = getHistory();
    if (!nq) return hist.slice(0, 6).map((t) => ({ kind: "hist", text: t }));
    const h = hist.filter((t) => {
      const n = norm(t);
      return n.includes(nq) && n !== nq;
    }).slice(0, 3).map((t) => ({ kind: "hist", text: t }));
    const names = suggestNames(q, limit).filter((n) => norm(n) !== nq).map((t) => ({ kind: "name", text: t }));
    return [...h, ...names].slice(0, limit);
  }
  var ADV0 = { job: "", wmin: "", wmax: "", dfrom: "", dto: "", docs: "" };
  var ADV = { ...ADV0 };
  var advBus = createBus();
  var getAdv = () => ({ ...ADV });
  var onAdv = (fn) => advBus.on(fn);
  function setAdv(patch) {
    const n = { ...ADV };
    Object.keys(ADV0).forEach((k) => {
      if (patch && k in patch) n[k] = patch[k] == null ? "" : String(patch[k]);
    });
    if (!["", "has", "none"].includes(n.docs)) n.docs = "";
    ADV = n;
    advBus.emit(getAdv());
  }
  var clearAdv = () => setAdv(ADV0);
  var advCount = () => Object.keys(ADV0).filter((k) => ADV[k] !== "").length;
  function advPredicate(e) {
    const a = ADV;
    if (a.job && String(e.job || "") !== a.job) return false;
    const w = +e.wage || 0;
    if (a.wmin !== "" && w < +a.wmin) return false;
    if (a.wmax !== "" && w > +a.wmax) return false;
    if (a.dfrom && (!e.start || e.start < a.dfrom)) return false;
    if (a.dto && (!e.start || e.start > a.dto)) return false;
    const nd = (e.docs || []).length;
    if (a.docs === "has" && !nd) return false;
    if (a.docs === "none" && nd) return false;
    return true;
  }
  var distinctJobs = () => [...new Set(emps().map((e) => String(e.job || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));

  // ui/src/core/shortcuts.js
  var shortcuts_exports = {};
  __export(shortcuts_exports, {
    GO_KEYS: () => GO_KEYS,
    SHORTCUTS: () => SHORTCUTS,
    installShortcuts: () => installShortcuts,
    onKey: () => onKey,
    onSeq: () => onSeq
  });

  // ui/src/core/host.js
  var host = { ready: false, toggleBell() {
  }, closeBell() {
  }, openSearch() {
  }, openHelp() {
  }, seqHint() {
  }, openSummary() {
  }, maybeSummary() {
  }, openEmpForm: null, openEmpFile: null };

  // ui/src/core/shortcuts.js
  var GO_KEYS = { KeyD: "dash", KeyE: "emp", KeyC: "comp", KeyQ: "req", KeyM: "rec", KeyF: "fin", KeyL: "log", KeyS: "set", KeyT: "asst", KeyA: "cars", KeyP: "frm" };
  var SHORTCUTS = [
    { keys: ["Ctrl", "K"], desc: "\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0633\u0631\u064A\u0639 (\u0645\u0648\u0638\u0641\u0648\u0646\u060C \u0634\u0631\u0643\u0627\u062A\u060C \u0635\u0641\u062D\u0627\u062A)" },
    { keys: ["/"], desc: "\u0627\u0644\u062A\u0631\u0643\u064A\u0632 \u0639\u0644\u0649 \u062E\u0627\u0646\u0629 \u0627\u0644\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629" },
    { keys: ["N"], desc: "\u0625\u0636\u0627\u0641\u0629 \u062C\u062F\u064A\u062F \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 (\u0645\u0648\u0638\u0641 / \u0634\u0631\u0643\u0629 / \u0637\u0644\u0628 / \u0645\u0647\u0645\u0629 / \u0633\u064A\u0627\u0631\u0629)" },
    { keys: ["G", "\u062B\u0645 D"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645" },
    { keys: ["G", "\u062B\u0645 E"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0627\u0644\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647\u0645" },
    { keys: ["G", "\u062B\u0645 C"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0644\u0634\u0631\u0643\u0627\u062A" },
    { keys: ["G", "\u062B\u0645 Q"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644" },
    { keys: ["G", "\u062B\u0645 M"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0645\u0637\u0627\u0628\u0642\u0629 \u0643\u0634\u0648\u0641 \u0627\u0644\u0645\u0631\u062A\u0628\u0627\u062A" },
    { keys: ["G", "\u062B\u0645 F"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629" },
    { keys: ["G", "\u062B\u0645 P"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0633\u062A\u0645\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u0623\u0645\u064A\u0646\u0627\u062A" },
    { keys: ["G", "\u062B\u0645 T"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0644\u0645\u0647\u0627\u0645" },
    { keys: ["G", "\u062B\u0645 A"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A" },
    { keys: ["G", "\u062B\u0645 L"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0633\u062C\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A" },
    { keys: ["G", "\u062B\u0645 S"], desc: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A" },
    { keys: ["Ctrl", "S"], desc: "\u062D\u0641\u0638 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 (\u0632\u0631 \xAB\u062D\u0641\u0638\xBB)" },
    { keys: ["Alt", "T"], desc: "\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0641\u0627\u062A\u062D / \u0627\u0644\u062F\u0627\u0643\u0646" },
    { keys: ["Alt", "B"], desc: "\u0641\u062A\u062D \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A" },
    { keys: ["Esc"], desc: "\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0623\u0648 \u0627\u0644\u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629" },
    { keys: ["?"], desc: "\u0639\u0631\u0636 \u0647\u0630\u0647 \u0627\u0644\u0642\u0627\u0626\u0645\u0629" }
  ];
  function newItem() {
    const p = curPage();
    const map = { emp: () => editE(), comp: () => editC(), req: () => editQ(), asst: () => editT(), cars: () => editCar() };
    const fn = map[p];
    if (!fn) return false;
    try {
      fn();
      return true;
    } catch (e) {
      return false;
    }
  }
  function focusSearch() {
    const root = document.getElementById("view");
    if (!root) return false;
    const q = [...root.querySelectorAll("input")].find((i) => !i.disabled && i.type !== "file" && i.type !== "checkbox" && i.type !== "hidden" && i.offsetParent !== null && /بحث|search/i.test(i.placeholder || ""));
    if (!q) return false;
    q.focus();
    q.select && q.select();
    return true;
  }
  var bus3 = createBus();
  var onSeq = (fn) => bus3.on(fn);
  var seqTimer = 0;
  var seqOn = false;
  var endSeq = () => {
    clearTimeout(seqTimer);
    if (seqOn) {
      seqOn = false;
      bus3.emit(false);
    }
  };
  var blocked = () => document.body.classList.contains("lo");
  var modalOpen = () => {
    const m = document.getElementById("modal");
    return !!(m && m.classList.contains("on")) || !!document.querySelector(".ef-ov");
  };
  var installed = false;
  function onKey(e) {
    if (e.defaultPrevented || blocked()) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.code === "KeyS" && modalOpen()) {
      const ok = document.querySelector(".ef-ov [data-ef-save]") || document.getElementById("ok");
      if (ok) {
        e.preventDefault();
        ok.click();
      }
      return;
    }
    if (e.altKey && !ctrl && e.code === "KeyT") {
      e.preventDefault();
      if (typeof th === "function") th();
      return;
    }
    if (e.altKey && !ctrl && e.code === "KeyB") {
      e.preventDefault();
      host.toggleBell();
      return;
    }
    if (ctrl || e.altKey) return;
    if (typing(e.target) || typing(document.activeElement)) return;
    if (seqOn) {
      const id = GO_KEYS[e.code];
      endSeq();
      if (id && navItems().some((x) => x.id === id)) {
        e.preventDefault();
        if (typeof nv === "function") nv(id);
      }
      return;
    }
    if (e.code === "KeyG" && !e.shiftKey) {
      e.preventDefault();
      seqOn = true;
      bus3.emit(true);
      seqTimer = setTimeout(endSeq, 1500);
      return;
    }
    if (e.key === "?" || e.code === "Slash" && e.shiftKey) {
      e.preventDefault();
      host.openHelp();
      return;
    }
    if (e.code === "Slash" && !e.shiftKey) {
      if (focusSearch()) e.preventDefault();
      return;
    }
    if (e.code === "KeyN" && !e.shiftKey && !modalOpen()) {
      if (newItem()) e.preventDefault();
      return;
    }
  }
  function installShortcuts() {
    if (installed) return;
    installed = true;
    document.addEventListener("keydown", onKey);
  }

  // ui/src/core/dash.js
  var EXP_FIELDS = [["licExp", "\u0631\u062E\u0635\u0629 \u0627\u0644\u0633\u064A\u0627\u0631\u0629"], ["insExp", "\u0627\u0644\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u0625\u062C\u0628\u0627\u0631\u064A"], ["inspExp", "\u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0641\u0646\u064A"]];
  function expiries() {
    const out = [], t0 = /* @__PURE__ */ new Date(today() + "T00:00:00");
    CS().forEach((c) => EXP_FIELDS.forEach(([k, l]) => {
      const d = c[k];
      if (!d) return;
      const n = Math.ceil((/* @__PURE__ */ new Date(d + "T00:00:00") - t0) / 864e5);
      if (isNaN(n)) return;
      out.push({ id: c.id + k, car: c.id, plate: c.plate || "\u2014", what: l, date: d, days: n, sev: n <= 7 ? "r" : n <= 30 ? "w" : "a" });
    }));
    return out.sort((a, b) => a.days - b.days);
  }

  // ui/src/core/alerts.js
  var RET_WOMEN = 55;
  var dig = (s) => String(s == null ? "" : s).replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632);
  var ms = (iso) => (/* @__PURE__ */ new Date(iso + "T00:00:00")).getTime();
  var dayN = (iso) => Math.round((ms(iso) - ms(today())) / 864e5);
  var addYears = (iso, n) => {
    const [y, m, d] = iso.split("-").map(Number);
    const t = new Date(y + n, m - 1, d);
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  };
  function retireInfo(e) {
    const A = window.a9;
    if (!A || typeof A.nid !== "function" || !e || !e.nid) return null;
    const n = A.nid(dig(e.nid));
    if (!n || !n.valid || !n.birth) return null;
    const men = S.cfg && +S.cfg.retAge || 60;
    const age = n.gender === "\u0623\u0646\u062B\u0649" ? RET_WOMEN : men;
    const date = addYears(n.birth, age);
    return { date, age, gender: n.gender, days: dayN(date) };
  }
  var bad14 = (e) => !/^\d{14}$/.test(dig(e.nid || ""));
  var isIn = (e) => e.status == "active";
  var F = {
    nodocs: (e) => isIn(e) ? !(e.docs || []).length : !(e.docs || []).some((d) => d.kind === "\u0627\u0633\u062A\u0642\u0627\u0644\u0629"),
    inc: (e) => isIn(e) ? bad14(e) || !e.start || !(+e.wage > 0) : !e.end,
    retnow: (e) => {
      if (!isIn(e)) return false;
      const r = retireInfo(e);
      return !!r && r.days <= 0;
    },
    retsoon: (e) => {
      if (!isIn(e)) return false;
      const r = retireInfo(e);
      return !!r && r.days > 0 && r.days <= getAlertPrefs().retDays;
    },
    latein: (e) => {
      if (!isIn(e) || e.reqIn || !e.start) return false;
      return -dayN(e.start) >= getAlertPrefs().fileDays;
    }
  };
  var LABELS = {
    nodocs: "\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0646\u0627\u0642\u0635\u0629",
    inc: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629",
    retnow: "\u0628\u0644\u063A \u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0634",
    retsoon: "\u0645\u0642\u0628\u0644 \u0639\u0644\u0649 \u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0634",
    latein: "\u0637\u0644\u0628 \u0627\u0644\u062A\u062D\u0627\u0642 \u0644\u0645 \u064A\u064F\u0642\u062F\u064E\u0651\u0645"
  };
  function installFilters() {
    Object.keys(F).forEach((k) => {
      if (!XF2[k]) XF2[k] = F[k];
      if (!XL[k]) XL[k] = LABELS[k];
    });
  }
  var one = (list, nameOf) => list.length === 1 ? " \u2014 " + nameOf(list[0]) : "";
  var rec = (list) => list.length === 1 ? { id: list[0].id, rec: "emp" } : {};
  function build(a) {
    const P2 = getAlertPrefs(), off = new Set(P2.off), push = (o) => {
      if (!off.has(o.k)) a.push(o);
    };
    const sink = { push };
    try {
      const ex = expiries();
      const bands = [
        ["doc7", "r", (x) => x.days <= 7, "\u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 7 \u0623\u064A\u0627\u0645 \u0623\u0648 \u0627\u0646\u062A\u0647\u062A", "r"],
        ["doc15", "w", (x) => x.days > 7 && x.days <= 15, "\u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 15 \u064A\u0648\u0645\u064B\u0627", "w"],
        ["doc30", "i", (x) => x.days > 15 && x.days <= 30, "\u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 30 \u064A\u0648\u0645\u064B\u0627", "w"]
      ];
      bands.forEach(([k, s, f, label, cf2]) => {
        const l = ex.filter(f);
        if (!l.length) return;
        const t = l.length === 1 ? l[0].what + " \u0644\u0644\u0633\u064A\u0627\u0631\u0629 " + l[0].plate + " " + (l[0].days < 0 ? "\u0627\u0646\u062A\u0647\u062A \u0645\u0646\u0630 " + fm(-l[0].days) + " \u064A\u0648\u0645" : l[0].days === 0 ? "\u062A\u0646\u062A\u0647\u064A \u0627\u0644\u064A\u0648\u0645" : "\u062A\u0646\u062A\u0647\u064A \u0628\u0639\u062F " + fm(l[0].days) + " \u064A\u0648\u0645") : fm(l.length) + " \u0645\u0633\u062A\u0646\u062F/\u062A\u0631\u062E\u064A\u0635 \u0633\u064A\u0627\u0631\u0627\u062A " + label;
        sink.push({ k, s, i: "car", t, g: "cars", cf: cf2 });
      });
    } catch (e) {
      console.error("[AmanUI] alerts:doc", e);
    }
    try {
      const E = S.emps;
      const nd = E.filter(F.nodocs);
      if (nd.length) sink.push({ k: "nodocs", s: "w", i: "pclip", t: fm(nd.length) + " \u0645\u0648\u0638\u0641 \u0645\u0633\u062A\u0646\u062F\u0627\u062A\u0647 \u0646\u0627\u0642\u0635\u0629 (\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647 \u0628\u0644\u0627 \u0623\u064A \u0645\u0633\u062A\u0646\u062F\u060C \u0623\u0648 \u0645\u0633\u062A\u0642\u064A\u0644 \u0628\u0644\u0627 \u0645\u0633\u062A\u0646\u062F \u0627\u0633\u062A\u0642\u0627\u0644\u0629)" + one(nd, (e) => e.name), g: "emp", x: "nodocs", ...rec(nd) });
      const no = E.filter(XF2.noout);
      if (no.length) sink.push({ k: "noout", s: "i", i: "file", t: fm(no.length) + " \u0645\u0648\u0638\u0641 \u0645\u0633\u062A\u0642\u064A\u0644 \u0628\u062F\u0648\u0646 \u0637\u0644\u0628 \u062E\u0631\u0648\u062C \u0645\u0633\u062C\u0644" + one(no, (e) => e.name), g: "emp", x: "noout", ...rec(no) });
      const inc = E.filter(F.inc);
      if (inc.length) sink.push({ k: "inc", s: "w", i: "alert", t: fm(inc.length) + " \u0645\u0648\u0638\u0641 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629 (\u0631\u0642\u0645 \u0642\u0648\u0645\u064A/\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u062D\u0627\u0642/\u0623\u062C\u0631\u060C \u0623\u0648 \u062A\u0627\u0631\u064A\u062E \u0627\u0633\u062A\u0642\u0627\u0644\u0629)" + one(inc, (e) => e.name), g: "emp", x: "inc", ...rec(inc) });
      const rn = E.filter(F.retnow), rs = E.filter(F.retsoon);
      if (rn.length) sink.push({ k: "retnow", s: "r", i: "alert", t: fm(rn.length) + " \u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647 \u0628\u0644\u063A \u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0634 (\u0631\u062C\u0627\u0644 " + (S.cfg && +S.cfg.retAge || 60) + " / \u0633\u064A\u062F\u0627\u062A " + RET_WOMEN + ")" + one(rn, (e) => e.name), g: "emp", x: "retnow", ...rec(rn) });
      if (rs.length) sink.push({ k: "retsoon", s: "w", i: "clock", t: fm(rs.length) + " \u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647 \u064A\u0628\u0644\u063A \u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0634 \u062E\u0644\u0627\u0644 " + fm(Math.round(P2.retDays / 30)) + " \u0623\u0634\u0647\u0631" + one(rs, (e) => e.name), g: "emp", x: "retsoon", ...rec(rs) });
      const li = E.filter(F.latein);
      if (li.length) sink.push({ k: "latein", s: "r", i: "clock", t: fm(li.length) + " \u0645\u0648\u0638\u0641 \u0645\u0631\u0651 \u0639\u0644\u0649 \u0627\u0644\u062A\u062D\u0627\u0642\u0647 \u0623\u0643\u062B\u0631 \u0645\u0646 " + fm(P2.fileDays) + " \u0623\u064A\u0627\u0645 \u0648\u0644\u0645 \u064A\u064F\u0633\u062C\u064E\u0651\u0644 \u0644\u0647 \u0637\u0644\u0628 \u0627\u0644\u062A\u062D\u0627\u0642" + one(li, (e) => e.name), g: "emp", x: "latein", ...rec(li) });
    } catch (e) {
      console.error("[AmanUI] alerts:emp", e);
    }
    try {
      const due = Q().filter((q) => q.status == QS[0] && q.hdate && dayN(q.hdate) <= 3);
      if (due.length) sink.push({ k: "reqdue", s: due.some((q) => dayN(q.hdate) < 0) ? "r" : "w", i: "clip", t: fm(due.length) + " \u0637\u0644\u0628 \u062F\u062E\u0648\u0644 \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0648\u0645\u0648\u0639\u062F \u062A\u0639\u064A\u064A\u0646\u0647 " + (due.every((q) => dayN(q.hdate) < 0) ? "\u0641\u0627\u062A" : "\u0642\u0631\u064A\u0628 \u0623\u0648 \u0641\u0627\u062A") + one(due, (q) => q.name), g: "req" });
    } catch (e) {
      console.error("[AmanUI] alerts:req", e);
    }
    try {
      const months = [...new Set(PY().map((b) => b.month))].sort();
      if (months.length && typeof reconAll === "function") {
        const m = months[months.length - 1], r = reconAll(m), bad = r.it.filter((i) => !GOOD.includes(i.t));
        if (bad.length) {
          const by = {};
          bad.forEach((i) => {
            by[i.t] = (by[i.t] || 0) + 1;
          });
          const det = Object.keys(by).map((t) => TT[t][0] + " " + fm(by[t])).join("\u060C ");
          sink.push({ k: "recon", s: bad.some((i) => TT[i.t][1] === "r") ? "r" : "w", i: "layers", t: "\u0643\u0634\u0648\u0641 \u0634\u0647\u0631 " + m + " \u062A\u062E\u062A\u0644\u0641 \u0639\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C: " + fm(bad.length) + " \u0645\u0644\u0627\u062D\u0638\u0629 (" + det + ")", g: "rec", month: m });
        }
      }
    } catch (e) {
      console.error("[AmanUI] alerts:recon", e);
    }
    try {
      const T = TS(), late = T.filter((t) => tst(t) == "late"), td = T.filter((t) => tst(t) == "today");
      if (late.length) sink.push({ k: "tasks", s: "r", i: "clock", t: fm(late.length) + " \u0645\u0647\u0645\u0629 \u0645\u062A\u0623\u062E\u0631\u0629" + one(late, (t) => t.title), g: "asst" });
      if (td.length) sink.push({ k: "tasks", s: "w", i: "clock", t: fm(td.length) + " \u0645\u0647\u0645\u0629 \u0627\u0644\u064A\u0648\u0645" + one(td, (t) => t.title), g: "asst" });
    } catch (e) {
      console.error("[AmanUI] alerts:tasks", e);
    }
  }
  var RANK = { r: 0, w: 1, i: 2 };
  function install() {
    installFilters();
    const _alerts = window.alerts;
    window.alerts = function() {
      const base = _alerts.apply(this, arguments).filter((x) => x.g !== "cars" && x.g !== "asst");
      build(base);
      return base.map((x, i) => [x, i]).sort((p, q) => (RANK[p[0].s] ?? 3) - (RANK[q[0].s] ?? 3) || p[1] - q[1]).map((p) => p[0]);
    };
    const _aGo = window.aGo;
    window.aGo = function(i) {
      const a = (typeof AL !== "undefined" ? AL : [])[i];
      if (a && isRich(a)) {
        closeM();
        return openAlertTarget(a);
      }
      return _aGo.apply(this, arguments);
    };
  }
  var isRich = (a) => !!(a.rec || a.cf !== void 0 || a.month || a.k);
  function openAlertTarget(a, co) {
    if (a.rec === "emp" && a.id) {
      prof(a.id);
      return;
    }
    if (a.g === "emp") {
      flt = { c: co && S.companies.some((c) => c.id == co) ? co : "", s: "", q: "", x: XF2[a.x] ? a.x : "", fn: "", k: "" };
      ep = 0;
      nv("emp");
      return;
    }
    if (a.g === "cars") {
      cf = a.cf || "";
      nv("cars");
      return;
    }
    if (a.g === "rec" && a.month && typeof openRec === "function") {
      nv("rec");
      openRec(a.month);
      return;
    }
    nv(a.g);
  }

  // ui/src/core/install.js
  var safe = (name, fn) => {
    try {
      fn();
    } catch (e) {
      console.error("[AmanUI] install:" + name, e);
    }
  };
  function refreshBadge() {
    const b = document.getElementById("bell");
    if (!b || typeof alerts !== "function" || typeof ic !== "function") return;
    const n = alerts().length;
    b.innerHTML = ic("bell", 18) + (n ? `<span class=dot>${n}</span>` : "");
  }
  function tidyNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const kids = [...nav.children];
    kids.forEach((h, i) => {
      if (h.tagName !== "H6") return;
      let any = false;
      for (let j = i + 1; j < kids.length && kids[j].tagName !== "H6"; j++) if (getComputedStyle(kids[j]).display !== "none") {
        any = true;
        break;
      }
      h.style.display = any ? "" : "none";
    });
  }
  var captureFocus = () => {
    const a = document.activeElement, v = document.getElementById("view");
    if (!a || a.tagName !== "INPUT" || !v || !v.contains(a) || a.closest("#vue-emp,#vue-dash,#vue-set")) return null;
    return { ph: a.placeholder, id: a.id, s: a.selectionStart, e: a.selectionEnd };
  };
  var restoreFocus = (f) => {
    if (!f) return;
    const v = document.getElementById("view");
    if (!v) return;
    const n = f.id && v.querySelector("#" + CSS.escape(f.id)) || (f.ph ? [...v.querySelectorAll("input")].find((x) => x.placeholder === f.ph) : null);
    if (n) {
      n.focus();
      try {
        n.setSelectionRange(f.s, f.e);
      } catch (e) {
      }
    }
  };
  function installAll() {
    safe("store", installStore);
    safe("prefs", applyPrefs);
    safe("shortcuts", installShortcuts);
    safe("toast", () => {
      const _toast = window.toast;
      window.toast = function(m, ok) {
        if (host.ready) {
          notify(m, classify(m, ok));
          return;
        }
        return _toast.apply(this, arguments);
      };
      window.alert = function(m) {
        if (host.ready) notify(m, "warn", { duration: 8e3 });
        else console.warn("[alert]", m);
      };
    });
    safe("bell+search", () => {
      const _bell = window.bellM, _gs = window.gs;
      window.bellM = function() {
        if (host.ready) return host.toggleBell();
        return _bell.apply(this, arguments);
      };
      window.gs = function() {
        if (host.ready) return host.openSearch();
        return _gs.apply(this, arguments);
      };
    });
    safe("adv-filter", () => {
      const _EL = window.EL;
      window.EL = function() {
        const l = _EL.apply(this, arguments);
        return advCount() ? l.filter(advPredicate) : l;
      };
    });
    safe("start-page", () => {
      const _enter = window.enter;
      window.enter = function() {
        const want = resolveStart(navItems().map((x) => x.id));
        if (want !== "dash") {
          const g0 = window.go;
          const tmp = function(v) {
            window.go = g0;
            return g0.apply(this, [v === "dash" ? want : v].concat([].slice.call(arguments, 1)));
          };
          window.go = tmp;
          setTimeout(() => {
            if (window.go === tmp) window.go = g0;
          }, 0);
        }
        return _enter.apply(this, arguments);
      };
    });
    safe("review-filters", () => {
      if (typeof XF2 !== "undefined" && !XF2.nostart) XF2.nostart = (e) => !e.start;
      if (typeof XL !== "undefined" && !XL.nostart) XL.nostart = "\u0628\u062F\u0648\u0646 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u062D\u0627\u0642";
    });
    safe("daily-summary", () => {
      const _enter = window.enter;
      window.enter = function() {
        const r = _enter.apply(this, arguments);
        setTimeout(() => {
          try {
            if (host.ready) host.maybeSummary();
          } catch (e) {
            console.error("[AmanUI]", e);
          }
        }, 900);
        return r;
      };
    });
    safe("view-modes", () => {
      if (typeof qm !== "undefined") {
        const v = getViewMode("req");
        if (v) qm = v;
      }
      if (typeof cm !== "undefined") {
        const v = getViewMode("cars");
        if (v) cm = v;
      }
    });
    safe("go", () => {
      const _go = window.go;
      window.go = function(v) {
        const f = v === curPage() ? captureFocus() : null;
        const r = _go.apply(this, arguments);
        safe("go-post", () => {
          rememberPage(v);
          if (v === "req" && typeof qm !== "undefined") setViewMode("req", qm);
          if (v === "cars" && typeof cm !== "undefined") setViewMode("cars", cm);
          tidyNav();
          restoreFocus(f);
        });
        return r;
      };
    });
    safe("settings", () => {
      const _set = R.set;
      R.set = function() {
        const h = _set.apply(this, arguments);
        if (!window.AmanUI || !window.AmanUI.mountSettings) return h;
        setTimeout(() => {
          const el = document.getElementById("vue-set");
          if (el) {
            try {
              window.AmanUI.mountSettings(el);
            } catch (e) {
              console.error("[AmanUI]", e);
            }
          }
        }, 0);
        const i = h.lastIndexOf("</div>");
        return i < 0 ? h : h.slice(0, i) + '<div id="vue-set" style="grid-column:1/-1"></div>' + h.slice(i);
      };
    });
    safe("instant-search", () => {
      const fire = debounce((t) => {
        if (document.body.contains(t)) t.dispatchEvent(new Event("change", { bubbles: true }));
      }, 280);
      document.addEventListener("input", (e) => {
        const t = e.target;
        if (!t || t.tagName !== "INPUT" || !t.closest || !t.closest("#view")) return;
        const oc = t.getAttribute("onchange") || "";
        if (/^(sq|tfq)\(/.test(oc)) fire(t);
      });
    });
    safe("alerts", install);
    safe("reactive", () => {
      onData(() => {
        if (window.AmanUI && window.AmanUI.active && window.AmanUI.active()) window.AmanUI.refresh();
        refreshBadge();
      });
    });
  }

  // tests/phase1/entry.js
  window.__calls = { bell: 0, search: 0, help: 0 };
  if (!window.__noHost) {
    host.toggleBell = () => {
      window.__calls.bell++;
    };
    host.openSearch = () => {
      window.__calls.search++;
    };
    host.openHelp = () => {
      window.__calls.help++;
    };
    host.ready = true;
  }
  window.AmanCore = { store: store_exports, prefs: prefs_exports, notify: notify_exports, search: search_exports, shortcuts: shortcuts_exports, host, install: install_exports };
  installAll();
})();
