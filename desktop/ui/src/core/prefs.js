// تفضيلات الواجهة (15 الألوان والخط والخلفية، 16 الثيمات، 17 إخفاء القوائم، 20 العروض المحفوظة، 21 شاشة البداية، 48 تاريخ البحث).
// التخزين: مفتاح جديد واحد للواجهة فقط `ins_ui_prefs` — لا يُمَسّ ins_sys_v1 ولا أي مفتاح قائم.
// الوضع الفاتح/الداكن (22) يبقى كما هو: مفتاح ins_theme وزر th() القديم.
import { createBus, lsGet, lsSet, isHex } from './util.js';

export const PREFS_KEY = 'ins_ui_prefs';
export const NAV_PROTECTED = ['dash', 'set'];          // لا يمكن إخفاؤهما حتى لا يُقفل المستخدم خارج الإعدادات

export const THEMES = {
  plum:    { name: 'الافتراضي (بنفسجي)', pri: '#7c3aed', pri2: '#0d9488' },
  royal:   { name: 'أزرق ملكي',       pri: '#2b4fc4', pri2: '#0b8aa6' },
  emerald: { name: 'أخضر زمردي',      pri: '#0b8a63', pri2: '#0e7490' }
};
export const BGS = {
  default: { name: 'الافتراضية' },
  cool:    { name: 'سماوية هادئة', l: '#eef2f8', d: '#0e1320' },
  warm:    { name: 'دافئة',        l: '#f7f3ec', d: '#16120e' },
  pure:    { name: 'نقية',         l: '#ffffff', d: '#08080c' }
};
export const FONTS = {
  cairo:  { name: 'Cairo (الأصلي)',        css: "Cairo,Tahoma,Arial,sans-serif" },
  plex:   { name: 'IBM Plex Sans Arabic',  css: "'IBM Plex Sans Arabic',Cairo,Tahoma,sans-serif" },
  system: { name: 'خط النظام',             css: "'Segoe UI',Tahoma,Arial,sans-serif" }
};
export const SIZES = [{ k: 90, l: 'صغير' }, { k: 100, l: 'عادي' }, { k: 112, l: 'كبير' }, { k: 125, l: 'كبير جدًا' }];
export const VIEW_MODES = { req: ['kanban', 'list'], cars: ['cards', 'table'] };

const DEFAULTS = {
  v: 1, theme: 'plum', primary: '#7c3aed', secondary: '#0d9488', bg: 'default', font: 'cairo', size: 100,
  hideNav: [], start: 'dash', last: 'dash', view: {}, views: [], search: [],
  // المرحلة 2 — لوحة التحكم: co الشركة (فارغ = الكل) • per الفترة بالأشهر • auto تحديث تلقائي • summary ملخص يومي عند الفتح • sumDay آخر يوم عُرض فيه الملخص
  dash: { co: '', per: 12, auto: true, summary: true, sumDay: '' },
  // المرحلة 3 — نموذج الموظف: review = عرض شاشة المراجعة قبل كل حفظ
  form: { review: true },
  // المرحلة 4 — التنبيهات: fileDays مهلة تقديم الطلب بالأيام (61) • retDays نافذة التنبيه قبل سن المعاش بالأيام (60) • off أنواع تنبيهات مُوقَفة
  alerts: { fileDays: 7, retDays: 180, off: [] }
};
const ID_RE = /^[a-z0-9_-]{1,24}$/i;
const bus = createBus();

function sanitize(o) {
  const p = JSON.parse(JSON.stringify(DEFAULTS));
  if (!o || typeof o !== 'object') return p;
  if (THEMES[o.theme] || o.theme === 'custom') p.theme = o.theme;
  if (isHex(o.primary)) p.primary = o.primary.toLowerCase();
  if (isHex(o.secondary)) p.secondary = o.secondary.toLowerCase();
  if (BGS[o.bg]) p.bg = o.bg;
  if (FONTS[o.font]) p.font = o.font;
  if (SIZES.some(s => s.k === +o.size)) p.size = +o.size;
  if (Array.isArray(o.hideNav)) p.hideNav = [...new Set(o.hideNav.filter(x => typeof x === 'string' && ID_RE.test(x) && !NAV_PROTECTED.includes(x)))];
  if (typeof o.start === 'string' && (o.start === 'last' || ID_RE.test(o.start))) p.start = o.start;
  if (typeof o.last === 'string' && ID_RE.test(o.last)) p.last = o.last;
  if (o.view && typeof o.view === 'object') Object.keys(VIEW_MODES).forEach(k => { if (VIEW_MODES[k].includes(o.view[k])) p.view[k] = o.view[k]; });
  if (Array.isArray(o.views)) {
    p.views = o.views.filter(v => v && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.page === 'string' && v.state && typeof v.state === 'object')
      .map(v => ({ id: v.id.slice(0, 30), page: v.page.slice(0, 20), name: v.name.slice(0, 40), state: v.state, at: +v.at || 0 })).slice(-30);
  }
  if (o.dash && typeof o.dash === 'object') {
    const d = o.dash;
    if (typeof d.co === 'string' && d.co.length <= 40) p.dash.co = d.co;
    if ([3, 6, 12].includes(+d.per)) p.dash.per = +d.per;
    if (typeof d.auto === 'boolean') p.dash.auto = d.auto;
    if (typeof d.summary === 'boolean') p.dash.summary = d.summary;
    if (typeof d.sumDay === 'string' && /^\d{4}-\d\d-\d\d$/.test(d.sumDay)) p.dash.sumDay = d.sumDay;
  }
  if (o.form && typeof o.form === 'object' && typeof o.form.review === 'boolean') p.form.review = o.form.review;
  if (o.alerts && typeof o.alerts === 'object') {
    const a = o.alerts, n = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? Math.round(+v) : null);
    const fd = n(a.fileDays, 1, 60), rd = n(a.retDays, 30, 730);
    if (fd !== null) p.alerts.fileDays = fd;
    if (rd !== null) p.alerts.retDays = rd;
    if (Array.isArray(a.off)) p.alerts.off = [...new Set(a.off.filter(x => typeof x === 'string' && ID_RE.test(x)))];
  }
  if (Array.isArray(o.search)) p.search = o.search.filter(x => typeof x === 'string' && x.trim()).map(x => x.slice(0, 80)).slice(0, 12);
  return p;
}
function load() { try { return sanitize(JSON.parse(lsGet(PREFS_KEY, 'null'))); } catch (e) { return sanitize(null); } }

