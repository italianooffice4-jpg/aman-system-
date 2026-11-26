// (40) إكمال اسم الموظف، (46) بحث فوري، (47) فلاتر مركبة، (48) تاريخ البحث واقتراح أسماء.
// الفلاتر المركبة تُطبَّق بتغليف EL() (في install.js) فتشمل الجدول والطباعة وتعيين حالة التأكيد للمعروضين بنفس القائمة.
import { createBus } from './util.js';
import { emps, norm } from './legacy.js';
import { getHistory } from './prefs.js';

/* ---------------- اقتراح الأسماء ---------------- */
// نخزّن الاسم المطبَّع لكل موظف ونتحقق من الاسم الخام في كل مرة، فلا يمكن أن نقترح اسمًا قديمًا بعد تعديله.
const cache = new WeakMap();
function normOf(e) {
  const raw = e.name;
  let c = cache.get(e);
  if (!c || c.raw !== raw) { const name = String(raw == null ? '' : raw).trim(); c = { raw, name, n: norm(name) }; cache.set(e, c); }
  return c;
}

export function suggestNames(q, limit) {
  limit = limit || 8;
  const nq = norm(q);
  if (!nq) return [];
  const toks = nq.split(' ').filter(Boolean);
  const out = [];
  for (const e of emps()) {
    const it = normOf(e);
    if (!it.name || !toks.every(t => it.n.includes(t))) continue;
    let sc = it.n.startsWith(toks[0]) ? 3 : it.n.split(' ').some(w => w.startsWith(toks[0])) ? 2 : 1;
    if (e.status === 'active') sc += 0.5;
    out.push([sc, it.name]);
  }
  out.sort((a, b) => (b[0] - a[0]) || a[1].localeCompare(b[1], 'ar'));
  const seen = new Set(), res = [];
  for (const [, name] of out) { if (seen.has(name)) continue; seen.add(name); res.push(name); if (res.length >= limit) break; }
  return res;
}

/* قائمة الاقتراحات للحقل: بدون كتابة ⇒ تاريخ البحث؛ مع الكتابة ⇒ أسماء (+ عمليات بحث سابقة مطابقة) */
export function suggestions(q, limit) {
  limit = limit || 8;
  const nq = norm(q);
  const hist = getHistory();
  if (!nq) return hist.slice(0, 6).map(t => ({ kind: 'hist', text: t }));
  const h = hist.filter(t => { const n = norm(t); return n.includes(nq) && n !== nq; }).slice(0, 3).map(t => ({ kind: 'hist', text: t }));
  const names = suggestNames(q, limit).filter(n => norm(n) !== nq).map(t => ({ kind: 'name', text: t }));
  return [...h, ...names].slice(0, limit);
}

/* ---------------- الفلاتر المركبة ---------------- */
const ADV0 = { job: '', wmin: '', wmax: '', dfrom: '', dto: '', docs: '' };
let ADV = { ...ADV0 };
const advBus = createBus();

export const getAdv = () => ({ ...ADV });
export const onAdv = (fn) => advBus.on(fn);
export function setAdv(patch) {
  const n = { ...ADV };
  Object.keys(ADV0).forEach(k => { if (patch && k in patch) n[k] = patch[k] == null ? '' : String(patch[k]); });
  if (!['', 'has', 'none'].includes(n.docs)) n.docs = '';
  ADV = n; advBus.emit(getAdv());
}
export const clearAdv = () => setAdv(ADV0);
export const advCount = () => Object.keys(ADV0).filter(k => ADV[k] !== '').length;

export function advPredicate(e) {
  const a = ADV;
  if (a.job && String(e.job || '') !== a.job) return false;
  const w = +e.wage || 0;
  if (a.wmin !== '' && w < +a.wmin) return false;
  if (a.wmax !== '' && w > +a.wmax) return false;
  if (a.dfrom && (!e.start || e.start < a.dfrom)) return false;
  if (a.dto && (!e.start || e.start > a.dto)) return false;
  const nd = (e.docs || []).length;
  if (a.docs === 'has' && !nd) return false;
  if (a.docs === 'none' && nd) return false;
  return true;
}
export const distinctJobs = () => [...new Set(emps().map(e => String(e.job || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
