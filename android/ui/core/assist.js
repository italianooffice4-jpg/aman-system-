// المرحلة 5 (68/69): يغلّف a9.assist القديمة. الترتيب: تدقيق البيانات ← الأسئلة المركبة ← المنطق القديم (الاسم/الرقم القومي/المعاش…).
// أي خطأ هنا يُهمل ويرجع المنطق القديم كما هو.
import { ask } from './query.js';
import { audit, toReport, summaryText } from './contra.js';

const norm = (s) => String(s || '').replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const AUDIT = /(تناقض|تناقضات|تدقيق|فحص (ال)?بيانات|مراجعه (ال)?بيانات|اخطاء (في )?(ال)?بيانات|بيانات (غلط|خاطئه)|اكتشف (ال)?(اخطاء|تناقضات))/;

function reg(spec) {
  const m = (window.amanReports = window.amanReports || new Map());
  const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  m.set(id, spec);
  if (m.size > 20) m.delete(m.keys().next().value);
  return id;
}
const btn = (id, label) => `<div class=acts><button class='btn sm' onclick="AmanUI.openReport('${id}')">${label}</button></div>`;

export function answer(q) {
  const t = norm(q);
  if (AUDIT.test(t)) {
    const a = audit(), id = reg(toReport(a));
    return { text: summaryText(a), html: a.summary.total ? btn(id, 'فتح تقرير التدقيق الكامل') : '' };
  }
  const r = ask(q);
  if (!r) return null;
  const id = reg(r.report);
  return { text: r.text, html: r.result.count ? btn(id, 'عرض النتائج (' + fm(r.result.count) + ')') : '' };
}

export function install() {
  const A = window.a9;
  if (!A || typeof A.assist !== 'function') return;
  const orig = A.assist;
  A.assist = function (q) {
    try { if (window.AmanUI && AmanUI.hostReady && AmanUI.hostReady()) { const r = answer(q); if (r) return r; } } catch (e) { console.error('[AmanUI] assist', e); }
    return orig.apply(this, arguments);
  };
}
