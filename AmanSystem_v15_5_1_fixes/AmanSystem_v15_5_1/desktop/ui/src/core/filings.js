// المرحلة 4 (50) — Kanban متابعة تقديم طلبات الدخول (الالتحاق) والخروج (الاستقالة): مسودة ← قُدِّم ← مؤكَّد.
// لا حقول جديدة في ins_sys_v1: الحالة تُشتق من الحقول القائمة أصلًا:
//   مسودة  = لا رقم طلب مسجل (reqIn / reqOut)
//   قُدِّم  = رقم الطلب مسجل ولم تُؤكَّد رسالة التأكيد  (وتظهر عليه علامة لو «بها مشكلة»)
//   مؤكَّد = رسالة التأكيد «تم التأكيد» (inSt / outSt) — نفس حقل رسالة التأكيد في صفحة الموظفين
// السحب بين الأعمدة يكتب في نفس الحقول ويسجّل في سجل العمليات بنفس lg() ويحفظ بـ save() القديمة.
import { maskDate } from './empform.js';

export const COLS = [['draft', 'مسودة'], ['submitted', 'قُدِّم'], ['confirmed', 'مؤكَّد']];
const LABEL = Object.fromEntries(COLS);
export const KINDS = [['in', 'طلبات الدخول (الالتحاق)'], ['out', 'طلبات الخروج (الاستقالة)']];
const F = (kind) => (kind === 'out' ? { num: 'reqOut', date: 'reqOutDate', st: 'outSt', dt: 'outDt' } : { num: 'reqIn', date: 'reqInDate', st: 'inSt', dt: 'inDt' });
export { maskDate };

export const inScope = (e, kind) => (kind === 'out' ? e.status !== 'active' : e.status === 'active');
export function stateOf(e, kind) {
  const f = F(kind);
  if (e[f.st] === CFS[1]) return 'confirmed';
  return String(e[f.num] || '').trim() ? 'submitted' : 'draft';
}
export const hasProblem = (e, kind) => e[F(kind).st] === CFS[2];

const recent = (e, kind, days) => {
  const d = e[F(kind).dt];
  if (!d) return false;
  return (Date.now() - new Date(d + 'T00:00:00').getTime()) / 864e5 <= days;
};

/* القائمة المعروضة: co شركة • q بحث (نفس hay/nz) • all لإظهار كل المؤكَّد، وإلا المؤكَّد خلال recentDays فقط */
export function board(kind, { co = '', q = '', all = false, recentDays = 30 } = {}) {
  const f = F(kind), nq = q ? nz(q) : '';
  const cols = { draft: [], submitted: [], confirmed: [] }, total = { draft: 0, submitted: 0, confirmed: 0 };
  S.emps.forEach((e) => {
    if (!inScope(e, kind)) return;
    if (co && e.cid != co) return;
    if (nq && !hay(e).includes(nq)) return;
    const s = stateOf(e, kind);
    total[s]++;
    if (s === 'confirmed' && !all && !recent(e, kind, recentDays)) return;
    cols[s].push({
      id: e.id, name: e.name || '', code: e.code || '', job: e.job || '', company: cn(e.cid), num: e[f.num] || '', date: e[f.date] || '',
      confirmedOn: e[f.dt] || '', problem: hasProblem(e, kind), note: e[kind === 'out' ? 'outNote' : 'inNote'] || '',
      since: kind === 'out' ? (e.end || '') : (e.start || ''), rtype: kind === 'out' ? (e.rtype || '') : ''
    });
  });
  const key = (x) => x.since || '';
  Object.keys(cols).forEach((k) => cols[k].sort((a, b) => key(b).localeCompare(key(a)) || a.name.localeCompare(b.name, 'ar')));
  return { cols, total };
}

/* نقل بطاقة. opts: { num, date (نص يوم/شهر/سنة) } مطلوبان عند الخروج من المسودة. يعيد { ok, err?, need? } */
export function move(id, kind, to, opts = {}) {
  const e = S.emps.find((x) => x.id == id);
  if (!e || !inScope(e, kind)) return { ok: false, err: 'الموظف غير موجود في هذا النوع من الطلبات' };
  const f = F(kind), from = stateOf(e, kind);
  if (!LABEL[to]) return { ok: false, err: 'حالة غير معروفة' };
  if (to === from) return { ok: true, same: true };
  if (to === 'draft') return { ok: false, err: 'لا يمكن إرجاع الطلب إلى «مسودة» لأن ذلك يمسح رقم الطلب؛ عدّل رقم الطلب من نموذج الموظف إن لزم' };
  if (from === 'draft') {
    const num = String(opts.num == null ? '' : opts.num).trim();
    if (!num) return { ok: false, need: 'num', err: 'اكتب رقم الطلب أولًا' };
    let d = '';
    if (opts.date != null && String(opts.date).trim() !== '') { d = pd(opts.date); if (d === null) return { ok: false, need: 'date', err: 'تاريخ الطلب غير صحيح، اكتبه بصيغة يوم/شهر/سنة' }; }
    e[f.num] = num; e[f.date] = d || today();
    if (!e[f.st]) e[f.st] = CFS[0];
  }
  if (to === 'confirmed') { e[f.st] = CFS[1]; e[f.dt] = today(); }
  else { e[f.st] = CFS[0]; e[f.dt] = ''; }          // submitted: من «مؤكَّد» يعني إلغاء التأكيد
  lg('تغيير حالة طلب ' + (kind === 'out' ? 'خروج' : 'التحاق'), e.name + ' ← ' + LABEL[to], e.id);
  save();
  return { ok: true, from, to };
}
