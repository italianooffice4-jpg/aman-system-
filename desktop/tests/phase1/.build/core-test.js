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
      const it2 = normOf(e);
      if (!it2.name || !toks.every((t) => it2.n.includes(t))) continue;
      let sc = it2.n.startsWith(toks[0]) ? 3 : it2.n.split(" ").some((w) => w.startsWith(toks[0])) ? 2 : 1;
      if (e.status === "active") sc += 0.5;
      out.push([sc, it2.name]);
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
  }, openEmpForm: null, openEmpFile: null, openDocs: null, openReport: null };

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
    const map2 = { emp: () => editE(), comp: () => editC(), req: () => editQ(), asst: () => editT(), cars: () => editCar() };
    const fn = map2[p];
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
  var ms = (iso2) => (/* @__PURE__ */ new Date(iso2 + "T00:00:00")).getTime();
  var dayN = (iso2) => Math.round((ms(iso2) - ms(today())) / 864e5);
  var addYears = (iso2, n) => {
    const [y, m, d] = iso2.split("-").map(Number);
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
    idexp: (e) => {
      if (!isIn(e) || !e.nidExp) return false;
      return dayN(e.nidExp) <= 30;
    },
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
    idexp: "\u0628\u0637\u0627\u0642\u0629 \u0645\u0646\u062A\u0647\u064A\u0629/\u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u064B\u0627",
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
      const E2 = S.emps;
      const ie = E2.filter(F.idexp);
      if (ie.length) sink.push({ k: "idexp", s: ie.some((e) => dayN(e.nidExp) < 0) ? "r" : "w", i: "clock", t: fm(ie.length) + " \u0628\u0637\u0627\u0642\u0629 \u0631\u0642\u0645 \u0642\u0648\u0645\u064A \u0645\u0646\u062A\u0647\u064A\u0629 \u0623\u0648 \u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 30 \u064A\u0648\u0645\u064B\u0627" + one(ie, (e) => e.name), g: "emp", x: "idexp", ...rec(ie) });
      const nd = E2.filter(F.nodocs);
      if (nd.length) sink.push({ k: "nodocs", s: "w", i: "pclip", t: fm(nd.length) + " \u0645\u0648\u0638\u0641 \u0645\u0633\u062A\u0646\u062F\u0627\u062A\u0647 \u0646\u0627\u0642\u0635\u0629 (\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647 \u0628\u0644\u0627 \u0623\u064A \u0645\u0633\u062A\u0646\u062F\u060C \u0623\u0648 \u0645\u0633\u062A\u0642\u064A\u0644 \u0628\u0644\u0627 \u0645\u0633\u062A\u0646\u062F \u0627\u0633\u062A\u0642\u0627\u0644\u0629)" + one(nd, (e) => e.name), g: "emp", x: "nodocs", ...rec(nd) });
      const no = E2.filter(XF2.noout);
      if (no.length) sink.push({ k: "noout", s: "i", i: "file", t: fm(no.length) + " \u0645\u0648\u0638\u0641 \u0645\u0633\u062A\u0642\u064A\u0644 \u0628\u062F\u0648\u0646 \u0637\u0644\u0628 \u062E\u0631\u0648\u062C \u0645\u0633\u062C\u0644" + one(no, (e) => e.name), g: "emp", x: "noout", ...rec(no) });
      const inc = E2.filter(F.inc);
      if (inc.length) sink.push({ k: "inc", s: "w", i: "alert", t: fm(inc.length) + " \u0645\u0648\u0638\u0641 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629 (\u0631\u0642\u0645 \u0642\u0648\u0645\u064A/\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u062D\u0627\u0642/\u0623\u062C\u0631\u060C \u0623\u0648 \u062A\u0627\u0631\u064A\u062E \u0627\u0633\u062A\u0642\u0627\u0644\u0629)" + one(inc, (e) => e.name), g: "emp", x: "inc", ...rec(inc) });
      const rn = E2.filter(F.retnow), rs = E2.filter(F.retsoon);
      if (rn.length) sink.push({ k: "retnow", s: "r", i: "alert", t: fm(rn.length) + " \u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647 \u0628\u0644\u063A \u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0634 (\u0631\u062C\u0627\u0644 " + (S.cfg && +S.cfg.retAge || 60) + " / \u0633\u064A\u062F\u0627\u062A " + RET_WOMEN + ")" + one(rn, (e) => e.name), g: "emp", x: "retnow", ...rec(rn) });
      if (rs.length) sink.push({ k: "retsoon", s: "w", i: "clock", t: fm(rs.length) + " \u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647 \u064A\u0628\u0644\u063A \u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0634 \u062E\u0644\u0627\u0644 " + fm(Math.round(P2.retDays / 30)) + " \u0623\u0634\u0647\u0631" + one(rs, (e) => e.name), g: "emp", x: "retsoon", ...rec(rs) });
      const li = E2.filter(F.latein);
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

  // ui/src/core/query.js
  var AD = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
  var PD = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
  var dig2 = (s) => String(s == null ? "" : s).replace(/[٠-٩]/g, (d) => AD.indexOf(d)).replace(/[۰-۹]/g, (d) => PD.indexOf(d));
  var norm2 = (s) => dig2(s).replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "\u0627").replace(/ى/g, "\u064A").replace(/ة/g, "\u0647").replace(/[؟?!,،.]/g, " ").replace(/\s+/g, " ").trim();
  var has = (t, re) => re.test(t);
  var num = (t) => {
    const m = /(\d[\d,٬]*(?:\.\d+)?)/.exec(t);
    return m ? +m[1].replace(/[,٬]/g, "") : null;
  };
  var MONTHS = [["\u064A\u0646\u0627\u064A\u0631", "\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A"], ["\u0641\u0628\u0631\u0627\u064A\u0631", "\u0634\u0628\u0627\u0637"], ["\u0645\u0627\u0631\u0633", "\u0627\u0630\u0627\u0631"], ["\u0627\u0628\u0631\u064A\u0644", "\u0646\u064A\u0633\u0627\u0646"], ["\u0645\u0627\u064A\u0648", "\u0627\u064A\u0627\u0631"], ["\u064A\u0648\u0646\u064A\u0648", "\u062D\u0632\u064A\u0631\u0627\u0646"], ["\u064A\u0648\u0644\u064A\u0648", "\u062A\u0645\u0648\u0632"], ["\u0627\u063A\u0633\u0637\u0633", "\u0627\u0628"], ["\u0633\u0628\u062A\u0645\u0628\u0631", "\u0627\u064A\u0644\u0648\u0644"], ["\u0627\u0643\u062A\u0648\u0628\u0631", "\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u0627\u0648\u0644"], ["\u0646\u0648\u0641\u0645\u0628\u0631", "\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A"], ["\u062F\u064A\u0633\u0645\u0628\u0631", "\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0627\u0648\u0644"]].map((a) => a.map(norm2));
  var pad = (n) => String(n).padStart(2, "0");
  var iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  var lastDay = (y, m) => new Date(y, m, 0).getDate();
  function dateRange(t, now = /* @__PURE__ */ new Date()) {
    const y = now.getFullYear(), m = now.getMonth() + 1;
    let r;
    if (r = /اخر\s+(\d+|ثلاث|ثلاثه|ست|سته)?\s*(يوم|ايام|شهر|شهور|اشهر|سنه|سنوات|سنين)/.exec(t)) {
      const n = r[1] ? /^\d+$/.test(r[1]) ? +r[1] : /ثلاث/.test(r[1]) ? 3 : 6 : 1, u = r[2], d = new Date(now);
      if (/يوم|ايام/.test(u)) d.setDate(d.getDate() - n);
      else if (/شهر|شهور|اشهر/.test(u)) d.setMonth(d.getMonth() - n);
      else d.setFullYear(d.getFullYear() - n);
      return { from: iso(d), to: iso(now), label: "\u0622\u062E\u0631 " + n + " " + (/يوم|ايام/.test(u) ? "\u064A\u0648\u0645" : /شهر|شهور|اشهر/.test(u) ? "\u0634\u0647\u0631" : "\u0633\u0646\u0629") };
    }
    if (/(هذا|الحالي|الجاري)\s*(الشهر)|الشهر\s*(هذا|الحالي|الجاري)/.test(t)) return { from: y + "-" + pad(m) + "-01", to: y + "-" + pad(m) + "-" + pad(lastDay(y, m)), label: "\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631" };
    if (/(الشهر)\s*(الماضي|السابق)/.test(t)) {
      const d = new Date(y, m - 2, 1);
      return { from: iso(d), to: y + "-" + pad(d.getMonth() + 1) + "-" + pad(lastDay(d.getFullYear(), d.getMonth() + 1)), label: "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0645\u0627\u0636\u064A" };
    }
    if (/(العام|السنه)\s*(الماضي|السابق|الماضيه)/.test(t)) return { from: y - 1 + "-01-01", to: y - 1 + "-12-31", label: "\u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0645\u0627\u0636\u064A (" + (y - 1) + ")" };
    if (/(هذا|الحالي|الجاري)\s*(العام|السنه)|(العام|السنه)\s*(هذا|الحالي|الجاري)/.test(t)) return { from: y + "-01-01", to: y + "-12-31", label: "\u0647\u0630\u0627 \u0627\u0644\u0639\u0627\u0645 (" + y + ")" };
    const yr = /(?:في|عام|سنه|لعام|لسنه|بعد|قبل|خلال|استقالات|التحاقات|تعيينات)\s*(20\d\d)(?:\s|$)/.exec(t) || new RegExp("(?:" + MONTHS.flat().join("|") + ")\\s*(20\\d\\d)").exec(t), yy = yr ? +yr[1] : null;
    for (let i = 0; i < 12; i++) {
      if (MONTHS[i].some((n) => new RegExp("(^|\\s)(\u0628|\u0644|\u0641\u064A )?" + n + "(\\s|$)").test(t))) {
        const Y = yy || y;
        return { from: Y + "-" + pad(i + 1) + "-01", to: Y + "-" + pad(i + 1) + "-" + pad(lastDay(Y, i + 1)), label: MONTHS[i][0] + " " + Y };
      }
    }
    if (yy) return { from: yy + "-01-01", to: yy + "-12-31", label: "\u0633\u0646\u0629 " + yy };
    return null;
  }
  function compare(t, key) {
    const km = new RegExp("(?:" + key + ")").exec(t);
    if (!km) return null;
    let w = t.slice(km.index + km[0].length);
    const stop2 = /(عمر|(^| )سن( |ه)|اجر|مرتب|راتب|وظيف|شرك|التحق|استقال)/.exec(w.slice(1));
    if (stop2) w = w.slice(0, stop2.index + 1);
    const m = /(لا يقل عن|لا يزيد عن|اكبر من|اكثر من|اعلي من|اعلي|فوق|يزيد عن|يتجاوز|اقل من|اقل|تحت|دون|ينقص عن|يساوي|بالضبط|بين|من)?\s*(\d[\d,٬]*)(?:\s*(?:و|الي|الى|-|حتي)\s*(\d[\d,٬]*))?/.exec(w);
    if (!m) return null;
    const word = m[1] || "", a = num(m[2]), b = m[3] ? num(m[3]) : null;
    if (b != null) return { op: "between", a: Math.min(a, b), b: Math.max(a, b) };
    if (/لا يقل عن/.test(word)) return { op: ">=", a };
    if (/لا يزيد عن/.test(word)) return { op: "<=", a };
    if (/اكبر|اكثر|اعلي|فوق|يزيد|يتجاوز/.test(word)) return { op: ">", a };
    if (/اقل|تحت|دون|ينقص/.test(word)) return { op: "<", a };
    if (/يساوي|بالضبط/.test(word) || !word) return { op: "=", a };
    return null;
  }
  var test = (c, v) => c.op === ">" ? v > c.a : c.op === "<" ? v < c.a : c.op === ">=" ? v >= c.a : c.op === "<=" ? v <= c.a : c.op === "between" ? v >= c.a && v <= c.b : v === c.a;
  var cLabel = (c) => c.op === "between" ? "\u0628\u064A\u0646 " + c.a + " \u0648 " + c.b : (c.op === ">=" ? "\u2265 " : c.op === "<=" ? "\u2264 " : c.op === "=" ? "= " : c.op + " ") + c.a;
  var ageOf = (e) => {
    const r = window.a9 && a9.nid && e.nid ? a9.nid(dig2(e.nid)) : null;
    if (!r || !r.valid || !r.birth) return null;
    const b = /* @__PURE__ */ new Date(r.birth + "T00:00:00"), n = /* @__PURE__ */ new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
    return a;
  };
  var genderOf = (e) => {
    const r = window.a9 && a9.nid && e.nid ? a9.nid(dig2(e.nid)) : null;
    return r && r.valid ? r.gender : null;
  };
  var clampW = (w) => Math.min(Math.max(+w || 0, +S.cfg.min || 0), +S.cfg.max || 1e12);
  function parse(q, now = /* @__PURE__ */ new Date()) {
    const raw = String(q || ""), t = " " + norm2(raw) + " ", u = [], f = [];
    const out = { raw, entity: "emp", agg: "list", group: "", filters: f, understood: u, recognized: 0 };
    if (has(t, / (شركات|شركه|منشات|منشاه) /) && !has(t, / (موظف|موظفين|عمال|عامل|مستقيل|مؤمن) /)) out.entity = "comp";
    else if (has(t, / (سيارات|سياره|عربيات|عربيه|مركبات|ترخيص|تراخيص) /)) out.entity = "car";
    else if (has(t, / (طلبات|طلب) /) && !has(t, / (موظف|موظفين|عمال) /)) out.entity = "req";
    const E2 = { emp: "\u0645\u0648\u0638\u0641\u0648\u0646", comp: "\u0634\u0631\u0643\u0627\u062A", car: "\u0633\u064A\u0627\u0631\u0627\u062A", req: "\u0637\u0644\u0628\u0627\u062A \u062F\u062E\u0648\u0644" }[out.entity];
    if (has(t, / (موظف|موظفين|الموظفين|عمال|العمال|عامل|مؤمن|المؤمن|مستقيل|مستقيلين|المستقيلين|مستقيله|سيدات|رجال|ذكور|اناث|نساء|موظفات) /) || /(موظف|عامل|مؤمن|مستقيل|سيدات|رجال)/.test(t)) out.recognized++;
    if (out.entity !== "emp") out.recognized++;
    if (/(^| )(كم|عدد|كام)( |$)/.test(t)) {
      out.agg = "count";
      out.recognized++;
    } else if (/(اجمالي|مجموع)\s*(ال)?(اجور|اجر|مرتبات|رواتب|مرتب|راتب)/.test(t)) {
      out.agg = "sum";
      out.recognized++;
    } else if (/(متوسط)\s*(ال)?(اجور|اجر|مرتب|راتب|مرتبات|رواتب)/.test(t)) {
      out.agg = "avg";
      out.recognized++;
    } else if (/(اعلي|اكبر|اقصي)\s*(ال)?(اجر|مرتب|راتب)/.test(t)) {
      out.agg = "max";
      out.recognized++;
    } else if (/(اقل|ادني)\s*(ال)?(اجر|مرتب|راتب)/.test(t)) {
      out.agg = "min";
      out.recognized++;
    } else if (/(^| )(اعرض|هات|اعطني|اظهر|اريد|قائمه|اسماء|من هم|مين|ليستة|ورني|عايز)( |$)/.test(t)) {
      out.agg = "list";
      out.recognized++;
    }
    if (/(حسب|لكل|توزيع|موزعين على|موزعه على)\s*(الشركه|الشركات|شركه|المنشات|منشاه)/.test(t)) {
      out.group = "comp";
      out.recognized++;
    } else if (/(حسب|لكل|توزيع)\s*(الوظيفه|الوظائف|وظيفه|المهنه)/.test(t)) {
      out.group = "job";
      out.recognized++;
    } else if (/(حسب|لكل|توزيع)\s*(الحاله|الجنس|النوع)/.test(t)) {
      out.group = /الجنس|النوع/.test(t) ? "gender" : "status";
      out.recognized++;
    }
    out.hasEntity = out.entity === "emp" && /(موظف|عامل|مؤمن|مستقيل|سيدات|سيده|رجال|ذكور|اناث|موظفات)/.test(t);
    out.hasVerb = out.agg !== "list" || /(^| )(اعرض|هات|اعطني|اظهر|اريد|قائمه|اسماء|من هم|مين|ورني|عايز)( |$)/.test(t);
    if (out.entity === "emp") {
      if (/(مستقيل|مستقيلين|المستقيلين|مستقيله|استقال|استقالوا|خرجوا|تركوا|انتهت خدمتهم)/.test(t)) {
        f.push({ k: "status", v: "resigned", l: "\u0645\u0633\u062A\u0642\u064A\u0644\u0648\u0646" });
        out.recognized++;
      } else if (/(مؤمن عليهم|مؤمن عليه|مؤمن عليها|المؤمن عليهم|علي راس العمل|نشط|حاليا|الحاليين|علي رأس العمل|شغالين)/.test(t)) {
        f.push({ k: "status", v: "active", l: "\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647\u0645 \u062D\u0627\u0644\u064A\u064B\u0627" });
        out.recognized++;
      }
      const cs = S.companies.map((c) => ({ c, n: norm2(c.name) })).filter((x) => x.n.length >= 2).sort((a, b) => b.n.length - a.n.length);
      const hit = [];
      let tt = t;
      cs.forEach((x) => {
        if (tt.includes(" " + x.n + " ") || tt.includes(x.n)) {
          hit.push(x.c);
          tt = tt.replace(x.n, " ");
        }
      });
      if (hit.length) {
        f.push({ k: "company", v: hit.map((c) => c.id), l: "\u0634\u0631\u0643\u0629 " + hit.map((c) => c.name).join(" \u0623\u0648 ") });
        out.recognized++;
      }
      const jobs = [...new Set(S.emps.map((e) => (e.job || "").trim()).filter((j) => j.length >= 3))].map((j) => ({ j, n: norm2(j) })).sort((a, b) => b.n.length - a.n.length);
      const jh = jobs.find((x) => {
        const j = x.n.replace(/^ال/, "");
        return j.length >= 4 && t.includes(j);
      });
      if (jh) {
        f.push({ k: "job", v: jh.n, l: "\u0648\u0638\u064A\u0641\u0629 " + jh.j });
        out.recognized++;
      }
      const wc = compare(t, "\u0627\u062C\u0631|\u0627\u062C\u0631\u0647|\u0627\u062C\u0631\u0647\u0645|\u0645\u0631\u062A\u0628|\u0645\u0631\u062A\u0628\u0647|\u0645\u0631\u062A\u0628\u0647\u0645|\u0631\u0627\u062A\u0628|\u0631\u0627\u062A\u0628\u0647|\u0631\u0627\u062A\u0628\u0647\u0645|\u064A\u062A\u0642\u0627\u0636\u064A|\u064A\u062A\u0642\u0627\u0636\u0648\u0646");
      if (wc && /(اجر|مرتب|راتب|يتقاضي|يتقاضون)/.test(t)) {
        f.push({ k: "wage", v: wc, l: "\u0627\u0644\u0623\u062C\u0631 " + cLabel(wc) });
        out.recognized++;
      }
      const ac = /(عمر|سن|سنه)/.test(t) ? compare(t, "\u0639\u0645\u0631|\u0639\u0645\u0631\u0647|\u0639\u0645\u0631\u0647\u0645|\u0633\u0646|\u0633\u0646\u0647") : null;
      if (ac && /(عمر|سن )/.test(t)) {
        f.push({ k: "age", v: ac, l: "\u0627\u0644\u0633\u0646 " + cLabel(ac) });
        out.recognized++;
      }
      if (/(سيدات|سيده|اناث|انثي|نساء|موظفات|موظفه|بنات|الاناث)/.test(t)) {
        f.push({ k: "gender", v: "\u0623\u0646\u062B\u0649", l: "\u0633\u064A\u062F\u0627\u062A" });
        out.recognized++;
      } else if (/(رجال|ذكور|الرجال)/.test(t)) {
        f.push({ k: "gender", v: "\u0630\u0643\u0631", l: "\u0631\u062C\u0627\u0644" });
        out.recognized++;
      }
      const dr = dateRange(t.replace(/\d+\s*(جنيه|ج)/g, " "), now);
      if (dr) {
        const resigned = f.some((x) => x.k === "status" && x.v === "resigned") || /(استقال|استقالوا|خرجوا|تركوا|استقالات|خروج)/.test(t);
        const field = resigned && !/(التحق|التحاق|تعيين|عينوا|بدا|بدأ)/.test(t) ? "end" : "start";
        f.push({ k: "date", field, v: dr, l: (field === "end" ? "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u0642\u0627\u0644\u0629 " : "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642 ") + dr.label });
        if (field === "end" && !f.some((x) => x.k === "status")) f.push({ k: "status", v: "resigned", l: "\u0645\u0633\u062A\u0642\u064A\u0644\u0648\u0646" });
        out.recognized++;
      }
      const miss = [[/(بدون|بلا|ليس لديهم|مفيش|ناقص)\s*(مستندات|مستند|ملفات)|مستنداتهم ناقصه|مستندات ناقصه/, "nodocs", "\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0646\u0627\u0642\u0635\u0629"], [/(بدون|بلا|مفيش)\s*(رقم تاميني|رقم التامين|رقم تامين)/, "noins", "\u0628\u0644\u0627 \u0631\u0642\u0645 \u062A\u0623\u0645\u064A\u0646\u064A"], [/(بدون|بلا|مفيش)\s*(رقم قومي)|بيانات ناقصه|بياناتهم ناقصه/, "inc", "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629"], [/(المقبلين علي|يقتربون من|قاربوا)\s*(المعاش|سن المعاش|التقاعد)|قريبا علي المعاش/, "retsoon", "\u0645\u0642\u0628\u0644\u0648\u0646 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0627\u0634"], [/(بلغوا|وصلوا)\s*(سن)?\s*(المعاش|التقاعد)/, "retnow", "\u0628\u0644\u063A\u0648\u0627 \u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0634"], [/(بدون|بلا)\s*(طلب خروج)/, "noout", "\u0628\u0644\u0627 \u0637\u0644\u0628 \u062E\u0631\u0648\u062C"], [/(لم يقدم لهم|بدون|بلا)\s*(طلب التحاق|طلب دخول)/, "latein", "\u0637\u0644\u0628 \u0627\u0644\u062A\u062D\u0627\u0642 \u0644\u0645 \u064A\u064F\u0642\u062F\u064E\u0651\u0645"]];
      miss.forEach(([re, key, l]) => {
        if (re.test(t)) {
          f.push({ k: "miss", v: key, l });
          out.recognized++;
        }
      });
    }
    if (out.entity === "car") {
      if (/(منتهي|منتهيه|انتهت)/.test(t)) {
        f.push({ k: "carexp", v: "expired", l: "\u0645\u0646\u062A\u0647\u064A\u0629" });
        out.recognized++;
      } else if (/(قريب|تنتهي|ستنتهي|خلال)/.test(t)) {
        const n = num(t.replace(/20\d\d/, ""));
        f.push({ k: "carexp", v: n || 30, l: "\u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 " + (n || 30) + " \u064A\u0648\u0645\u064B\u0627" });
        out.recognized++;
      }
    }
    if (out.entity === "req") {
      const st = [["\u0645\u0639\u062A\u0645\u062F", /معتمد|اعتمد/], ["\u0645\u0631\u0641\u0648\u0636", /مرفوض|رفض/], ["\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", /انتظار|معلق|معلقه/]].find((x) => x[1].test(t));
      if (st) {
        f.push({ k: "reqst", v: st[0], l: st[0] });
        out.recognized++;
      }
    }
    out.E = E2;
    return out;
  }
  var inRange = (v, r) => !!v && v >= r.from && v <= r.to;
  function pass(e, f) {
    switch (f.k) {
      case "status":
        return e.status === f.v;
      case "company":
        return f.v.includes(e.cid);
      case "job":
        return norm2(e.job || "").includes(f.v);
      case "wage":
        return test(f.v, +e.wage || 0);
      case "age": {
        const a = ageOf(e);
        return a != null && test(f.v, a);
      }
      case "gender":
        return genderOf(e) === f.v;
      case "date":
        return inRange(e[f.field], f.v);
      case "miss":
        return f.v === "noins" ? !e.insno : !!(window.XF2 && XF2[f.v] ? XF2[f.v](e) : F[f.v] && F[f.v](e));
      default:
        return true;
    }
  }
  var daysTo = (d) => Math.round((/* @__PURE__ */ new Date(d + "T00:00:00") - /* @__PURE__ */ new Date(today() + "T00:00:00")) / 864e5);
  var EMP_COLS = [{ k: "name", l: "\u0627\u0644\u0627\u0633\u0645" }, { k: "company", l: "\u0627\u0644\u0634\u0631\u0643\u0629" }, { k: "job", l: "\u0627\u0644\u0648\u0638\u064A\u0641\u0629" }, { k: "st", l: "\u0627\u0644\u062D\u0627\u0644\u0629" }, { k: "wage", l: "\u0627\u0644\u0623\u062C\u0631" }, { k: "start", l: "\u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642" }, { k: "end", l: "\u0627\u0644\u0627\u0633\u062A\u0642\u0627\u0644\u0629" }];
  var empRow = (e) => ({ eid: e.id, name: e.name || "", company: cn(e.cid), job: e.job || "", st: e.status === "active" ? "\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647" : e.rtype || "\u0645\u0633\u062A\u0642\u064A\u0644", wage: +e.wage || 0, start: e.start || "", end: e.end || "" });
  function run(p) {
    const A = window.a9;
    void A;
    let rows, columns, title;
    if (p.entity === "emp") {
      const list2 = S.emps.filter((e) => p.filters.every((f) => pass(e, f)));
      rows = list2.map(empRow);
      columns = EMP_COLS;
      title = "\u0645\u0648\u0638\u0641\u0648\u0646" + (p.filters.length ? " \u2014 " + p.filters.map((f) => f.l).join(" \u2022 ") : "");
      const w = list2.map((e) => +e.wage || 0), sum = w.reduce((a, b) => a + b, 0);
      const res = { rows, columns, title, count: list2.length, sum, avg: w.length ? sum / w.length : 0, max: w.length ? Math.max(...w) : 0, min: w.length ? Math.min(...w) : 0, insurable: list2.filter((e) => e.status === "active").reduce((a, e) => a + clampW(e.wage), 0) };
      if (p.group) {
        const g = {};
        list2.forEach((e) => {
          const k = p.group === "comp" ? cn(e.cid) : p.group === "job" ? e.job || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F" : p.group === "gender" ? genderOf(e) || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F" : e.status === "active" ? "\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647" : "\u0645\u0633\u062A\u0642\u064A\u0644";
          g[k] = (g[k] || 0) + 1;
        });
        res.groups = Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n }));
      }
      return res;
    }
    if (p.entity === "comp") {
      rows = S.companies.map((c) => {
        const s = stats(c.id);
        return { name: c.name, no: c.no || "", act: s.act, res: s.res, total: s.t };
      });
      return { rows, columns: [{ k: "name", l: "\u0627\u0644\u0634\u0631\u0643\u0629" }, { k: "no", l: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0634\u0623\u0629" }, { k: "act", l: "\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647\u0645" }, { k: "res", l: "\u0645\u0633\u062A\u0642\u064A\u0644\u0648\u0646" }, { k: "total", l: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0634\u0647\u0631\u064A" }], title: "\u0627\u0644\u0634\u0631\u0643\u0627\u062A", count: rows.length };
    }
    if (p.entity === "car") {
      const lim = p.filters.find((f) => f.k === "carexp");
      const L = [["licExp", "\u0627\u0644\u062A\u0631\u062E\u064A\u0635"], ["insExp", "\u0627\u0644\u062A\u0623\u0645\u064A\u0646"], ["inspExp", "\u0627\u0644\u0641\u062D\u0635"]];
      rows = [];
      (S.cars || []).forEach((c) => L.forEach(([k, l]) => {
        if (!c[k]) return;
        const d = daysTo(c[k]);
        if (!lim || (lim.v === "expired" ? d < 0 : d <= lim.v)) rows.push({ name: c.plate || "", type: c.type || "", what: l, date: c[k], left: d });
      }));
      rows.sort((a, b) => a.left - b.left);
      return { rows, columns: [{ k: "name", l: "\u0627\u0644\u0644\u0648\u062D\u0629" }, { k: "type", l: "\u0627\u0644\u0646\u0648\u0639" }, { k: "what", l: "\u0627\u0644\u0645\u0633\u062A\u0646\u062F" }, { k: "date", l: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621" }, { k: "left", l: "\u0627\u0644\u0623\u064A\u0627\u0645 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629" }], title: "\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A" + (lim ? " \u2014 " + lim.l : ""), count: rows.length };
    }
    const st = p.filters.find((f) => f.k === "reqst");
    const list = (window.Q ? Q() : S.reqs || []).filter((q) => !st || q.status === st.v);
    rows = list.map((q) => ({ name: q.name || "", job: q.job || "", hdate: q.hdate || "", status: q.status || "" }));
    return { rows, columns: [{ k: "name", l: "\u0627\u0644\u0627\u0633\u0645" }, { k: "job", l: "\u0627\u0644\u0648\u0638\u064A\u0641\u0629" }, { k: "hdate", l: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0639\u064A\u064A\u0646" }, { k: "status", l: "\u0627\u0644\u062D\u0627\u0644\u0629" }], title: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644" + (st ? " \u2014 " + st.l : ""), count: rows.length };
  }
  function ask(q, now) {
    const p = parse(q, now);
    const meaningful = p.filters.length > 0 || p.group || p.agg !== "list" || p.entity !== "emp";
    if (!meaningful || p.recognized < 2 && !p.filters.length) return null;
    if (p.entity === "emp" && !p.filters.length && !p.group && p.agg === "list") return null;
    if (p.entity === "emp" && !p.group && !p.hasVerb && !p.hasEntity && p.filters.every((f) => f.k === "job")) return null;
    const r = run(p), n = (x) => fm(Math.round(x)), M = (x) => mny(Math.round(x));
    const want = p.entity === "emp" ? "\u0645\u0648\u0638\u0641" : p.entity === "comp" ? "\u0634\u0631\u0643\u0629" : p.entity === "car" ? "\u0645\u0633\u062A\u0646\u062F" : "\u0637\u0644\u0628";
    const lines = ["\u0641\u0647\u0645\u062A \u0633\u0624\u0627\u0644\u0643 \u0647\u0643\u0630\u0627: " + [p.E].concat(p.filters.map((f) => f.l)).join(" \u2022 ") + (p.group ? " \u2022 \u0645\u0648\u0632\u064E\u0651\u0639\u064A\u0646 \u062D\u0633\u0628 " + { comp: "\u0627\u0644\u0634\u0631\u0643\u0629", job: "\u0627\u0644\u0648\u0638\u064A\u0641\u0629", gender: "\u0627\u0644\u0646\u0648\u0639", status: "\u0627\u0644\u062D\u0627\u0644\u0629" }[p.group] : "")];
    if (p.entity === "emp" && p.agg === "sum") lines.push("\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0623\u062C\u0648\u0631: " + M(r.sum) + " (\u0627\u0644\u0623\u062C\u0631 \u0627\u0644\u062A\u0623\u0645\u064A\u0646\u064A \u0628\u0639\u062F \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649/\u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647\u0645: " + M(r.insurable) + ") \u2014 \u0639\u062F\u062F " + n(r.count) + " \u0645\u0648\u0638\u0641");
    else if (p.entity === "emp" && p.agg === "avg") lines.push("\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u062C\u0631: " + M(r.avg) + " (\u0645\u0646 " + n(r.count) + " \u0645\u0648\u0638\u0641)");
    else if (p.entity === "emp" && p.agg === "max") lines.push("\u0623\u0639\u0644\u0649 \u0623\u062C\u0631: " + M(r.max) + (r.rows.length ? " \u2014 " + r.rows.slice().sort((a, b) => b.wage - a.wage)[0].name : ""));
    else if (p.entity === "emp" && p.agg === "min") lines.push("\u0623\u0642\u0644 \u0623\u062C\u0631: " + M(r.min) + (r.rows.length ? " \u2014 " + r.rows.slice().sort((a, b) => a.wage - b.wage)[0].name : ""));
    else lines.push("\u0627\u0644\u0639\u062F\u062F: " + n(r.count) + " " + want + (r.count ? "" : " (\u0644\u0627 \u0646\u062A\u0627\u0626\u062C \u0645\u0637\u0627\u0628\u0642\u0629)"));
    if (r.groups && r.groups.length) lines.push(r.groups.slice(0, 10).map((g) => "\u2022 " + g.k + ": " + n(g.n)).join("\n"));
    return { text: lines.join("\n"), report: { title: r.title, subtitle: "\u0627\u0644\u0633\u0624\u0627\u0644: " + String(q).trim(), sections: [{ columns: r.columns, rows: r.rows, groups: r.groups }] }, parsed: p, result: r };
  }

  // ui/src/core/contra.js
  var dig3 = (s) => String(s == null ? "" : s).replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632);
  var E = () => S.emps;
  var nidInfo = (e) => window.a9 && a9.nid && e.nid ? a9.nid(dig3(e.nid)) : null;
  var today0 = () => today();
  var it = (e, text) => ({ eid: e.id, name: e.name || "\u2014", company: cn(e.cid), text });
  var CHECKS = [
    ["dates_order", "err", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u0642\u0627\u0644\u0629 \u0642\u0628\u0644 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642", (e) => e.start && e.end && e.end < e.start ? [it(e, "\u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642 " + e.start + " \u0628\u0639\u062F \u0627\u0644\u0627\u0633\u062A\u0642\u0627\u0644\u0629 " + e.end)] : []],
    ["active_with_end", "warn", "\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647 \u062D\u0627\u0644\u064A\u064B\u0627 \u0648\u0644\u0647 \u062A\u0627\u0631\u064A\u062E \u0627\u0633\u062A\u0642\u0627\u0644\u0629", (e) => e.status === "active" && e.end ? [it(e, "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u0642\u0627\u0644\u0629 " + e.end + " \u0645\u0633\u062C\u064E\u0651\u0644 \u0644\u0643\u0646 \u0627\u0644\u062D\u0627\u0644\u0629 \xAB\u0645\u0624\u0645\u0646 \u0639\u0644\u064A\u0647\xBB")] : []],
    ["resigned_no_end", "warn", "\u0645\u0633\u062A\u0642\u064A\u0644 \u0628\u0644\u0627 \u062A\u0627\u0631\u064A\u062E \u0627\u0633\u062A\u0642\u0627\u0644\u0629", (e) => e.status !== "active" && !e.end ? [it(e, "\u0627\u0644\u062D\u0627\u0644\u0629 \u0645\u0633\u062A\u0642\u064A\u0644 \u0648\u0644\u0627 \u064A\u0648\u062C\u062F \u062A\u0627\u0631\u064A\u062E")] : []],
    ["future_start", "info", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u062D\u0627\u0642 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644", (e) => e.start && e.start > today0() ? [it(e, "\u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642 " + e.start)] : []],
    ["nid_bad", "err", "\u0631\u0642\u0645 \u0642\u0648\u0645\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D", (e) => {
      if (!e.nid) return [];
      const r = nidInfo(e);
      return r && !r.valid ? [it(e, "\u0627\u0644\u0631\u0642\u0645 " + e.nid + " \u2014 " + (r.error || "\u063A\u064A\u0631 \u0635\u0627\u0644\u062D"))] : [];
    }],
    ["young_start", "warn", "\u0633\u0646 \u0623\u0642\u0644 \u0645\u0646 16 \u0633\u0646\u0629 \u0648\u0642\u062A \u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642 (\u0645\u0646 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064A)", (e) => {
      const r = nidInfo(e);
      if (!r || !r.valid || !r.birth || !e.start) return [];
      const d = /* @__PURE__ */ new Date(e.start + "T00:00:00"), b = /* @__PURE__ */ new Date(r.birth + "T00:00:00");
      let a = d.getFullYear() - b.getFullYear();
      if (d < new Date(d.getFullYear(), b.getMonth(), b.getDate())) a--;
      return a < 16 ? [it(e, "\u0627\u0644\u0633\u0646 \u0648\u0642\u062A \u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642 " + a + " \u0633\u0646\u0629 (\u0627\u0644\u0645\u064A\u0644\u0627\u062F " + r.birth + " \u0648\u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642 " + e.start + ")")] : [];
    }],
    ["wage_zero", "err", "\u0623\u062C\u0631 \u0641\u0627\u0631\u063A \u0623\u0648 \u0635\u0641\u0631", (e) => e.status === "active" && !(+e.wage > 0) ? [it(e, "\u0644\u0627 \u064A\u0648\u062C\u062F \u0623\u062C\u0631 \u0645\u0633\u062C\u064E\u0651\u0644")] : []],
    ["wage_min", "info", "\u0623\u062C\u0631 \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 \u0627\u0644\u062A\u0623\u0645\u064A\u0646\u064A (\u064A\u064F\u062D\u062A\u0633\u0628 \u0639\u0644\u064A\u0647 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649)", (e) => e.status === "active" && +e.wage > 0 && +e.wage < +S.cfg.min ? [it(e, "\u0627\u0644\u0623\u062C\u0631 " + e.wage + " \u0648\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 " + S.cfg.min)] : []],
    ["wage_max", "info", "\u0623\u062C\u0631 \u0623\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u062A\u0623\u0645\u064A\u0646\u064A (\u064A\u064F\u062D\u062A\u0633\u0628 \u0639\u0644\u064A\u0647 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649)", (e) => e.status === "active" && +e.wage > +S.cfg.max ? [it(e, "\u0627\u0644\u0623\u062C\u0631 " + e.wage + " \u0648\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 " + S.cfg.max)] : []],
    ["no_company", "err", "\u0634\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629", (e) => !S.companies.some((c) => c.id === e.cid) ? [it(e, "\u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0645\u062D\u0630\u0648\u0641\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629")] : []],
    ["req_in_confirmed", "warn", "\u0631\u0633\u0627\u0644\u0629 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0627\u0644\u062A\u062D\u0627\u0642 \xAB\u062A\u0645\xBB \u0628\u0644\u0627 \u0631\u0642\u0645 \u0637\u0644\u0628", (e) => e.inSt === CFS[1] && !String(e.reqIn || "").trim() ? [it(e, "\u062A\u0623\u0643\u064A\u062F \u0628\u0644\u0627 \u0631\u0642\u0645 \u0637\u0644\u0628 \u0627\u0644\u062A\u062D\u0627\u0642")] : []],
    ["req_out_confirmed", "warn", "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0627\u0633\u062A\u0642\u0627\u0644\u0629 \xAB\u062A\u0645\xBB \u0628\u0644\u0627 \u0631\u0642\u0645 \u0637\u0644\u0628 \u062E\u0631\u0648\u062C", (e) => e.outSt === CFS[1] && !String(e.reqOut || "").trim() ? [it(e, "\u062A\u0623\u0643\u064A\u062F \u0628\u0644\u0627 \u0631\u0642\u0645 \u0637\u0644\u0628 \u062E\u0631\u0648\u062C")] : []],
    ["req_out_active", "warn", "\u0637\u0644\u0628 \u062E\u0631\u0648\u062C \u0645\u0633\u062C\u064E\u0651\u0644 \u0644\u0645\u0648\u0638\u0641 \u0645\u0627 \u0632\u0627\u0644 \u0645\u0624\u0645\u0646\u064B\u0627 \u0639\u0644\u064A\u0647", (e) => e.status === "active" && String(e.reqOut || "").trim() ? [it(e, "\u0631\u0642\u0645 \u0637\u0644\u0628 \u0627\u0644\u062E\u0631\u0648\u062C " + e.reqOut)] : []],
    ["rtype_missing", "info", "\u0645\u0633\u062A\u0642\u064A\u0644 \u0628\u0644\u0627 \u0633\u0628\u0628 \u062E\u0631\u0648\u062C", (e) => e.status !== "active" && !e.rtype ? [it(e, "\u0644\u0645 \u064A\u064F\u062D\u062F\u064E\u0651\u062F \u0633\u0628\u0628 \u0627\u0644\u062E\u0631\u0648\u062C")] : []],
    ["id_expired", "warn", "\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064A \u0645\u0646\u062A\u0647\u064A\u0629", (e) => e.nidExp && e.nidExp < today0() ? [it(e, "\u0627\u0646\u062A\u0647\u062A \u0641\u064A " + e.nidExp)] : []]
  ];
  function dups(key, label, sev, getKey, desc) {
    const m = /* @__PURE__ */ new Map();
    E().forEach((e) => {
      const k = getKey(e);
      if (!k) return;
      (m.get(k) || m.set(k, []).get(k)).push(e);
    });
    const items = [];
    m.forEach((l, k) => {
      if (l.length > 1) l.forEach((e) => items.push({ eid: e.id, name: e.name || "\u2014", company: cn(e.cid), text: desc(k) + " \u2014 \u0645\u0643\u0631\u0631 \u0645\u0639: " + l.filter((x) => x !== e).map((x) => x.name).join("\u060C ") }));
    });
    return { id: key, sev, title: label, items };
  }
  function audit() {
    const groups = CHECKS.map(([id, sev, title, fn]) => ({ id, sev, title, items: E().flatMap((e) => {
      try {
        return fn(e);
      } catch (x) {
        return [];
      }
    }) }));
    groups.push(dups("dup_nid", "\u0631\u0642\u0645 \u0642\u0648\u0645\u064A \u0645\u0643\u0631\u0631", "err", (e) => dig3(e.nid || "").replace(/\D/g, "").length === 14 ? dig3(e.nid).replace(/\D/g, "") : "", (k) => "\u0627\u0644\u0631\u0642\u0645 " + k));
    groups.push(dups("dup_insno", "\u0631\u0642\u0645 \u062A\u0623\u0645\u064A\u0646\u064A \u0645\u0643\u0631\u0631", "err", (e) => String(e.insno || "").trim(), (k) => "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062A\u0623\u0645\u064A\u0646\u064A " + k));
    groups.push(dups("dup_code", "\u0643\u0648\u062F \u0645\u0643\u0631\u0631 \u062F\u0627\u062E\u0644 \u0646\u0641\u0633 \u0627\u0644\u0634\u0631\u0643\u0629", "warn", (e) => e.code ? e.cid + "|" + e.code : "", (k) => "\u0627\u0644\u0643\u0648\u062F " + k.split("|")[1]));
    try {
      const months = [...new Set(PY().map((b) => b.month))].sort();
      if (months.length && typeof reconAll === "function") {
        const m = months[months.length - 1], r = reconAll(m), bad = r.it.filter((i) => !GOOD.includes(i.t));
        groups.push({ id: "payroll", sev: bad.some((i) => TT[i.t][1] === "r") ? "err" : "warn", title: "\u0627\u062E\u062A\u0644\u0627\u0641 \u0643\u0634\u0641 " + m + " \u0639\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C", items: bad.map((i) => ({ eid: i.e && i.e.id, name: i.e && i.e.name || i.ps && i.ps[0] && i.ps[0].name || "\u2014", company: i.e ? cn(i.e.cid) : "", text: TT[i.t][0] + (i.m ? " \u2014 " + i.m : "") })) });
      }
    } catch (x) {
    }
    const found = groups.filter((g) => g.items.length);
    const sum = { err: 0, warn: 0, info: 0, total: 0 };
    found.forEach((g) => {
      sum[g.sev] += g.items.length;
      sum.total += g.items.length;
    });
    return { at: (/* @__PURE__ */ new Date()).toISOString(), employees: E().length, groups: found, summary: sum, checked: groups.length };
  }
  function toReport(a) {
    const when = new Date(a.at).toLocaleString("ar-EG");
    return {
      title: "\u062A\u0642\u0631\u064A\u0631 \u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
      subtitle: "\u062A\u0645 \u0641\u062D\u0635 " + a.employees + " \u0645\u0648\u0638\u0641 \u0628\u0640 " + a.checked + " \u0641\u062D\u0635\u064B\u0627 \u2014 " + when + " \u2014 \u0623\u062E\u0637\u0627\u0621: " + a.summary.err + " \u2022 \u0645\u0631\u0627\u062C\u0639\u0629: " + a.summary.warn + " \u2022 \u0645\u0644\u0627\u062D\u0638\u0627\u062A: " + a.summary.info + ". \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637 \u0648\u0644\u0627 \u064A\u063A\u064A\u0651\u0631 \u0623\u064A \u0628\u064A\u0627\u0646.",
      sections: a.groups.sort((x, y) => ["err", "warn", "info"].indexOf(x.sev) - ["err", "warn", "info"].indexOf(y.sev)).map((g) => ({ title: g.title + " (" + g.items.length + ")", sev: g.sev, columns: [{ k: "name", l: "\u0627\u0644\u0627\u0633\u0645" }, { k: "company", l: "\u0627\u0644\u0634\u0631\u0643\u0629" }, { k: "text", l: "\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644" }], rows: g.items }))
    };
  }
  var summaryText = (a) => a.summary.total ? "\u0648\u062C\u062F\u062A " + a.summary.total + " \u0645\u0644\u0627\u062D\u0638\u0629: " + a.summary.err + " \u062E\u0637\u0623 \u0645\u0624\u0643\u062F\u060C " + a.summary.warn + " \u062A\u062D\u062A\u0627\u062C \u0645\u0631\u0627\u062C\u0639\u0629\u060C " + a.summary.info + " \u0645\u0644\u0627\u062D\u0638\u0627\u062A.\n" + a.groups.slice(0, 6).map((g) => "\u2022 " + g.title + ": " + g.items.length).join("\n") : "\u0644\u0645 \u0623\u062C\u062F \u0623\u064A \u062A\u0646\u0627\u0642\u0636 \u0641\u064A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0639\u062F " + a.checked + " \u0641\u062D\u0635\u064B\u0627.";

  // ui/src/core/assist.js
  var norm3 = (s) => String(s || "").replace(/[\u064B-\u065F\u0640]/g, "").replace(/[أإآ]/g, "\u0627").replace(/ى/g, "\u064A").replace(/ة/g, "\u0647");
  var AUDIT = /(تناقض|تناقضات|تدقيق|فحص (ال)?بيانات|مراجعه (ال)?بيانات|اخطاء (في )?(ال)?بيانات|بيانات (غلط|خاطئه)|اكتشف (ال)?(اخطاء|تناقضات))/;
  function reg(spec) {
    const m = window.amanReports = window.amanReports || /* @__PURE__ */ new Map();
    const id = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    m.set(id, spec);
    if (m.size > 20) m.delete(m.keys().next().value);
    return id;
  }
  var btn = (id, label) => `<div class=acts><button class='btn sm' onclick="AmanUI.openReport('${id}')">${label}</button></div>`;
  function answer(q) {
    const t = norm3(q);
    if (AUDIT.test(t)) {
      const a = audit(), id2 = reg(toReport(a));
      return { text: summaryText(a), html: a.summary.total ? btn(id2, "\u0641\u062A\u062D \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0643\u0627\u0645\u0644") : "" };
    }
    const r = ask(q);
    if (!r) return null;
    const id = reg(r.report);
    return { text: r.text, html: r.result.count ? btn(id, "\u0639\u0631\u0636 \u0627\u0644\u0646\u062A\u0627\u0626\u062C (" + fm(r.result.count) + ")") : "" };
  }
  function install2() {
    const A = window.a9;
    if (!A || typeof A.assist !== "function") return;
    const orig = A.assist;
    A.assist = function(q) {
      try {
        if (window.AmanUI && AmanUI.hostReady && AmanUI.hostReady()) {
          const r = answer(q);
          if (r) return r;
        }
      } catch (e) {
        console.error("[AmanUI] assist", e);
      }
      return orig.apply(this, arguments);
    };
  }

  // node_modules/@vue/shared/dist/shared.esm-bundler.js
  // @__NO_SIDE_EFFECTS__
  function makeMap(str) {
    const map2 = /* @__PURE__ */ Object.create(null);
    for (const key of str.split(",")) map2[key] = 1;
    return (val) => val in map2;
  }
  var EMPTY_OBJ = true ? Object.freeze({}) : {};
  var EMPTY_ARR = true ? Object.freeze([]) : [];
  var NOOP = () => {
  };
  var extend = Object.assign;
  var remove = (arr, el) => {
    const i = arr.indexOf(el);
    if (i > -1) {
      arr.splice(i, 1);
    }
  };
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasOwn = (val, key) => hasOwnProperty.call(val, key);
  var isArray = Array.isArray;
  var isMap = (val) => toTypeString(val) === "[object Map]";
  var isSet = (val) => toTypeString(val) === "[object Set]";
  var isFunction = (val) => typeof val === "function";
  var isString = (val) => typeof val === "string";
  var isSymbol = (val) => typeof val === "symbol";
  var isObject = (val) => val !== null && typeof val === "object";
  var isPromise = (val) => {
    return (isObject(val) || isFunction(val)) && isFunction(val.then) && isFunction(val.catch);
  };
  var objectToString = Object.prototype.toString;
  var toTypeString = (value) => objectToString.call(value);
  var toRawType = (value) => {
    return toTypeString(value).slice(8, -1);
  };
  var isPlainObject = (val) => toTypeString(val) === "[object Object]";
  var isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
  var STRING_CACHE_MAX_SIZE = 1e4;
  var cacheStringFunction = (fn) => {
    let cache2 = /* @__PURE__ */ Object.create(null);
    let size = 0;
    return ((str) => {
      const hit = cache2[str];
      if (hit !== void 0) return hit;
      if (++size > STRING_CACHE_MAX_SIZE) {
        cache2 = /* @__PURE__ */ Object.create(null);
        size = 1;
      }
      return cache2[str] = fn(str);
    });
  };
  var capitalize = /* @__PURE__ */ cacheStringFunction((str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
  var toHandlerKey = /* @__PURE__ */ cacheStringFunction((str) => {
    const s = str ? `on${capitalize(str)}` : ``;
    return s;
  });
  var hasChanged = (value, oldValue) => !Object.is(value, oldValue);
  var def = (obj, key, value, writable = false) => {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: false,
      writable,
      value
    });
  };
  var _globalThis;
  var getGlobalThis = () => {
    return _globalThis || (_globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
  };
  var specialBooleanAttrs = `itemscope,allowfullscreen,disablepictureinpicture,disableremoteplayback,formnovalidate,ismap,nomodule,novalidate,playsinline,readonly`;
  var isBooleanAttr = /* @__PURE__ */ makeMap(
    specialBooleanAttrs + `,async,autofocus,autoplay,controls,default,defer,disabled,inert,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected`
  );

  // node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
  function warn(msg, ...args) {
    console.warn(`[Vue warn] ${msg}`, ...args);
  }
  var activeEffectScope;
  function getCurrentScope() {
    return activeEffectScope;
  }
  var activeSub;
  var pausedQueueEffects = /* @__PURE__ */ new WeakSet();
  var ReactiveEffect = class {
    constructor(fn) {
      this.fn = fn;
      this.deps = void 0;
      this.depsTail = void 0;
      this.flags = 1 | 4;
      this.next = void 0;
      this.cleanup = void 0;
      this.scheduler = void 0;
      if (activeEffectScope) {
        if (activeEffectScope.active) {
          activeEffectScope.effects.push(this);
        } else {
          this.flags &= -2;
        }
      }
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      if (this.flags & 64) {
        this.flags &= -65;
        if (pausedQueueEffects.has(this)) {
          pausedQueueEffects.delete(this);
          this.trigger();
        }
      }
    }
    /**
     * @internal
     */
    notify() {
      if (this.flags & 2 && !(this.flags & 32)) {
        return;
      }
      if (!(this.flags & 8)) {
        batch(this);
      }
    }
    run() {
      if (!(this.flags & 1)) {
        return this.fn();
      }
      this.flags |= 2;
      cleanupEffect(this);
      prepareDeps(this);
      const prevEffect = activeSub;
      const prevShouldTrack = shouldTrack;
      activeSub = this;
      shouldTrack = true;
      try {
        return this.fn();
      } finally {
        if (activeSub !== this) {
          warn(
            "Active effect was not restored correctly - this is likely a Vue internal bug."
          );
        }
        cleanupDeps(this);
        activeSub = prevEffect;
        shouldTrack = prevShouldTrack;
        this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let link = this.deps; link; link = link.nextDep) {
          removeSub(link);
        }
        this.deps = this.depsTail = void 0;
        cleanupEffect(this);
        this.onStop && this.onStop();
        this.flags &= -2;
      }
    }
    trigger() {
      if (this.flags & 64) {
        pausedQueueEffects.add(this);
      } else if (this.scheduler) {
        this.scheduler();
      } else {
        this.runIfDirty();
      }
    }
    /**
     * @internal
     */
    runIfDirty() {
      if (isDirty(this)) {
        this.run();
      }
    }
    get dirty() {
      return isDirty(this);
    }
  };
  var batchDepth = 0;
  var batchedSub;
  var batchedComputed;
  function batch(sub, isComputed = false) {
    sub.flags |= 8;
    if (isComputed) {
      sub.next = batchedComputed;
      batchedComputed = sub;
      return;
    }
    sub.next = batchedSub;
    batchedSub = sub;
  }
  function startBatch() {
    batchDepth++;
  }
  function endBatch() {
    if (--batchDepth > 0) {
      return;
    }
    if (batchedComputed) {
      let e = batchedComputed;
      batchedComputed = void 0;
      while (e) {
        const next = e.next;
        e.next = void 0;
        e.flags &= -9;
        e = next;
      }
    }
    let error;
    while (batchedSub) {
      let e = batchedSub;
      batchedSub = void 0;
      while (e) {
        const next = e.next;
        e.next = void 0;
        e.flags &= -9;
        if (e.flags & 1) {
          try {
            ;
            e.trigger();
          } catch (err) {
            if (!error) error = err;
          }
        }
        e = next;
      }
    }
    if (error) throw error;
  }
  function prepareDeps(sub) {
    for (let link = sub.deps; link; link = link.nextDep) {
      link.version = -1;
      link.prevActiveLink = link.dep.activeLink;
      link.dep.activeLink = link;
    }
  }
  function cleanupDeps(sub) {
    let head;
    let tail = sub.depsTail;
    let link = tail;
    while (link) {
      const prev = link.prevDep;
      if (link.version === -1) {
        if (link === tail) tail = prev;
        removeSub(link);
        removeDep(link);
      } else {
        head = link;
      }
      link.dep.activeLink = link.prevActiveLink;
      link.prevActiveLink = void 0;
      link = prev;
    }
    sub.deps = head;
    sub.depsTail = tail;
  }
  function isDirty(sub) {
    for (let link = sub.deps; link; link = link.nextDep) {
      if (link.dep.version !== link.version || link.dep.computed && (refreshComputed(link.dep.computed) || link.dep.version !== link.version)) {
        return true;
      }
    }
    if (sub._dirty) {
      return true;
    }
    return false;
  }
  function refreshComputed(computed2) {
    if (computed2.flags & 4 && !(computed2.flags & 16)) {
      return;
    }
    computed2.flags &= -17;
    if (computed2.globalVersion === globalVersion) {
      return;
    }
    computed2.globalVersion = globalVersion;
    if (!computed2.isSSR && computed2.flags & 128 && (!computed2.deps && !computed2._dirty || !isDirty(computed2))) {
      return;
    }
    computed2.flags |= 2;
    const dep = computed2.dep;
    const prevSub = activeSub;
    const prevShouldTrack = shouldTrack;
    activeSub = computed2;
    shouldTrack = true;
    try {
      prepareDeps(computed2);
      const value = computed2.fn(computed2._value);
      if (dep.version === 0 || hasChanged(value, computed2._value)) {
        computed2.flags |= 128;
        computed2._value = value;
        dep.version++;
      }
    } catch (err) {
      dep.version++;
      throw err;
    } finally {
      activeSub = prevSub;
      shouldTrack = prevShouldTrack;
      cleanupDeps(computed2);
      computed2.flags &= -3;
    }
  }
  function removeSub(link, soft = false) {
    const { dep, prevSub, nextSub } = link;
    if (prevSub) {
      prevSub.nextSub = nextSub;
      link.prevSub = void 0;
    }
    if (nextSub) {
      nextSub.prevSub = prevSub;
      link.nextSub = void 0;
    }
    if (dep.subsHead === link) {
      dep.subsHead = nextSub;
    }
    if (dep.subs === link) {
      dep.subs = prevSub;
      if (!prevSub && dep.computed) {
        dep.computed.flags &= -5;
        for (let l = dep.computed.deps; l; l = l.nextDep) {
          removeSub(l, true);
        }
      }
    }
    if (!soft && !--dep.sc && dep.map) {
      dep.map.delete(dep.key);
    }
  }
  function removeDep(link) {
    const { prevDep, nextDep } = link;
    if (prevDep) {
      prevDep.nextDep = nextDep;
      link.prevDep = void 0;
    }
    if (nextDep) {
      nextDep.prevDep = prevDep;
      link.nextDep = void 0;
    }
  }
  var shouldTrack = true;
  var trackStack = [];
  function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
  }
  function resetTracking() {
    const last = trackStack.pop();
    shouldTrack = last === void 0 ? true : last;
  }
  function cleanupEffect(e) {
    const { cleanup } = e;
    e.cleanup = void 0;
    if (cleanup) {
      const prevSub = activeSub;
      activeSub = void 0;
      try {
        cleanup();
      } finally {
        activeSub = prevSub;
      }
    }
  }
  var globalVersion = 0;
  var Link = class {
    constructor(sub, dep) {
      this.sub = sub;
      this.dep = dep;
      this.version = dep.version;
      this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  };
  var Dep = class {
    // TODO isolatedDeclarations "__v_skip"
    constructor(computed2) {
      this.computed = computed2;
      this.version = 0;
      this.activeLink = void 0;
      this.subs = void 0;
      this.map = void 0;
      this.key = void 0;
      this.sc = 0;
      this.__v_skip = true;
      if (true) {
        this.subsHead = void 0;
      }
    }
    track(debugInfo) {
      if (!activeSub || !shouldTrack || activeSub === this.computed) {
        return;
      }
      let link = this.activeLink;
      if (link === void 0 || link.sub !== activeSub) {
        link = this.activeLink = new Link(activeSub, this);
        if (!activeSub.deps) {
          activeSub.deps = activeSub.depsTail = link;
        } else {
          link.prevDep = activeSub.depsTail;
          activeSub.depsTail.nextDep = link;
          activeSub.depsTail = link;
        }
        addSub(link);
      } else if (link.version === -1) {
        link.version = this.version;
        if (link.nextDep) {
          const next = link.nextDep;
          next.prevDep = link.prevDep;
          if (link.prevDep) {
            link.prevDep.nextDep = next;
          }
          link.prevDep = activeSub.depsTail;
          link.nextDep = void 0;
          activeSub.depsTail.nextDep = link;
          activeSub.depsTail = link;
          if (activeSub.deps === link) {
            activeSub.deps = next;
          }
        }
      }
      if (activeSub.onTrack) {
        activeSub.onTrack(
          extend(
            {
              effect: activeSub
            },
            debugInfo
          )
        );
      }
      return link;
    }
    trigger(debugInfo) {
      this.version++;
      globalVersion++;
      this.notify(debugInfo);
    }
    notify(debugInfo) {
      startBatch();
      try {
        if (true) {
          for (let head = this.subsHead; head; head = head.nextSub) {
            if (head.sub.onTrigger && !(head.sub.flags & 8)) {
              head.sub.onTrigger(
                extend(
                  {
                    effect: head.sub
                  },
                  debugInfo
                )
              );
            }
          }
        }
        for (let link = this.subs; link; link = link.prevSub) {
          if (link.sub.notify()) {
            ;
            link.sub.dep.notify();
          }
        }
      } finally {
        endBatch();
      }
    }
  };
  function addSub(link) {
    link.dep.sc++;
    if (link.sub.flags & 4) {
      const computed2 = link.dep.computed;
      if (computed2 && !link.dep.subs) {
        computed2.flags |= 4 | 16;
        for (let l = computed2.deps; l; l = l.nextDep) {
          addSub(l);
        }
      }
      const currentTail = link.dep.subs;
      if (currentTail !== link) {
        link.prevSub = currentTail;
        if (currentTail) currentTail.nextSub = link;
      }
      if (link.dep.subsHead === void 0) {
        link.dep.subsHead = link;
      }
      link.dep.subs = link;
    }
  }
  var targetMap = /* @__PURE__ */ new WeakMap();
  var ITERATE_KEY = /* @__PURE__ */ Symbol(
    true ? "Object iterate" : ""
  );
  var MAP_KEY_ITERATE_KEY = /* @__PURE__ */ Symbol(
    true ? "Map keys iterate" : ""
  );
  var ARRAY_ITERATE_KEY = /* @__PURE__ */ Symbol(
    true ? "Array iterate" : ""
  );
  function track(target, type, key) {
    if (shouldTrack && activeSub) {
      let depsMap = targetMap.get(target);
      if (!depsMap) {
        targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
      }
      let dep = depsMap.get(key);
      if (!dep) {
        depsMap.set(key, dep = new Dep());
        dep.map = depsMap;
        dep.key = key;
      }
      if (true) {
        dep.track({
          target,
          type,
          key
        });
      } else {
        dep.track();
      }
    }
  }
  function trigger(target, type, key, newValue, oldValue, oldTarget) {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
      globalVersion++;
      return;
    }
    const run2 = (dep) => {
      if (dep) {
        if (true) {
          dep.trigger({
            target,
            type,
            key,
            newValue,
            oldValue,
            oldTarget
          });
        } else {
          dep.trigger();
        }
      }
    };
    startBatch();
    if (type === "clear") {
      depsMap.forEach(run2);
    } else {
      const targetIsArray = isArray(target);
      const isArrayIndex = targetIsArray && isIntegerKey(key);
      if (targetIsArray && key === "length") {
        const newLength = Number(newValue);
        depsMap.forEach((dep, key2) => {
          if (key2 === "length" || key2 === ARRAY_ITERATE_KEY || !isSymbol(key2) && key2 >= newLength) {
            run2(dep);
          }
        });
      } else {
        if (key !== void 0 || depsMap.has(void 0)) {
          run2(depsMap.get(key));
        }
        if (isArrayIndex) {
          run2(depsMap.get(ARRAY_ITERATE_KEY));
        }
        switch (type) {
          case "add":
            if (!targetIsArray) {
              run2(depsMap.get(ITERATE_KEY));
              if (isMap(target)) {
                run2(depsMap.get(MAP_KEY_ITERATE_KEY));
              }
            } else if (isArrayIndex) {
              run2(depsMap.get("length"));
            }
            break;
          case "delete":
            if (!targetIsArray) {
              run2(depsMap.get(ITERATE_KEY));
              if (isMap(target)) {
                run2(depsMap.get(MAP_KEY_ITERATE_KEY));
              }
            }
            break;
          case "set":
            if (isMap(target)) {
              run2(depsMap.get(ITERATE_KEY));
            }
            break;
        }
      }
    }
    endBatch();
  }
  function reactiveReadArray(array) {
    const raw = /* @__PURE__ */ toRaw(array);
    if (raw === array) return raw;
    track(raw, "iterate", ARRAY_ITERATE_KEY);
    if (/* @__PURE__ */ isShallow(array)) return raw;
    if (!/* @__PURE__ */ isReadonly(array)) return raw.map(toReactive);
    return /* @__PURE__ */ isReactive(array) ? raw.map((item) => toReadonly(toReactive(item))) : raw.map(toReadonly);
  }
  function shallowReadArray(arr) {
    track(arr = /* @__PURE__ */ toRaw(arr), "iterate", ARRAY_ITERATE_KEY);
    return arr;
  }
  function toWrapped(target, item) {
    if (/* @__PURE__ */ isReadonly(target)) {
      return /* @__PURE__ */ isReactive(target) ? toReadonly(toReactive(item)) : toReadonly(item);
    }
    return toReactive(item);
  }
  var arrayInstrumentations = {
    __proto__: null,
    [Symbol.iterator]() {
      return iterator(this, Symbol.iterator, (item) => toWrapped(this, item));
    },
    concat(...args) {
      return reactiveReadArray(this).concat(
        ...args.map((x) => isArray(x) ? reactiveReadArray(x) : x)
      );
    },
    entries() {
      return iterator(this, "entries", (value) => {
        value[1] = toWrapped(this, value[1]);
        return value;
      });
    },
    every(fn, thisArg) {
      return apply(this, "every", fn, thisArg, void 0, arguments);
    },
    filter(fn, thisArg) {
      return apply(
        this,
        "filter",
        fn,
        thisArg,
        (v) => v.map((item) => toWrapped(this, item)),
        arguments
      );
    },
    find(fn, thisArg) {
      return apply(
        this,
        "find",
        fn,
        thisArg,
        (item) => toWrapped(this, item),
        arguments
      );
    },
    findIndex(fn, thisArg) {
      return apply(this, "findIndex", fn, thisArg, void 0, arguments);
    },
    findLast(fn, thisArg) {
      return apply(
        this,
        "findLast",
        fn,
        thisArg,
        (item) => toWrapped(this, item),
        arguments
      );
    },
    findLastIndex(fn, thisArg) {
      return apply(this, "findLastIndex", fn, thisArg, void 0, arguments);
    },
    // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
    forEach(fn, thisArg) {
      return apply(this, "forEach", fn, thisArg, void 0, arguments);
    },
    includes(...args) {
      return searchProxy(this, "includes", args);
    },
    indexOf(...args) {
      return searchProxy(this, "indexOf", args);
    },
    join(separator) {
      return reactiveReadArray(this).join(separator);
    },
    // keys() iterator only reads `length`, no optimization required
    lastIndexOf(...args) {
      return searchProxy(this, "lastIndexOf", args);
    },
    map(fn, thisArg) {
      return apply(this, "map", fn, thisArg, void 0, arguments);
    },
    pop() {
      return noTracking(this, "pop");
    },
    push(...args) {
      return noTracking(this, "push", args);
    },
    reduce(fn, ...args) {
      return reduce(this, "reduce", fn, args);
    },
    reduceRight(fn, ...args) {
      return reduce(this, "reduceRight", fn, args);
    },
    shift() {
      return noTracking(this, "shift");
    },
    // slice could use ARRAY_ITERATE but also seems to beg for range tracking
    some(fn, thisArg) {
      return apply(this, "some", fn, thisArg, void 0, arguments);
    },
    splice(...args) {
      return noTracking(this, "splice", args);
    },
    toReversed() {
      return reactiveReadArray(this).toReversed();
    },
    toSorted(comparer) {
      return reactiveReadArray(this).toSorted(comparer);
    },
    toSpliced(...args) {
      return reactiveReadArray(this).toSpliced(...args);
    },
    unshift(...args) {
      return noTracking(this, "unshift", args);
    },
    values() {
      return iterator(this, "values", (item) => toWrapped(this, item));
    }
  };
  function iterator(self2, method, wrapValue) {
    const arr = shallowReadArray(self2);
    const methodFn = arr[method];
    const iter = methodFn.call(arr);
    if (arr !== self2 && !/* @__PURE__ */ isShallow(self2)) {
      if (iter[Symbol.toStringTag] === "Array Iterator") {
        const wrapped = Object.create(Object.getPrototypeOf(iter));
        wrapped.next = () => wrapResult(iter.next(), wrapValue);
        if (methodFn !== arrayProto[method]) {
          Object.defineProperties(wrapped, {
            return: {
              get() {
                const fn = iter.return;
                return typeof fn === "function" ? fn.bind(iter) : fn;
              }
            },
            throw: {
              get() {
                const fn = iter.throw;
                return typeof fn === "function" ? fn.bind(iter) : fn;
              }
            }
          });
        }
        return wrapped;
      }
      iter._next = iter.next;
      iter.next = () => wrapResult(iter._next(), wrapValue);
    }
    return iter;
  }
  function wrapResult(result, wrapValue) {
    if (!result.done) {
      result.value = wrapValue(result.value);
    }
    return result;
  }
  var arrayProto = Array.prototype;
  function apply(self2, method, fn, thisArg, wrappedRetFn, args) {
    const arr = shallowReadArray(self2);
    const needsWrap = arr !== self2 && !/* @__PURE__ */ isShallow(self2);
    const methodFn = arr[method];
    if (methodFn !== arrayProto[method]) {
      const result2 = methodFn.apply(self2, args);
      return needsWrap ? toReactive(result2) : result2;
    }
    let wrappedFn = fn;
    if (arr !== self2) {
      if (needsWrap) {
        wrappedFn = function(item, index) {
          return fn.call(this, toWrapped(self2, item), index, self2);
        };
      } else if (fn.length > 2) {
        wrappedFn = function(item, index) {
          return fn.call(this, item, index, self2);
        };
      }
    }
    const result = methodFn.call(arr, wrappedFn, thisArg);
    return needsWrap && wrappedRetFn ? wrappedRetFn(result) : result;
  }
  function reduce(self2, method, fn, args) {
    const arr = shallowReadArray(self2);
    const needsWrap = arr !== self2 && !/* @__PURE__ */ isShallow(self2);
    let wrappedFn = fn;
    let wrapInitialAccumulator = false;
    if (arr !== self2) {
      if (needsWrap) {
        wrapInitialAccumulator = args.length === 0;
        wrappedFn = function(acc, item, index) {
          if (wrapInitialAccumulator) {
            wrapInitialAccumulator = false;
            acc = toWrapped(self2, acc);
          }
          return fn.call(this, acc, toWrapped(self2, item), index, self2);
        };
      } else if (fn.length > 3) {
        wrappedFn = function(acc, item, index) {
          return fn.call(this, acc, item, index, self2);
        };
      }
    }
    const result = arr[method](wrappedFn, ...args);
    return wrapInitialAccumulator ? toWrapped(self2, result) : result;
  }
  function searchProxy(self2, method, args) {
    const arr = /* @__PURE__ */ toRaw(self2);
    track(arr, "iterate", ARRAY_ITERATE_KEY);
    const res = arr[method](...args);
    if ((res === -1 || res === false) && /* @__PURE__ */ isProxy(args[0])) {
      args[0] = /* @__PURE__ */ toRaw(args[0]);
      return arr[method](...args);
    }
    return res;
  }
  function noTracking(self2, method, args = []) {
    pauseTracking();
    startBatch();
    const res = (/* @__PURE__ */ toRaw(self2))[method].apply(self2, args);
    endBatch();
    resetTracking();
    return res;
  }
  var isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
  var builtInSymbols = /* @__PURE__ */ new Set(
    /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((key) => key !== "arguments" && key !== "caller").map((key) => Symbol[key]).filter(isSymbol)
  );
  function hasOwnProperty2(key) {
    if (!isSymbol(key)) key = String(key);
    const obj = /* @__PURE__ */ toRaw(this);
    track(obj, "has", key);
    return obj.hasOwnProperty(key);
  }
  var BaseReactiveHandler = class {
    constructor(_isReadonly = false, _isShallow = false) {
      this._isReadonly = _isReadonly;
      this._isShallow = _isShallow;
    }
    get(target, key, receiver) {
      if (key === "__v_skip") return target["__v_skip"];
      const isReadonly2 = this._isReadonly, isShallow2 = this._isShallow;
      if (key === "__v_isReactive") {
        return !isReadonly2;
      } else if (key === "__v_isReadonly") {
        return isReadonly2;
      } else if (key === "__v_isShallow") {
        return isShallow2;
      } else if (key === "__v_raw") {
        if (receiver === (isReadonly2 ? isShallow2 ? shallowReadonlyMap : readonlyMap : isShallow2 ? shallowReactiveMap : reactiveMap).get(target) || // receiver is not the reactive proxy, but has the same prototype
        // this means the receiver is a user proxy of the reactive proxy
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)) {
          return target;
        }
        return;
      }
      const targetIsArray = isArray(target);
      if (!isReadonly2) {
        let fn;
        if (targetIsArray && (fn = arrayInstrumentations[key])) {
          return fn;
        }
        if (key === "hasOwnProperty") {
          return hasOwnProperty2;
        }
      }
      const res = Reflect.get(
        target,
        key,
        // if this is a proxy wrapping a ref, return methods using the raw ref
        // as receiver so that we don't have to call `toRaw` on the ref in all
        // its class methods
        /* @__PURE__ */ isRef(target) ? target : receiver
      );
      if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
        return res;
      }
      if (!isReadonly2) {
        track(target, "get", key);
      }
      if (isShallow2) {
        return res;
      }
      if (/* @__PURE__ */ isRef(res)) {
        const value = targetIsArray && isIntegerKey(key) ? res : res.value;
        return isReadonly2 && isObject(value) ? /* @__PURE__ */ readonly(value) : value;
      }
      if (isObject(res)) {
        return isReadonly2 ? /* @__PURE__ */ readonly(res) : /* @__PURE__ */ reactive(res);
      }
      return res;
    }
  };
  var MutableReactiveHandler = class extends BaseReactiveHandler {
    constructor(isShallow2 = false) {
      super(false, isShallow2);
    }
    set(target, key, value, receiver) {
      let oldValue = target[key];
      const isArrayWithIntegerKey = isArray(target) && isIntegerKey(key);
      if (!this._isShallow) {
        const isOldValueReadonly = /* @__PURE__ */ isReadonly(oldValue);
        if (!/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value)) {
          oldValue = /* @__PURE__ */ toRaw(oldValue);
          value = /* @__PURE__ */ toRaw(value);
        }
        if (!isArrayWithIntegerKey && /* @__PURE__ */ isRef(oldValue) && !/* @__PURE__ */ isRef(value)) {
          if (isOldValueReadonly) {
            if (true) {
              warn(
                `Set operation on key "${String(key)}" failed: target is readonly.`,
                target[key]
              );
            }
            return true;
          } else {
            oldValue.value = value;
            return true;
          }
        }
      }
      const hadKey = isArrayWithIntegerKey ? Number(key) < target.length : hasOwn(target, key);
      const result = Reflect.set(
        target,
        key,
        value,
        /* @__PURE__ */ isRef(target) ? target : receiver
      );
      if (target === /* @__PURE__ */ toRaw(receiver) && result) {
        if (!hadKey) {
          trigger(target, "add", key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, "set", key, value, oldValue);
        }
      }
      return result;
    }
    deleteProperty(target, key) {
      const hadKey = hasOwn(target, key);
      const oldValue = target[key];
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
        trigger(target, "delete", key, void 0, oldValue);
      }
      return result;
    }
    has(target, key) {
      const result = Reflect.has(target, key);
      if (!isSymbol(key) || !builtInSymbols.has(key)) {
        track(target, "has", key);
      }
      return result;
    }
    ownKeys(target) {
      track(
        target,
        "iterate",
        isArray(target) ? "length" : ITERATE_KEY
      );
      return Reflect.ownKeys(target);
    }
  };
  var ReadonlyReactiveHandler = class extends BaseReactiveHandler {
    constructor(isShallow2 = false) {
      super(true, isShallow2);
    }
    set(target, key) {
      if (true) {
        warn(
          `Set operation on key "${String(key)}" failed: target is readonly.`,
          target
        );
      }
      return true;
    }
    deleteProperty(target, key) {
      if (true) {
        warn(
          `Delete operation on key "${String(key)}" failed: target is readonly.`,
          target
        );
      }
      return true;
    }
  };
  var mutableHandlers = /* @__PURE__ */ new MutableReactiveHandler();
  var readonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler();
  var shallowReadonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler(true);
  var toShallow = (value) => value;
  var getProto = (v) => Reflect.getPrototypeOf(v);
  function createIterableMethod(method, isReadonly2, isShallow2) {
    return function(...args) {
      const target = this["__v_raw"];
      const rawTarget = /* @__PURE__ */ toRaw(target);
      const targetIsMap = isMap(rawTarget);
      const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
      const isKeyOnly = method === "keys" && targetIsMap;
      const innerIterator = target[method](...args);
      const wrap = isShallow2 ? toShallow : isReadonly2 ? toReadonly : toReactive;
      !isReadonly2 && track(
        rawTarget,
        "iterate",
        isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
      );
      return extend(
        // inheriting all iterator properties
        Object.create(innerIterator),
        {
          // iterator protocol
          next() {
            const { value, done } = innerIterator.next();
            return done ? { value, done } : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            };
          }
        }
      );
    };
  }
  function createReadonlyMethod(type) {
    return function(...args) {
      if (true) {
        const key = args[0] ? `on key "${args[0]}" ` : ``;
        warn(
          `${capitalize(type)} operation ${key}failed: target is readonly.`,
          /* @__PURE__ */ toRaw(this)
        );
      }
      return type === "delete" ? false : type === "clear" ? void 0 : this;
    };
  }
  function createInstrumentations(readonly2, shallow) {
    const instrumentations = {
      get(key) {
        const target = this["__v_raw"];
        const rawTarget = /* @__PURE__ */ toRaw(target);
        const rawKey = /* @__PURE__ */ toRaw(key);
        if (!readonly2) {
          if (hasChanged(key, rawKey)) {
            track(rawTarget, "get", key);
          }
          track(rawTarget, "get", rawKey);
        }
        const { has: has2 } = getProto(rawTarget);
        const wrap = shallow ? toShallow : readonly2 ? toReadonly : toReactive;
        if (has2.call(rawTarget, key)) {
          return wrap(target.get(key));
        } else if (has2.call(rawTarget, rawKey)) {
          return wrap(target.get(rawKey));
        } else if (target !== rawTarget) {
          target.get(key);
        }
      },
      get size() {
        const target = this["__v_raw"];
        !readonly2 && track(/* @__PURE__ */ toRaw(target), "iterate", ITERATE_KEY);
        return target.size;
      },
      has(key) {
        const target = this["__v_raw"];
        const rawTarget = /* @__PURE__ */ toRaw(target);
        const rawKey = /* @__PURE__ */ toRaw(key);
        if (!readonly2) {
          if (hasChanged(key, rawKey)) {
            track(rawTarget, "has", key);
          }
          track(rawTarget, "has", rawKey);
        }
        return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
      },
      forEach(callback, thisArg) {
        const observed = this;
        const target = observed["__v_raw"];
        const rawTarget = /* @__PURE__ */ toRaw(target);
        const wrap = shallow ? toShallow : readonly2 ? toReadonly : toReactive;
        !readonly2 && track(rawTarget, "iterate", ITERATE_KEY);
        return target.forEach((value, key) => {
          return callback.call(thisArg, wrap(value), wrap(key), observed);
        });
      }
    };
    extend(
      instrumentations,
      readonly2 ? {
        add: createReadonlyMethod("add"),
        set: createReadonlyMethod("set"),
        delete: createReadonlyMethod("delete"),
        clear: createReadonlyMethod("clear")
      } : {
        add(value) {
          const target = /* @__PURE__ */ toRaw(this);
          const proto = getProto(target);
          const rawValue = /* @__PURE__ */ toRaw(value);
          const valueToAdd = !shallow && !/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value) ? rawValue : value;
          const hadKey = proto.has.call(target, valueToAdd) || hasChanged(value, valueToAdd) && proto.has.call(target, value) || hasChanged(rawValue, valueToAdd) && proto.has.call(target, rawValue);
          if (!hadKey) {
            target.add(valueToAdd);
            trigger(target, "add", valueToAdd, valueToAdd);
          }
          return this;
        },
        set(key, value) {
          if (!shallow && !/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value)) {
            value = /* @__PURE__ */ toRaw(value);
          }
          const target = /* @__PURE__ */ toRaw(this);
          const { has: has2, get } = getProto(target);
          let hadKey = has2.call(target, key);
          if (!hadKey) {
            key = /* @__PURE__ */ toRaw(key);
            hadKey = has2.call(target, key);
          } else if (true) {
            checkIdentityKeys(target, has2, key);
          }
          const oldValue = get.call(target, key);
          target.set(key, value);
          if (!hadKey) {
            trigger(target, "add", key, value);
          } else if (hasChanged(value, oldValue)) {
            trigger(target, "set", key, value, oldValue);
          }
          return this;
        },
        delete(key) {
          const target = /* @__PURE__ */ toRaw(this);
          const { has: has2, get } = getProto(target);
          let hadKey = has2.call(target, key);
          if (!hadKey) {
            key = /* @__PURE__ */ toRaw(key);
            hadKey = has2.call(target, key);
          } else if (true) {
            checkIdentityKeys(target, has2, key);
          }
          const oldValue = get ? get.call(target, key) : void 0;
          const result = target.delete(key);
          if (hadKey) {
            trigger(target, "delete", key, void 0, oldValue);
          }
          return result;
        },
        clear() {
          const target = /* @__PURE__ */ toRaw(this);
          const hadItems = target.size !== 0;
          const oldTarget = true ? isMap(target) ? new Map(target) : new Set(target) : void 0;
          const result = target.clear();
          if (hadItems) {
            trigger(
              target,
              "clear",
              void 0,
              void 0,
              oldTarget
            );
          }
          return result;
        }
      }
    );
    const iteratorMethods = [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ];
    iteratorMethods.forEach((method) => {
      instrumentations[method] = createIterableMethod(method, readonly2, shallow);
    });
    return instrumentations;
  }
  function createInstrumentationGetter(isReadonly2, shallow) {
    const instrumentations = createInstrumentations(isReadonly2, shallow);
    return (target, key, receiver) => {
      if (key === "__v_isReactive") {
        return !isReadonly2;
      } else if (key === "__v_isReadonly") {
        return isReadonly2;
      } else if (key === "__v_isShallow") {
        return shallow;
      } else if (key === "__v_raw") {
        return target;
      }
      return Reflect.get(
        hasOwn(instrumentations, key) && key in target ? instrumentations : target,
        key,
        receiver
      );
    };
  }
  var mutableCollectionHandlers = {
    get: /* @__PURE__ */ createInstrumentationGetter(false, false)
  };
  var readonlyCollectionHandlers = {
    get: /* @__PURE__ */ createInstrumentationGetter(true, false)
  };
  var shallowReadonlyCollectionHandlers = {
    get: /* @__PURE__ */ createInstrumentationGetter(true, true)
  };
  function checkIdentityKeys(target, has2, key) {
    const rawKey = /* @__PURE__ */ toRaw(key);
    if (rawKey !== key && has2.call(target, rawKey)) {
      const type = toRawType(target);
      warn(
        `Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
      );
    }
  }
  var reactiveMap = /* @__PURE__ */ new WeakMap();
  var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
  var readonlyMap = /* @__PURE__ */ new WeakMap();
  var shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
  function targetTypeMap(rawType) {
    switch (rawType) {
      case "Object":
      case "Array":
        return 1;
      case "Map":
      case "Set":
      case "WeakMap":
      case "WeakSet":
        return 2;
      default:
        return 0;
    }
  }
  // @__NO_SIDE_EFFECTS__
  function reactive(target) {
    if (/* @__PURE__ */ isReadonly(target)) {
      return target;
    }
    return createReactiveObject(
      target,
      false,
      mutableHandlers,
      mutableCollectionHandlers,
      reactiveMap
    );
  }
  // @__NO_SIDE_EFFECTS__
  function readonly(target) {
    return createReactiveObject(
      target,
      true,
      readonlyHandlers,
      readonlyCollectionHandlers,
      readonlyMap
    );
  }
  // @__NO_SIDE_EFFECTS__
  function shallowReadonly(target) {
    return createReactiveObject(
      target,
      true,
      shallowReadonlyHandlers,
      shallowReadonlyCollectionHandlers,
      shallowReadonlyMap
    );
  }
  function createReactiveObject(target, isReadonly2, baseHandlers, collectionHandlers, proxyMap) {
    if (!isObject(target)) {
      if (true) {
        warn(
          `value cannot be made ${isReadonly2 ? "readonly" : "reactive"}: ${String(
            target
          )}`
        );
      }
      return target;
    }
    if (target["__v_raw"] && !(isReadonly2 && target["__v_isReactive"])) {
      return target;
    }
    if (target["__v_skip"] || !Object.isExtensible(target)) {
      return target;
    }
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
      return existingProxy;
    }
    const targetType = targetTypeMap(toRawType(target));
    if (targetType === 0) {
      return target;
    }
    const proxy = new Proxy(
      target,
      targetType === 2 ? collectionHandlers : baseHandlers
    );
    proxyMap.set(target, proxy);
    return proxy;
  }
  // @__NO_SIDE_EFFECTS__
  function isReactive(value) {
    if (/* @__PURE__ */ isReadonly(value)) {
      return /* @__PURE__ */ isReactive(value["__v_raw"]);
    }
    return !!(value && value["__v_isReactive"]);
  }
  // @__NO_SIDE_EFFECTS__
  function isReadonly(value) {
    return !!(value && value["__v_isReadonly"]);
  }
  // @__NO_SIDE_EFFECTS__
  function isShallow(value) {
    return !!(value && value["__v_isShallow"]);
  }
  // @__NO_SIDE_EFFECTS__
  function isProxy(value) {
    return value ? !!value["__v_raw"] : false;
  }
  // @__NO_SIDE_EFFECTS__
  function toRaw(observed) {
    const raw = observed && observed["__v_raw"];
    return raw ? /* @__PURE__ */ toRaw(raw) : observed;
  }
  function markRaw(value) {
    if (!hasOwn(value, "__v_skip") && Object.isExtensible(value)) {
      def(value, "__v_skip", true);
    }
    return value;
  }
  var toReactive = (value) => isObject(value) ? /* @__PURE__ */ reactive(value) : value;
  var toReadonly = (value) => isObject(value) ? /* @__PURE__ */ readonly(value) : value;
  // @__NO_SIDE_EFFECTS__
  function isRef(r) {
    return r ? r["__v_isRef"] === true : false;
  }
  // @__NO_SIDE_EFFECTS__
  function ref(value) {
    return createRef(value, false);
  }
  function createRef(rawValue, shallow) {
    if (/* @__PURE__ */ isRef(rawValue)) {
      return rawValue;
    }
    return new RefImpl(rawValue, shallow);
  }
  var RefImpl = class {
    constructor(value, isShallow2) {
      this.dep = new Dep();
      this["__v_isRef"] = true;
      this["__v_isShallow"] = false;
      this._rawValue = isShallow2 ? value : /* @__PURE__ */ toRaw(value);
      this._value = isShallow2 ? value : toReactive(value);
      this["__v_isShallow"] = isShallow2;
    }
    get value() {
      if (true) {
        this.dep.track({
          target: this,
          type: "get",
          key: "value"
        });
      } else {
        this.dep.track();
      }
      return this._value;
    }
    set value(newValue) {
      const oldValue = this._rawValue;
      const useDirectValue = this["__v_isShallow"] || /* @__PURE__ */ isShallow(newValue) || /* @__PURE__ */ isReadonly(newValue);
      newValue = useDirectValue ? newValue : /* @__PURE__ */ toRaw(newValue);
      if (hasChanged(newValue, oldValue)) {
        this._rawValue = newValue;
        this._value = useDirectValue ? newValue : toReactive(newValue);
        if (true) {
          this.dep.trigger({
            target: this,
            type: "set",
            key: "value",
            newValue,
            oldValue
          });
        } else {
          this.dep.trigger();
        }
      }
    }
  };
  function unref(ref2) {
    return /* @__PURE__ */ isRef(ref2) ? ref2.value : ref2;
  }
  var shallowUnwrapHandlers = {
    get: (target, key, receiver) => key === "__v_raw" ? target : unref(Reflect.get(target, key, receiver)),
    set: (target, key, value, receiver) => {
      const oldValue = target[key];
      if (/* @__PURE__ */ isRef(oldValue) && !/* @__PURE__ */ isRef(value)) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  };
  function proxyRefs(objectWithRefs) {
    return /* @__PURE__ */ isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
  }
  var INITIAL_WATCHER_VALUE = {};
  var cleanupMap = /* @__PURE__ */ new WeakMap();
  var activeWatcher = void 0;
  function onWatcherCleanup(cleanupFn, failSilently = false, owner = activeWatcher) {
    if (owner) {
      let cleanups = cleanupMap.get(owner);
      if (!cleanups) cleanupMap.set(owner, cleanups = []);
      cleanups.push(cleanupFn);
    } else if (!failSilently) {
      warn(
        `onWatcherCleanup() was called when there was no active watcher to associate with.`
      );
    }
  }
  function watch(source, cb, options = EMPTY_OBJ) {
    const { immediate, deep, once, scheduler, augmentJob, call } = options;
    const warnInvalidSource = (s) => {
      (options.onWarn || warn)(
        `Invalid watch source: `,
        s,
        `A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types.`
      );
    };
    const reactiveGetter = (source2) => {
      if (deep) return source2;
      if (/* @__PURE__ */ isShallow(source2) || deep === false || deep === 0)
        return traverse(source2, 1);
      return traverse(source2);
    };
    let effect2;
    let getter;
    let cleanup;
    let boundCleanup;
    let forceTrigger = false;
    let isMultiSource = false;
    if (/* @__PURE__ */ isRef(source)) {
      getter = () => source.value;
      forceTrigger = /* @__PURE__ */ isShallow(source);
    } else if (/* @__PURE__ */ isReactive(source)) {
      getter = () => reactiveGetter(source);
      forceTrigger = true;
    } else if (isArray(source)) {
      isMultiSource = true;
      forceTrigger = source.some((s) => /* @__PURE__ */ isReactive(s) || /* @__PURE__ */ isShallow(s));
      getter = () => source.map((s) => {
        if (/* @__PURE__ */ isRef(s)) {
          return s.value;
        } else if (/* @__PURE__ */ isReactive(s)) {
          return reactiveGetter(s);
        } else if (isFunction(s)) {
          return call ? call(s, 2) : s();
        } else {
          warnInvalidSource(s);
        }
      });
    } else if (isFunction(source)) {
      if (cb) {
        getter = call ? () => call(source, 2) : source;
      } else {
        getter = () => {
          if (cleanup) {
            pauseTracking();
            try {
              cleanup();
            } finally {
              resetTracking();
            }
          }
          const currentEffect = activeWatcher;
          activeWatcher = effect2;
          try {
            return call ? call(source, 3, [boundCleanup]) : source(boundCleanup);
          } finally {
            activeWatcher = currentEffect;
          }
        };
      }
    } else {
      getter = NOOP;
      warnInvalidSource(source);
    }
    if (cb && deep) {
      const baseGetter = getter;
      const depth = deep === true ? Infinity : deep;
      getter = () => traverse(baseGetter(), depth);
    }
    const scope = getCurrentScope();
    const watchHandle = () => {
      effect2.stop();
      if (scope && scope.active) {
        remove(scope.effects, effect2);
      }
    };
    if (once && cb) {
      const _cb = cb;
      cb = (...args) => {
        try {
          return _cb(...args);
        } finally {
          watchHandle();
        }
      };
    }
    let oldValue = isMultiSource ? new Array(source.length).fill(INITIAL_WATCHER_VALUE) : INITIAL_WATCHER_VALUE;
    const job = (immediateFirstRun) => {
      if (!(effect2.flags & 1) || !effect2.dirty && !immediateFirstRun) {
        return;
      }
      if (cb) {
        const newValue = effect2.run();
        if (immediateFirstRun || deep || forceTrigger || (isMultiSource ? newValue.some((v, i) => hasChanged(v, oldValue[i])) : hasChanged(newValue, oldValue))) {
          const currentWatcher = activeWatcher;
          pauseTracking();
          try {
            if (cleanup) {
              cleanup();
            }
            activeWatcher = effect2;
            const args = [
              newValue,
              // pass undefined as the old value when it's changed for the first time
              oldValue === INITIAL_WATCHER_VALUE ? void 0 : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE ? [] : oldValue,
              boundCleanup
            ];
            oldValue = newValue;
            call ? call(cb, 3, args) : (
              // @ts-expect-error
              cb(...args)
            );
          } finally {
            activeWatcher = currentWatcher;
            resetTracking();
          }
        }
      } else {
        effect2.run();
      }
    };
    if (augmentJob) {
      augmentJob(job);
    }
    effect2 = new ReactiveEffect(getter);
    effect2.scheduler = scheduler ? () => scheduler(job, false) : job;
    boundCleanup = (fn) => onWatcherCleanup(fn, false, effect2);
    cleanup = effect2.onStop = () => {
      const cleanups = cleanupMap.get(effect2);
      if (cleanups) {
        if (call) {
          call(cleanups, 4);
        } else {
          for (const cleanup2 of cleanups) cleanup2();
        }
        cleanupMap.delete(effect2);
      }
    };
    if (true) {
      effect2.onTrack = options.onTrack;
      effect2.onTrigger = options.onTrigger;
    }
    if (cb) {
      if (immediate) {
        job(true);
      } else {
        oldValue = effect2.run();
      }
    } else if (scheduler) {
      scheduler(job.bind(null, true), true);
    } else {
      effect2.run();
    }
    watchHandle.pause = effect2.pause.bind(effect2);
    watchHandle.resume = effect2.resume.bind(effect2);
    watchHandle.stop = watchHandle;
    return watchHandle;
  }
  function traverse(value, depth = Infinity, seen) {
    if (depth <= 0 || !isObject(value) || value["__v_skip"]) {
      return value;
    }
    seen = seen || /* @__PURE__ */ new Map();
    if ((seen.get(value) || 0) >= depth) {
      return value;
    }
    seen.set(value, depth);
    depth--;
    if (/* @__PURE__ */ isRef(value)) {
      traverse(value.value, depth, seen);
    } else if (isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        traverse(value[i], depth, seen);
      }
    } else if (isSet(value) || isMap(value)) {
      value.forEach((v) => {
        traverse(v, depth, seen);
      });
    } else if (isPlainObject(value)) {
      for (const key in value) {
        traverse(value[key], depth, seen);
      }
      for (const key of Object.getOwnPropertySymbols(value)) {
        if (Object.prototype.propertyIsEnumerable.call(value, key)) {
          traverse(value[key], depth, seen);
        }
      }
    }
    return value;
  }

  // node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
  var stack = [];
  function pushWarningContext(vnode) {
    stack.push(vnode);
  }
  function popWarningContext() {
    stack.pop();
  }
  var isWarning = false;
  function warn$1(msg, ...args) {
    if (isWarning) return;
    isWarning = true;
    pauseTracking();
    const instance = stack.length ? stack[stack.length - 1].component : null;
    const appWarnHandler = instance && instance.appContext.config.warnHandler;
    const trace = getComponentTrace();
    if (appWarnHandler) {
      callWithErrorHandling(
        appWarnHandler,
        instance,
        11,
        [
          // eslint-disable-next-line no-restricted-syntax
          msg + args.map((a) => {
            var _a, _b;
            return (_b = (_a = a.toString) == null ? void 0 : _a.call(a)) != null ? _b : JSON.stringify(a);
          }).join(""),
          instance && instance.proxy,
          trace.map(
            ({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`
          ).join("\n"),
          trace
        ]
      );
    } else {
      const warnArgs = [`[Vue warn]: ${msg}`, ...args];
      if (trace.length && // avoid spamming console during tests
      true) {
        warnArgs.push(`
`, ...formatTrace(trace));
      }
      console.warn(...warnArgs);
    }
    resetTracking();
    isWarning = false;
  }
  function getComponentTrace() {
    let currentVNode = stack[stack.length - 1];
    if (!currentVNode) {
      return [];
    }
    const normalizedStack = [];
    while (currentVNode) {
      const last = normalizedStack[0];
      if (last && last.vnode === currentVNode) {
        last.recurseCount++;
      } else {
        normalizedStack.push({
          vnode: currentVNode,
          recurseCount: 0
        });
      }
      const parentInstance = currentVNode.component && currentVNode.component.parent;
      currentVNode = parentInstance && parentInstance.vnode;
    }
    return normalizedStack;
  }
  function formatTrace(trace) {
    const logs = [];
    trace.forEach((entry, i) => {
      logs.push(...i === 0 ? [] : [`
`], ...formatTraceEntry(entry));
    });
    return logs;
  }
  function formatTraceEntry({ vnode, recurseCount }) {
    const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
    const isRoot = vnode.component ? vnode.component.parent == null : false;
    const open = ` at <${formatComponentName(
      vnode.component,
      vnode.type,
      isRoot
    )}`;
    const close = `>` + postfix;
    return vnode.props ? [open, ...formatProps(vnode.props), close] : [open + close];
  }
  function formatProps(props) {
    const res = [];
    const keys = Object.keys(props);
    keys.slice(0, 3).forEach((key) => {
      res.push(...formatProp(key, props[key]));
    });
    if (keys.length > 3) {
      res.push(` ...`);
    }
    return res;
  }
  function formatProp(key, value, raw) {
    if (isString(value)) {
      value = JSON.stringify(value);
      return raw ? value : [`${key}=${value}`];
    } else if (typeof value === "number" || typeof value === "boolean" || value == null) {
      return raw ? value : [`${key}=${value}`];
    } else if (isRef(value)) {
      value = formatProp(key, toRaw(value.value), true);
      return raw ? value : [`${key}=Ref<`, value, `>`];
    } else if (isFunction(value)) {
      return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
    } else {
      value = toRaw(value);
      return raw ? value : [`${key}=`, value];
    }
  }
  var ErrorTypeStrings$1 = {
    ["sp"]: "serverPrefetch hook",
    ["bc"]: "beforeCreate hook",
    ["c"]: "created hook",
    ["bm"]: "beforeMount hook",
    ["m"]: "mounted hook",
    ["bu"]: "beforeUpdate hook",
    ["u"]: "updated",
    ["bum"]: "beforeUnmount hook",
    ["um"]: "unmounted hook",
    ["a"]: "activated hook",
    ["da"]: "deactivated hook",
    ["ec"]: "errorCaptured hook",
    ["rtc"]: "renderTracked hook",
    ["rtg"]: "renderTriggered hook",
    [0]: "setup function",
    [1]: "render function",
    [2]: "watcher getter",
    [3]: "watcher callback",
    [4]: "watcher cleanup function",
    [5]: "native event handler",
    [6]: "component event handler",
    [7]: "vnode hook",
    [8]: "directive hook",
    [9]: "transition hook",
    [10]: "app errorHandler",
    [11]: "app warnHandler",
    [12]: "ref function",
    [13]: "async component loader",
    [14]: "scheduler flush",
    [15]: "component update",
    [16]: "app unmount cleanup function"
  };
  function callWithErrorHandling(fn, instance, type, args) {
    try {
      return args ? fn(...args) : fn();
    } catch (err) {
      handleError(err, instance, type);
    }
  }
  function callWithAsyncErrorHandling(fn, instance, type, args) {
    if (isFunction(fn)) {
      const res = callWithErrorHandling(fn, instance, type, args);
      if (res && isPromise(res)) {
        res.catch((err) => {
          handleError(err, instance, type, void 0, true);
        });
      }
      return res;
    }
    if (isArray(fn)) {
      const values = [];
      for (let i = 0; i < fn.length; i++) {
        values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
      }
      return values;
    } else if (true) {
      warn$1(
        `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof fn}`
      );
    }
  }
  function handleError(err, instance, type, throwInDev = true, isAsyncError = false) {
    const contextVNode = instance ? instance.vnode : null;
    const { errorHandler, throwUnhandledErrorInProduction } = instance && instance.appContext.config || EMPTY_OBJ;
    if (instance) {
      let cur2 = instance.parent;
      const exposedInstance = instance.proxy;
      const errorInfo = true ? ErrorTypeStrings$1[type] : `https://vuejs.org/error-reference/#runtime-${type}`;
      while (cur2) {
        const errorCapturedHooks = cur2.ec;
        if (errorCapturedHooks && !cur2.isUnmounted && // Async failures may outlive stopped scopes whose unmount effects
        // are deferred or discarded by Suspense.
        (!isAsyncError || cur2.scope.active)) {
          for (let i = 0; i < errorCapturedHooks.length; i++) {
            if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
              return;
            }
          }
        }
        cur2 = cur2.parent;
      }
      if (errorHandler) {
        pauseTracking();
        callWithErrorHandling(errorHandler, null, 10, [
          err,
          exposedInstance,
          errorInfo
        ]);
        resetTracking();
        return;
      }
    }
    logError(err, type, contextVNode, throwInDev, throwUnhandledErrorInProduction);
  }
  function logError(err, type, contextVNode, throwInDev = true, throwInProd = false) {
    if (true) {
      const info = ErrorTypeStrings$1[type];
      if (contextVNode) {
        pushWarningContext(contextVNode);
      }
      warn$1(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
      if (contextVNode) {
        popWarningContext();
      }
      if (throwInDev) {
        throw err;
      } else {
        console.error(err);
      }
    } else if (throwInProd) {
      throw err;
    } else {
      console.error(err);
    }
  }
  var queue = [];
  var flushIndex = -1;
  var pendingPostFlushCbs = [];
  var activePostFlushCbs = null;
  var postFlushIndex = 0;
  var resolvedPromise = /* @__PURE__ */ Promise.resolve();
  var currentFlushPromise = null;
  var RECURSION_LIMIT = 100;
  function nextTick(fn) {
    const p = currentFlushPromise || resolvedPromise;
    return fn ? p.then(this ? fn.bind(this) : fn) : p;
  }
  function findInsertionIndex(id) {
    let start = flushIndex + 1;
    let end = queue.length;
    while (start < end) {
      const middle = start + end >>> 1;
      const middleJob = queue[middle];
      const middleJobId = getId(middleJob);
      if (middleJobId < id || middleJobId === id && middleJob.flags & 2) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }
    return start;
  }
  function queueJob(job) {
    if (!(job.flags & 1)) {
      const jobId = getId(job);
      const lastJob = queue[queue.length - 1];
      if (!lastJob || // fast path when the job id is larger than the tail
      !(job.flags & 2) && jobId >= getId(lastJob)) {
        queue.push(job);
      } else {
        queue.splice(findInsertionIndex(jobId), 0, job);
      }
      job.flags |= 1;
      queueFlush();
    }
  }
  function queueFlush() {
    if (!currentFlushPromise) {
      currentFlushPromise = resolvedPromise.then(flushJobs);
    }
  }
  function queuePostFlushCb(cb) {
    if (!isArray(cb)) {
      if (activePostFlushCbs && cb.id === -1) {
        activePostFlushCbs.splice(postFlushIndex + 1, 0, cb);
      } else if (!(cb.flags & 1)) {
        pendingPostFlushCbs.push(cb);
        cb.flags |= 1;
      }
    } else {
      for (let i = 0; i < cb.length; i++) {
        pendingPostFlushCbs.push(cb[i]);
      }
    }
    queueFlush();
  }
  function flushPostFlushCbs(seen, skip, minUid = 0) {
    if (pendingPostFlushCbs.length) {
      let cbs = pendingPostFlushCbs;
      let kept = 0;
      if (skip) {
        cbs = [];
        for (let i = 0; i < pendingPostFlushCbs.length; i++) {
          const cb = pendingPostFlushCbs[i];
          if (cb.i !== void 0 ? !cb.i || cb.i.uid < minUid : skip.has(cb)) {
            pendingPostFlushCbs[kept++] = cb;
          } else {
            cbs.push(cb);
          }
        }
      }
      const deduped = [...new Set(cbs)].sort((a, b) => getId(a) - getId(b));
      pendingPostFlushCbs.length = kept;
      if (activePostFlushCbs) {
        for (let i = 0; i < deduped.length; i++) {
          activePostFlushCbs.push(deduped[i]);
        }
        return;
      }
      activePostFlushCbs = deduped;
      if (true) {
        seen = seen || /* @__PURE__ */ new Map();
      }
      for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
        const cb = activePostFlushCbs[postFlushIndex];
        if (checkRecursiveUpdates(seen, cb)) {
          continue;
        }
        if (cb.flags & 4) {
          cb.flags &= -2;
        }
        if (!(cb.flags & 8)) cb();
        cb.flags &= -2;
      }
      activePostFlushCbs = null;
      postFlushIndex = 0;
    }
  }
  var getId = (job) => job.id == null ? job.flags & 2 ? -1 : Infinity : job.id;
  function flushJobs(seen) {
    if (true) {
      seen = seen || /* @__PURE__ */ new Map();
    }
    const check = true ? (job) => checkRecursiveUpdates(seen, job) : NOOP;
    try {
      for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
        const job = queue[flushIndex];
        if (job && !(job.flags & 8)) {
          if (check(job)) {
            continue;
          }
          if (job.flags & 4) {
            job.flags &= ~1;
          }
          callWithErrorHandling(
            job,
            job.i,
            job.i ? 15 : 14
          );
          if (!(job.flags & 4)) {
            job.flags &= ~1;
          }
        }
      }
    } finally {
      for (; flushIndex < queue.length; flushIndex++) {
        const job = queue[flushIndex];
        if (job) {
          job.flags &= -2;
        }
      }
      flushIndex = -1;
      queue.length = 0;
      flushPostFlushCbs(seen);
      currentFlushPromise = null;
      if (queue.length || pendingPostFlushCbs.length) {
        flushJobs(seen);
      }
    }
  }
  function checkRecursiveUpdates(seen, fn) {
    const count = seen.get(fn) || 0;
    if (count > RECURSION_LIMIT) {
      const instance = fn.i;
      const componentName = instance && getComponentName(instance.type);
      handleError(
        `Maximum recursive updates exceeded${componentName ? ` in component <${componentName}>` : ``}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
        null,
        10
      );
      return true;
    }
    seen.set(fn, count + 1);
    return false;
  }
  var isHmrUpdating = false;
  var hmrDirtyComponents = /* @__PURE__ */ new Map();
  if (true) {
    getGlobalThis().__VUE_HMR_RUNTIME__ = {
      createRecord: tryWrap(createRecord),
      rerender: tryWrap(rerender),
      reload: tryWrap(reload)
    };
  }
  var map = /* @__PURE__ */ new Map();
  function createRecord(id, initialDef) {
    if (map.has(id)) {
      return false;
    }
    map.set(id, {
      initialDef: normalizeClassComponent(initialDef),
      instances: /* @__PURE__ */ new Set()
    });
    return true;
  }
  function normalizeClassComponent(component) {
    return isClassComponent(component) ? component.__vccOpts : component;
  }
  function rerender(id, newRender) {
    const record = map.get(id);
    if (!record) {
      return;
    }
    record.initialDef.render = newRender;
    [...record.instances].forEach((instance) => {
      if (newRender) {
        instance.render = newRender;
        normalizeClassComponent(instance.type).render = newRender;
      }
      instance.renderCache = [];
      isHmrUpdating = true;
      if (!(instance.job.flags & 8)) {
        instance.update();
      }
      isHmrUpdating = false;
    });
  }
  function reload(id, newComp) {
    const record = map.get(id);
    if (!record) return;
    newComp = normalizeClassComponent(newComp);
    updateComponentDef(record.initialDef, newComp);
    const instances = [...record.instances];
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      const oldComp = normalizeClassComponent(instance.type);
      let dirtyInstances = hmrDirtyComponents.get(oldComp);
      if (!dirtyInstances) {
        if (oldComp !== record.initialDef) {
          updateComponentDef(oldComp, newComp);
        }
        hmrDirtyComponents.set(oldComp, dirtyInstances = /* @__PURE__ */ new Set());
      }
      dirtyInstances.add(instance);
      instance.appContext.propsCache.delete(instance.type);
      instance.appContext.emitsCache.delete(instance.type);
      instance.appContext.optionsCache.delete(instance.type);
      if (instance.ceReload) {
        dirtyInstances.add(instance);
        instance.ceReload(newComp.styles);
        dirtyInstances.delete(instance);
      } else if (instance.parent) {
        const update = () => {
          if (!instance.scope.active) return;
          const pending = instance.asyncDep && !instance.asyncResolved ? instance : locateUnresolvedAsyncRoot(instance.parent);
          if (pending) {
            pending.asyncDep.catch(NOOP).then(() => {
              if (instance.scope.active && (pending.asyncResolved || !pending.scope.active)) {
                queueJob(update);
              }
            });
            return;
          }
          dirtyInstances = hmrDirtyComponents.get(oldComp);
          if (!dirtyInstances) {
            hmrDirtyComponents.set(oldComp, dirtyInstances = /* @__PURE__ */ new Set());
          }
          dirtyInstances.add(instance);
          isHmrUpdating = true;
          try {
            instance.parent.update();
          } finally {
            isHmrUpdating = false;
            dirtyInstances.delete(instance);
            queuePostFlushCb(() => hmrDirtyComponents.clear());
          }
        };
        queueJob(update);
      } else if (instance.appContext.reload) {
        instance.appContext.reload();
      } else if (typeof window !== "undefined") {
        window.location.reload();
      } else {
        console.warn(
          "[HMR] Root or manually mounted instance modified. Full reload required."
        );
      }
      if (instance.root.ce && instance !== instance.root) {
        instance.root.ce._removeChildStyle(oldComp);
      }
    }
    queuePostFlushCb(() => {
      hmrDirtyComponents.clear();
    });
  }
  function updateComponentDef(oldComp, newComp) {
    extend(oldComp, newComp);
    for (const key in oldComp) {
      if (key !== "__file" && !(key in newComp)) {
        delete oldComp[key];
      }
    }
  }
  function tryWrap(fn) {
    return (id, arg) => {
      try {
        return fn(id, arg);
      } catch (e) {
        console.error(e);
        console.warn(
          `[HMR] Something went wrong during Vue component hot-reload. Full reload required.`
        );
      }
    };
  }
  var currentRenderingInstance = null;
  function inject(key, defaultValue, treatDefaultAsFactory = false) {
    const instance = getCurrentInstance();
    if (instance || currentApp) {
      let provides = currentApp ? currentApp._context.provides : instance ? instance.parent == null || instance.ce ? instance.vnode.appContext && instance.vnode.appContext.provides : instance.parent.provides : void 0;
      if (provides && key in provides) {
        return provides[key];
      } else if (arguments.length > 1) {
        return treatDefaultAsFactory && isFunction(defaultValue) ? defaultValue.call(instance && instance.proxy) : defaultValue;
      } else if (true) {
        warn$1(`injection "${String(key)}" not found.`);
      }
    } else if (true) {
      warn$1(`inject() can only be used inside setup() or functional components.`);
    }
  }
  var ssrContextKey = /* @__PURE__ */ Symbol.for("v-scx");
  var useSSRContext = () => {
    {
      const ctx = inject(ssrContextKey);
      if (!ctx) {
        warn$1(
          `Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build.`
        );
      }
      return ctx;
    }
  };
  function doWatch(source, cb, options = EMPTY_OBJ) {
    const { immediate, deep, flush, once } = options;
    if (!cb) {
      if (immediate !== void 0) {
        warn$1(
          `watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.`
        );
      }
      if (deep !== void 0) {
        warn$1(
          `watch() "deep" option is only respected when using the watch(source, callback, options?) signature.`
        );
      }
      if (once !== void 0) {
        warn$1(
          `watch() "once" option is only respected when using the watch(source, callback, options?) signature.`
        );
      }
    }
    const baseWatchOptions = extend({}, options);
    if (true) baseWatchOptions.onWarn = warn$1;
    const runsImmediately = cb && immediate || !cb && flush !== "post";
    let ssrCleanup;
    if (isInSSRComponentSetup) {
      if (flush === "sync") {
        const ctx = useSSRContext();
        ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = []);
      } else if (!runsImmediately) {
        const watchStopHandle = () => {
        };
        watchStopHandle.stop = NOOP;
        watchStopHandle.resume = NOOP;
        watchStopHandle.pause = NOOP;
        return watchStopHandle;
      }
    }
    const instance = currentInstance;
    baseWatchOptions.call = (fn, type, args) => callWithAsyncErrorHandling(fn, instance, type, args);
    let isPre = false;
    if (flush === "post") {
      baseWatchOptions.scheduler = (job) => {
        job.i = instance;
        queuePostRenderEffect(job, instance && instance.suspense);
      };
    } else if (flush !== "sync") {
      isPre = true;
      baseWatchOptions.scheduler = (job, isFirstRun) => {
        if (isFirstRun) {
          job();
        } else {
          queueJob(job);
        }
      };
    }
    baseWatchOptions.augmentJob = (job) => {
      if (cb) {
        job.flags |= 4;
      }
      if (isPre) {
        job.flags |= 2;
        if (instance) {
          job.id = instance.uid;
          job.i = instance;
        }
      }
    };
    const watchHandle = watch(source, cb, baseWatchOptions);
    if (isInSSRComponentSetup) {
      if (ssrCleanup) {
        ssrCleanup.push(watchHandle);
      } else if (runsImmediately) {
        watchHandle();
      }
    }
    return watchHandle;
  }
  function instanceWatch(source, value, options) {
    const publicThis = this.proxy;
    const getter = isString(source) ? source.includes(".") ? createPathGetter(publicThis, source) : () => publicThis[source] : source.bind(publicThis, publicThis);
    let cb;
    if (isFunction(value)) {
      cb = value;
    } else {
      cb = value.handler;
      options = value;
    }
    const reset = setCurrentInstance(this);
    const res = doWatch(getter, cb.bind(publicThis), options);
    reset();
    return res;
  }
  function createPathGetter(ctx, path) {
    const segments = path.split(".");
    return () => {
      let cur2 = ctx;
      for (let i = 0; i < segments.length && cur2; i++) {
        cur2 = cur2[segments[i]];
      }
      return cur2;
    };
  }
  var requestIdleCallback = getGlobalThis().requestIdleCallback || ((cb) => setTimeout(cb, 1));
  var cancelIdleCallback = getGlobalThis().cancelIdleCallback || ((id) => clearTimeout(id));
  function injectHook(type, hook, target = currentInstance, prepend = false) {
    if (target) {
      const hooks = target[type] || (target[type] = []);
      const wrappedHook = hook.__weh || (hook.__weh = (...args) => {
        pauseTracking();
        const reset = setCurrentInstance(target);
        const res = callWithAsyncErrorHandling(hook, target, type, args);
        reset();
        resetTracking();
        return res;
      });
      if (prepend) {
        hooks.unshift(wrappedHook);
      } else {
        hooks.push(wrappedHook);
      }
      return wrappedHook;
    } else if (true) {
      const apiName = toHandlerKey(ErrorTypeStrings$1[type].replace(/ hook$/, ""));
      warn$1(
        `${apiName} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
      );
    }
  }
  var createHook = (lifecycle) => (hook, target = currentInstance) => {
    if (!isInSSRComponentSetup || lifecycle === "sp") {
      injectHook(lifecycle, (...args) => hook(...args), target);
    }
  };
  var onBeforeMount = createHook("bm");
  var onMounted = createHook("m");
  var onBeforeUpdate = createHook(
    "bu"
  );
  var onUpdated = createHook("u");
  var onBeforeUnmount = createHook(
    "bum"
  );
  var onUnmounted = createHook("um");
  var onServerPrefetch = createHook(
    "sp"
  );
  var onRenderTriggered = createHook("rtg");
  var onRenderTracked = createHook("rtc");
  var getPublicInstance = (i) => {
    if (!i) return null;
    if (isStatefulComponent(i)) return getComponentPublicInstance(i);
    return getPublicInstance(i.parent);
  };
  var resolveDevRootEl = (vnode) => {
    let found = false;
    while (true) {
      if (vnode.patchFlag > 0 && vnode.patchFlag & 2048) {
        const root = filterSingleRoot(vnode.children);
        if (!root) {
          return;
        }
        vnode = root;
        found = true;
        continue;
      }
      const component = vnode.component;
      if (component && component.subTree) {
        vnode = component.subTree;
        continue;
      }
      const suspense = vnode.suspense;
      if (suspense && suspense.activeBranch) {
        vnode = suspense.activeBranch;
        continue;
      }
      return found ? vnode.el : void 0;
    }
  };
  var getDevRootFragmentEl = (i) => {
    const el = i.subTree && resolveDevRootEl(i.subTree);
    return el === void 0 ? i.vnode.el : el;
  };
  var publicPropertiesMap = (
    // Move PURE marker to new line to workaround compiler discarding it
    // due to type annotation
    /* @__PURE__ */ extend(/* @__PURE__ */ Object.create(null), {
      $: (i) => i,
      $el: (i) => true ? getDevRootFragmentEl(i) : i.vnode.el,
      $data: (i) => i.data,
      $props: (i) => true ? shallowReadonly(i.props) : i.props,
      $attrs: (i) => true ? shallowReadonly(i.attrs) : i.attrs,
      $slots: (i) => true ? shallowReadonly(i.slots) : i.slots,
      $refs: (i) => true ? shallowReadonly(i.refs) : i.refs,
      $parent: (i) => getPublicInstance(i.parent),
      $root: (i) => getPublicInstance(i.root),
      $host: (i) => i.ce,
      $emit: (i) => i.emit,
      $options: (i) => __VUE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type,
      $forceUpdate: (i) => i.f || (i.f = () => {
        queueJob(i.update);
      }),
      $nextTick: (i) => i.n || (i.n = nextTick.bind(i.proxy)),
      $watch: (i) => __VUE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP
    })
  );
  var isReservedPrefix = (key) => key === "_" || key === "$";
  var hasSetupBinding = (state, key) => state !== EMPTY_OBJ && !state.__isScriptSetup && hasOwn(state, key);
  var PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
      if (key === "__v_skip") {
        return true;
      }
      const { ctx, setupState, data, props, accessCache, type, appContext } = instance;
      if (key === "__isVue") {
        return true;
      }
      if (key[0] !== "$") {
        const n = accessCache[key];
        if (n !== void 0) {
          switch (n) {
            case 1:
              return setupState[key];
            case 2:
              return data[key];
            case 4:
              return ctx[key];
            case 3:
              return props[key];
          }
        } else if (hasSetupBinding(setupState, key)) {
          accessCache[key] = 1;
          return setupState[key];
        } else if (__VUE_OPTIONS_API__ && data !== EMPTY_OBJ && hasOwn(data, key)) {
          accessCache[key] = 2;
          return data[key];
        } else if (hasOwn(props, key)) {
          accessCache[key] = 3;
          return props[key];
        } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
          accessCache[key] = 4;
          return ctx[key];
        } else if (!__VUE_OPTIONS_API__ || shouldCacheAccess) {
          accessCache[key] = 0;
        }
      }
      const publicGetter = publicPropertiesMap[key];
      let cssModule, globalProperties;
      if (publicGetter) {
        if (key === "$attrs") {
          track(instance.attrs, "get", "");
          markAttrsAccessed();
        } else if (key === "$slots") {
          track(instance, "get", key);
        }
        return publicGetter(instance);
      } else if (
        // css module (injected by vue-loader)
        (cssModule = type.__cssModules) && (cssModule = cssModule[key])
      ) {
        return cssModule;
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        accessCache[key] = 4;
        return ctx[key];
      } else if (
        // global properties
        globalProperties = appContext.config.globalProperties, hasOwn(globalProperties, key)
      ) {
        {
          return globalProperties[key];
        }
      } else if (currentRenderingInstance && (!isString(key) || // #1091 avoid internal isRef/isVNode checks on component instance leading
      // to infinite warning loop
      key.indexOf("__v") !== 0)) {
        if (data !== EMPTY_OBJ && isReservedPrefix(key[0]) && hasOwn(data, key)) {
          warn$1(
            `Property ${JSON.stringify(
              key
            )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
          );
        } else if (instance === currentRenderingInstance) {
          warn$1(
            `Property ${JSON.stringify(key)} was accessed during render but is not defined on instance.`
          );
        }
      }
    },
    set({ _: instance }, key, value) {
      const { data, setupState, ctx } = instance;
      if (hasSetupBinding(setupState, key)) {
        setupState[key] = value;
        return true;
      } else if (setupState.__isScriptSetup && hasOwn(setupState, key)) {
        warn$1(`Cannot mutate <script setup> binding "${key}" from Options API.`);
        return false;
      } else if (__VUE_OPTIONS_API__ && data !== EMPTY_OBJ && hasOwn(data, key)) {
        data[key] = value;
        return true;
      } else if (hasOwn(instance.props, key)) {
        warn$1(`Attempting to mutate prop "${key}". Props are readonly.`);
        return false;
      }
      if (key[0] === "$" && key.slice(1) in instance) {
        warn$1(
          `Attempting to mutate public property "${key}". Properties starting with $ are reserved and readonly.`
        );
        return false;
      } else {
        if (key in instance.appContext.config.globalProperties) {
          Object.defineProperty(ctx, key, {
            enumerable: true,
            configurable: true,
            value
          });
        } else {
          ctx[key] = value;
        }
      }
      return true;
    },
    has({
      _: { data, setupState, accessCache, ctx, appContext, props, type }
    }, key) {
      let cssModules;
      return !!(accessCache[key] || __VUE_OPTIONS_API__ && data !== EMPTY_OBJ && key[0] !== "$" && hasOwn(data, key) || hasSetupBinding(setupState, key) || hasOwn(props, key) || hasOwn(ctx, key) || hasOwn(publicPropertiesMap, key) || hasOwn(appContext.config.globalProperties, key) || (cssModules = type.__cssModules) && cssModules[key]);
    },
    defineProperty(target, key, descriptor) {
      if (descriptor.get != null) {
        target._.accessCache[key] = 0;
      } else if (hasOwn(descriptor, "value")) {
        this.set(target, key, descriptor.value, null);
      }
      return Reflect.defineProperty(target, key, descriptor);
    }
  };
  if (true) {
    PublicInstanceProxyHandlers.ownKeys = (target) => {
      warn$1(
        `Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead.`
      );
      return Reflect.ownKeys(target);
    };
  }
  function normalizePropsOrEmits(props) {
    return isArray(props) ? props.reduce(
      (normalized, p) => (normalized[p] = null, normalized),
      {}
    ) : props;
  }
  var shouldCacheAccess = true;
  function resolveMergedOptions(instance) {
    const base = instance.type;
    const { mixins, extends: extendsOptions } = base;
    const {
      mixins: globalMixins,
      optionsCache: cache2,
      config: { optionMergeStrategies }
    } = instance.appContext;
    const cached = cache2.get(base);
    let resolved;
    if (cached) {
      resolved = cached;
    } else if (!globalMixins.length && !mixins && !extendsOptions) {
      {
        resolved = base;
      }
    } else {
      resolved = {};
      if (globalMixins.length) {
        globalMixins.forEach(
          (m) => mergeOptions(resolved, m, optionMergeStrategies, true)
        );
      }
      mergeOptions(resolved, base, optionMergeStrategies);
    }
    if (isObject(base)) {
      cache2.set(base, resolved);
    }
    return resolved;
  }
  function mergeOptions(to, from, strats, asMixin = false) {
    const { mixins, extends: extendsOptions } = from;
    if (extendsOptions) {
      mergeOptions(to, extendsOptions, strats, true);
    }
    if (mixins) {
      mixins.forEach(
        (m) => mergeOptions(to, m, strats, true)
      );
    }
    for (const key in from) {
      if (asMixin && key === "expose") {
        warn$1(
          `"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.`
        );
      } else {
        const strat = internalOptionMergeStrats[key] || strats && strats[key];
        to[key] = strat ? strat(to[key], from[key]) : from[key];
      }
    }
    return to;
  }
  var internalOptionMergeStrats = {
    data: mergeDataFn,
    props: mergeEmitsOrPropsOptions,
    emits: mergeEmitsOrPropsOptions,
    // objects
    methods: mergeObjectOptions,
    computed: mergeObjectOptions,
    // lifecycle
    beforeCreate: mergeAsArray,
    created: mergeAsArray,
    beforeMount: mergeAsArray,
    mounted: mergeAsArray,
    beforeUpdate: mergeAsArray,
    updated: mergeAsArray,
    beforeDestroy: mergeAsArray,
    beforeUnmount: mergeAsArray,
    destroyed: mergeAsArray,
    unmounted: mergeAsArray,
    activated: mergeAsArray,
    deactivated: mergeAsArray,
    errorCaptured: mergeAsArray,
    serverPrefetch: mergeAsArray,
    // assets
    components: mergeObjectOptions,
    directives: mergeObjectOptions,
    // watch
    watch: mergeWatchOptions,
    // provide / inject
    provide: mergeDataFn,
    inject: mergeInject
  };
  function mergeDataFn(to, from) {
    if (!from) {
      return to;
    }
    if (!to) {
      return from;
    }
    return function mergedDataFn() {
      return extend(
        isFunction(to) ? to.call(this, this) : to,
        isFunction(from) ? from.call(this, this) : from
      );
    };
  }
  function mergeInject(to, from) {
    return mergeObjectOptions(normalizeInject(to), normalizeInject(from));
  }
  function normalizeInject(raw) {
    if (isArray(raw)) {
      const res = {};
      for (let i = 0; i < raw.length; i++) {
        res[raw[i]] = raw[i];
      }
      return res;
    }
    return raw;
  }
  function mergeAsArray(to, from) {
    return to ? [...new Set([].concat(to, from))] : from;
  }
  function mergeObjectOptions(to, from) {
    return to ? extend(/* @__PURE__ */ Object.create(null), to, from) : from;
  }
  function mergeEmitsOrPropsOptions(to, from) {
    if (to) {
      if (isArray(to) && isArray(from)) {
        return [.../* @__PURE__ */ new Set([...to, ...from])];
      }
      return extend(
        /* @__PURE__ */ Object.create(null),
        normalizePropsOrEmits(to),
        normalizePropsOrEmits(from != null ? from : {})
      );
    } else {
      return from;
    }
  }
  function mergeWatchOptions(to, from) {
    if (!to) return from;
    if (!from) return to;
    const merged = extend(/* @__PURE__ */ Object.create(null), to);
    for (const key in from) {
      merged[key] = mergeAsArray(to[key], from[key]);
    }
    return merged;
  }
  var currentApp = null;
  var accessedAttrs = false;
  function markAttrsAccessed() {
    accessedAttrs = true;
  }
  function filterSingleRoot(children, recurse = true) {
    let singleRoot;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (isVNode(child)) {
        if (child.type !== Comment || child.children === "v-if") {
          if (singleRoot) {
            return;
          } else {
            singleRoot = child;
            if (recurse && singleRoot.patchFlag > 0 && singleRoot.patchFlag & 2048) {
              return filterSingleRoot(singleRoot.children);
            }
          }
        }
      } else {
        return;
      }
    }
    return singleRoot;
  }
  var queuePostRenderEffect = queueEffectWithSuspense;
  function locateUnresolvedAsyncRoot(instance) {
    const subComponent = instance.subTree.component;
    if (subComponent) {
      if (subComponent.asyncDep && !subComponent.asyncResolved) {
        return subComponent;
      } else {
        return locateUnresolvedAsyncRoot(subComponent);
      }
    }
  }
  function queueEffectWithSuspense(fn, suspense) {
    if (suspense && suspense.pendingBranch) {
      if (isArray(fn)) {
        suspense.effects.push(...fn);
      } else {
        suspense.effects.push(fn);
      }
    } else {
      queuePostFlushCb(fn);
    }
  }
  var Comment = /* @__PURE__ */ Symbol.for("v-cmt");
  function isVNode(value) {
    return value ? value.__v_isVNode === true : false;
  }
  var currentInstance = null;
  var getCurrentInstance = () => currentInstance || currentRenderingInstance;
  var internalSetCurrentInstance;
  var setInSSRSetupState;
  {
    const g = getGlobalThis();
    const registerGlobalSetter = (key, setter) => {
      let setters;
      if (!(setters = g[key])) setters = g[key] = [];
      setters.push(setter);
      return (v) => {
        if (setters.length > 1) setters.forEach((set) => set(v));
        else setters[0](v);
      };
    };
    internalSetCurrentInstance = registerGlobalSetter(
      `__VUE_INSTANCE_SETTERS__`,
      (v) => currentInstance = v
    );
    setInSSRSetupState = registerGlobalSetter(
      `__VUE_SSR_SETTERS__`,
      (v) => isInSSRComponentSetup = v
    );
  }
  var setCurrentInstance = (instance) => {
    const prev = currentInstance;
    internalSetCurrentInstance(instance);
    instance.scope.on();
    return () => {
      instance.scope.off();
      internalSetCurrentInstance(prev);
    };
  };
  function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4;
  }
  var isInSSRComponentSetup = false;
  function getComponentPublicInstance(instance) {
    if (instance.exposed) {
      return instance.exposeProxy || (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
        get(target, key) {
          if (key in target) {
            return target[key];
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance);
          }
        },
        has(target, key) {
          return key in target || key in publicPropertiesMap;
        }
      }));
    } else {
      return instance.proxy;
    }
  }
  var classifyRE = /(?:^|[-_])\w/g;
  var classify2 = (str) => str.replace(classifyRE, (c) => c.toUpperCase()).replace(/[-_]/g, "");
  function getComponentName(Component, includeInferred = true) {
    return isFunction(Component) ? Component.displayName || Component.name : Component.name || includeInferred && Component.__name;
  }
  function formatComponentName(instance, Component, isRoot = false) {
    let name = getComponentName(Component);
    if (!name && Component.__file) {
      const match = Component.__file.match(/([^/\\]+)\.\w+$/);
      if (match) {
        name = match[1];
      }
    }
    if (!name && instance) {
      const inferFromRegistry = (registry) => {
        for (const key in registry) {
          if (registry[key] === Component) {
            return key;
          }
        }
      };
      name = inferFromRegistry(instance.components) || instance.parent && inferFromRegistry(
        instance.parent.type.components
      ) || inferFromRegistry(instance.appContext.components);
    }
    return name ? classify2(name) : isRoot ? `App` : `Anonymous`;
  }
  function isClassComponent(value) {
    return isFunction(value) && "__vccOpts" in value;
  }
  function initCustomFormatter() {
    if (typeof window === "undefined") {
      return;
    }
    const vueStyle = { style: "color:#3ba776" };
    const numberStyle = { style: "color:#1677ff" };
    const stringStyle = { style: "color:#f5222d" };
    const keywordStyle = { style: "color:#eb2f96" };
    const formatter = {
      __vue_custom_formatter: true,
      header(obj) {
        if (!isObject(obj)) {
          return null;
        }
        if (obj.__isVue) {
          return ["div", vueStyle, `VueInstance`];
        } else if (isRef(obj)) {
          pauseTracking();
          const value = obj.value;
          resetTracking();
          return [
            "div",
            {},
            ["span", vueStyle, genRefFlag(obj)],
            "<",
            formatValue(value),
            `>`
          ];
        } else if (isReactive(obj)) {
          return [
            "div",
            {},
            ["span", vueStyle, isShallow(obj) ? "ShallowReactive" : "Reactive"],
            "<",
            formatValue(obj),
            `>${isReadonly(obj) ? ` (readonly)` : ``}`
          ];
        } else if (isReadonly(obj)) {
          return [
            "div",
            {},
            ["span", vueStyle, isShallow(obj) ? "ShallowReadonly" : "Readonly"],
            "<",
            formatValue(obj),
            ">"
          ];
        }
        return null;
      },
      hasBody(obj) {
        return obj && obj.__isVue;
      },
      body(obj) {
        if (obj && obj.__isVue) {
          return [
            "div",
            {},
            ...formatInstance(obj.$)
          ];
        }
      }
    };
    function formatInstance(instance) {
      const blocks = [];
      if (instance.type.props && instance.props) {
        blocks.push(createInstanceBlock("props", toRaw(instance.props)));
      }
      if (instance.setupState !== EMPTY_OBJ) {
        blocks.push(createInstanceBlock("setup", instance.setupState));
      }
      if (instance.data !== EMPTY_OBJ) {
        blocks.push(createInstanceBlock("data", toRaw(instance.data)));
      }
      const computed2 = extractKeys(instance, "computed");
      if (computed2) {
        blocks.push(createInstanceBlock("computed", computed2));
      }
      const injected = extractKeys(instance, "inject");
      if (injected) {
        blocks.push(createInstanceBlock("injected", injected));
      }
      blocks.push([
        "div",
        {},
        [
          "span",
          {
            style: keywordStyle.style + ";opacity:0.66"
          },
          "$ (internal): "
        ],
        ["object", { object: instance }]
      ]);
      return blocks;
    }
    function createInstanceBlock(type, target) {
      target = extend({}, target);
      if (!Object.keys(target).length) {
        return ["span", {}];
      }
      return [
        "div",
        { style: "line-height:1.25em;margin-bottom:0.6em" },
        [
          "div",
          {
            style: "color:#476582"
          },
          type
        ],
        [
          "div",
          {
            style: "padding-left:1.25em"
          },
          ...Object.keys(target).map((key) => {
            return [
              "div",
              {},
              ["span", keywordStyle, key + ": "],
              formatValue(target[key], false)
            ];
          })
        ]
      ];
    }
    function formatValue(v, asRaw = true) {
      if (typeof v === "number") {
        return ["span", numberStyle, v];
      } else if (typeof v === "string") {
        return ["span", stringStyle, JSON.stringify(v)];
      } else if (typeof v === "boolean") {
        return ["span", keywordStyle, v];
      } else if (isObject(v)) {
        return ["object", { object: asRaw ? toRaw(v) : v }];
      } else {
        return ["span", stringStyle, String(v)];
      }
    }
    function extractKeys(instance, type) {
      const Comp = instance.type;
      if (isFunction(Comp)) {
        return;
      }
      const extracted = {};
      for (const key in instance.ctx) {
        if (isKeyOfType(Comp, key, type)) {
          extracted[key] = instance.ctx[key];
        }
      }
      return extracted;
    }
    function isKeyOfType(Comp, key, type) {
      const opts = Comp[type];
      if (isArray(opts) && opts.includes(key) || isObject(opts) && key in opts) {
        return true;
      }
      if (Comp.extends && isKeyOfType(Comp.extends, key, type)) {
        return true;
      }
      if (Comp.mixins && Comp.mixins.some((m) => isKeyOfType(m, key, type))) {
        return true;
      }
    }
    function genRefFlag(v) {
      if (isShallow(v)) {
        return `ShallowRef`;
      }
      if (v.effect) {
        return `ComputedRef`;
      }
      return `Ref`;
    }
    if (window.devtoolsFormatters) {
      window.devtoolsFormatters.push(formatter);
    } else {
      window.devtoolsFormatters = [formatter];
    }
  }

  // node_modules/vue/dist/vue.runtime.esm-bundler.js
  function initDev() {
    {
      initCustomFormatter();
    }
  }
  if (true) {
    initDev();
  }

  // ui/src/core/incoming.js
  var incoming = ref([]);
  function onFile(f) {
    if (!f || !f.name) return;
    if (incoming.value.some((x) => x.name === f.name && x.size === f.size)) return;
    incoming.value = [...incoming.value, { name: f.name, size: f.size, type: f.type, at: Date.now() }].slice(-30);
    try {
      toast("\u0648\u0635\u0644 \u0645\u0644\u0641 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0627\u0633\u062D: " + f.name + " \u2014 \u0627\u0641\u062A\u062D \xAB\u0645\u0633\u062A\u0646\u062F\u0627\u062A\xBB \u0645\u0648\u0638\u0641 \u0644\u0625\u0636\u0627\u0641\u062A\u0647");
    } catch (e) {
    }
  }
  function install3() {
    if (window.desk && typeof desk.onScanFile === "function") desk.onScanFile(onFile);
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
    safe("incoming", install3);
    safe("assist", install2);
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
/*! Bundled license information:

@vue/shared/dist/shared.esm-bundler.js:
  (**
  * @vue/shared v3.5.46
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)

@vue/reactivity/dist/reactivity.esm-bundler.js:
  (**
  * @vue/reactivity v3.5.46
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)

@vue/runtime-core/dist/runtime-core.esm-bundler.js:
  (**
  * @vue/runtime-core v3.5.46
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)

vue/dist/vue.runtime.esm-bundler.js:
  (**
  * vue v3.5.46
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)
*/