let P = load();
const persist = () => lsSet(PREFS_KEY, JSON.stringify(P));

export const getPrefs = () => JSON.parse(JSON.stringify(P));
export const onPrefs = (fn) => bus.on(fn);
export const isDefaultColors = (p) => p.primary === THEMES.plum.pri && p.secondary === THEMES.plum.pri2;

/* ---------------- بناء الـ CSS ---------------- */
const mix = (c, pct, base) => `color-mix(in srgb,${c} ${pct}%,${base})`;
// index.html يعرّف متغيرات الوضع الداكن بمحدِّد أعلى من :root، فنكرر نفس المحدِّدات (وبعدها html:root) ليتغلب الثيم في الوضعين
const modeVars = (light, dark) =>
  `html:root,html:root[data-theme="light"]{${light}}html:root[data-theme="dark"]{${dark}}@media (prefers-color-scheme:dark){html:root:not([data-theme="light"]){${dark}}}`;

export function buildCss(p) {
  let css = '';
  if (!isDefaultColors(p)) {
    const P = p.primary, S2 = p.secondary;
    const sh = { 50: mix(P, 8, '#fff'), 100: mix(P, 16, '#fff'), 200: mix(P, 32, '#fff'), 300: mix(P, 52, '#fff'), 400: mix(P, 74, '#fff'), 500: P, 600: mix(P, 88, '#000'), 700: mix(P, 74, '#000'), 800: mix(P, 58, '#000'), 900: mix(P, 42, '#000'), 950: mix(P, 28, '#000') };
    css += `html:root{${Object.keys(sh).map(k => `--p-primary-${k}:${sh[k]}`).join(';')}}`;
    // aman-v9.css يعرّف --pri/--pri2/--pri-glow لكل وضع بمحدِّد أعلى من :root، فنكرر المحدِّدات. في الداكن نفتّح اللون ليبقى مقروءًا.
    css += modeVars(
      `--pri:${P};--pri2:${S2};--pri-glow:${mix(P, 15, 'transparent')};--acc-glow:${mix(S2, 15, 'transparent')}`,
      `--pri:${mix(P, 78, '#fff')};--pri2:${mix(S2, 78, '#fff')};--pri-glow:${mix(P, 25, 'transparent')};--acc-glow:${mix(S2, 25, 'transparent')}`);
    // أماكن ما زالت تحمل ألوانًا مكتوبة حرفيًا (تتجاوز v9): شاشة الدخول والتحميل، الأيقونات الصغيرة، المحادثة، البانر القديم
    const dark = mix('var(--pri)', 80, '#000');
    css += `.hero{background:linear-gradient(120deg,${dark},var(--pri) 40%,var(--pri2))!important}`;
    css += `.lside{background:linear-gradient(135deg,${mix('var(--pri)', 55, '#000')},var(--pri) 55%,var(--pri2))!important}`;
    css += `#splash{background:linear-gradient(135deg,#100e17,${mix('var(--pri)', 40, '#000')} 55%,${mix('var(--pri2)', 40, '#000')})!important}`;
    css += `#chatfab{background:linear-gradient(135deg,var(--pri),var(--pri2))!important}#chatfab .pl{border-color:var(--pri2)!important}`;
    css += `.chd{background:linear-gradient(135deg,${dark},var(--pri) 50%,var(--pri2))!important}.cph{background:linear-gradient(135deg,${dark},var(--pri2))!important}`;
    css += `.kpi .ic[style*="#714b67"]{background:linear-gradient(135deg,var(--pri),${mix('var(--pri)', 73, 'transparent')})!important}`;
    css += `.kpi .ic[style*="#017e84"]{background:linear-gradient(135deg,var(--pri2),${mix('var(--pri2)', 73, 'transparent')})!important}`;
  }
  if (p.bg !== 'default' && BGS[p.bg]) css += modeVars(`--bg:${BGS[p.bg].l}`, `--bg:${BGS[p.bg].d}`);
  if (p.font !== 'cairo') {
    const f = FONTS[p.font].css;
    css += `html:root{--p-font-family:${f}}body,.p-component{font-family:${f}}`;
  }
  if (p.size !== 100) css += `html:root{font-size:${(16 * p.size / 100).toFixed(2)}px}body{font-size:${(14 * p.size / 100).toFixed(2)}px}`;
  if (p.hideNav.length) css += `${p.hideNav.map(id => `#nav .ni[onclick="nv('${id}')"]`).join(',')}{display:none!important}`;
  return css;
}

export function applyPrefs() {
  if (typeof document === 'undefined') return;
  let st = document.getElementById('aman-ui-prefs');
  if (!st) { st = document.createElement('style'); st.id = 'aman-ui-prefs'; document.head.appendChild(st); }
  st.textContent = buildCss(P);
  document.documentElement.dataset.amanTheme = P.theme;
}

export function setPrefs(patch) {
  P = sanitize({ ...P, ...patch });
  persist(); applyPrefs(); bus.emit(getPrefs());
  return getPrefs();
}

/* ---------------- ثيمات وألوان (15، 16) ---------------- */
export function setTheme(id) {
  const t = THEMES[id]; if (!t) return getPrefs();
  return setPrefs({ theme: id, primary: t.pri, secondary: t.pri2 });
}
export function setColors(primary, secondary) {
  const m = Object.keys(THEMES).find(k => THEMES[k].pri === primary && THEMES[k].pri2 === secondary);
  return setPrefs({ primary, secondary, theme: m || 'custom' });
}
export const resetAppearance = () => setPrefs({ theme: 'plum', primary: THEMES.plum.pri, secondary: THEMES.plum.pri2, bg: 'default', font: 'cairo', size: 100 });

/* ---------------- القوائم وشاشة البداية (17، 21) ---------------- */
export function setNavHidden(id, hidden) {
  if (NAV_PROTECTED.includes(id)) return getPrefs();
  const s = new Set(P.hideNav); hidden ? s.add(id) : s.delete(id);
  return setPrefs({ hideNav: [...s] });
}
export const isNavHidden = (id) => P.hideNav.includes(id);
export function rememberPage(id) {                       // بدون إعلان/إعادة تطبيق: يُستدعى مع كل تنقل
  if (!ID_RE.test(String(id)) || P.last === id) return;
  P.last = id; persist();
}
export function resolveStart(validIds) {
  const want = P.start === 'last' ? P.last : P.start;
  return validIds.includes(want) && !P.hideNav.includes(want) ? want : 'dash';
}

/* ---------------- طرق العرض (20) ---------------- */
export const getViewMode = (page) => P.view[page] || '';
export function setViewMode(page, mode) {
  if (!VIEW_MODES[page] || !VIEW_MODES[page].includes(mode) || P.view[page] === mode) return;
  P.view = { ...P.view, [page]: mode }; persist();
}

/* ---------------- العروض المحفوظة (20) ---------------- */
export const listViews = (page) => P.views.filter(v => v.page === page).map(v => ({ ...v, state: JSON.parse(JSON.stringify(v.state)) }));
export function saveView(page, name, state) {
  name = String(name || '').trim().slice(0, 40);
  if (!name) return null;
  const rest = P.views.filter(v => !(v.page === page && v.name === name));
  const v = { id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), page, name, state: JSON.parse(JSON.stringify(state || {})), at: Date.now() };
  setPrefs({ views: [...rest, v].slice(-30) });
  return v.id;
}
export const removeView = (id) => setPrefs({ views: P.views.filter(v => v.id !== id) });

/* ---------------- تاريخ البحث (48) ---------------- */
export const getHistory = () => P.search.slice();
export function pushHistory(q) {
  q = String(q || '').trim().slice(0, 80);
  if (q.length < 2) return;
  if (P.search[0] === q) return;
  P.search = [q, ...P.search.filter(x => x !== q)].slice(0, 12); persist(); bus.emit(getPrefs());
}
export const removeHistory = (q) => setPrefs({ search: P.search.filter(x => x !== q) });
export const clearHistory = () => setPrefs({ search: [] });

/* ---------------- نموذج الموظف (المرحلة 3) ---------------- */
export const getForm = () => ({ ...P.form });
export const setForm = (patch) => setPrefs({ form: { ...P.form, ...patch } });
export const getAlertPrefs = () => ({ ...P.alerts, off: [...P.alerts.off] });
export const setAlertPrefs = (patch) => setPrefs({ alerts: { ...P.alerts, ...patch } });
