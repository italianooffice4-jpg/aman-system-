// المرحلة 5 (69) — كشف التناقضات في البيانات وإعداد تقرير. للقراءة فقط: لا يعدّل أي بيان.
// كل فحص يرجع عناصر {eid?, name, text}. الخطورة: err (خطأ مؤكد) • warn (يحتاج مراجعة) • info (ملاحظة).
const dig = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632);
const E = () => S.emps;
const nidInfo = (e) => (window.a9 && a9.nid && e.nid ? a9.nid(dig(e.nid)) : null);
const today0 = () => today();
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const it = (e, text) => ({ eid: e.id, name: e.name || '—', company: cn(e.cid), text });

const CHECKS = [
  ['dates_order', 'err', 'تاريخ الاستقالة قبل تاريخ الالتحاق', (e) => (e.start && e.end && e.end < e.start ? [it(e, 'الالتحاق ' + e.start + ' بعد الاستقالة ' + e.end)] : [])],
  ['active_with_end', 'warn', 'مؤمن عليه حاليًا وله تاريخ استقالة', (e) => (e.status === 'active' && e.end ? [it(e, 'تاريخ الاستقالة ' + e.end + ' مسجَّل لكن الحالة «مؤمن عليه»')] : [])],
  ['resigned_no_end', 'warn', 'مستقيل بلا تاريخ استقالة', (e) => (e.status !== 'active' && !e.end ? [it(e, 'الحالة مستقيل ولا يوجد تاريخ')] : [])],
  ['future_start', 'info', 'تاريخ التحاق في المستقبل', (e) => (e.start && e.start > today0() ? [it(e, 'الالتحاق ' + e.start)] : [])],
  ['nid_bad', 'err', 'رقم قومي غير صالح', (e) => { if (!e.nid) return []; const r = nidInfo(e); return r && !r.valid ? [it(e, 'الرقم ' + e.nid + ' — ' + (r.error || 'غير صالح'))] : []; }],
  ['young_start', 'warn', 'سن أقل من 16 سنة وقت الالتحاق (من الرقم القومي)', (e) => { const r = nidInfo(e); if (!r || !r.valid || !r.birth || !e.start) return []; const d = new Date(e.start + 'T00:00:00'), b = new Date(r.birth + 'T00:00:00'); let a = d.getFullYear() - b.getFullYear(); if (d < new Date(d.getFullYear(), b.getMonth(), b.getDate())) a--; return a < 16 ? [it(e, 'السن وقت الالتحاق ' + a + ' سنة (الميلاد ' + r.birth + ' والالتحاق ' + e.start + ')')] : []; }],
  ['wage_zero', 'err', 'أجر فارغ أو صفر', (e) => (e.status === 'active' && !(+e.wage > 0) ? [it(e, 'لا يوجد أجر مسجَّل')] : [])],
  ['wage_min', 'info', 'أجر أقل من الحد الأدنى التأميني (يُحتسب عليه الحد الأدنى)', (e) => (e.status === 'active' && +e.wage > 0 && +e.wage < +S.cfg.min ? [it(e, 'الأجر ' + e.wage + ' والحد الأدنى ' + S.cfg.min)] : [])],
  ['wage_max', 'info', 'أجر أعلى من الحد الأقصى التأميني (يُحتسب عليه الحد الأقصى)', (e) => (e.status === 'active' && +e.wage > +S.cfg.max ? [it(e, 'الأجر ' + e.wage + ' والحد الأقصى ' + S.cfg.max)] : [])],
  ['no_company', 'err', 'شركة غير موجودة', (e) => (!S.companies.some((c) => c.id === e.cid) ? [it(e, 'الشركة المرتبطة محذوفة أو غير معروفة')] : [])],
  ['req_in_confirmed', 'warn', 'رسالة تأكيد الالتحاق «تم» بلا رقم طلب', (e) => (e.inSt === CFS[1] && !String(e.reqIn || '').trim() ? [it(e, 'تأكيد بلا رقم طلب التحاق')] : [])],
  ['req_out_confirmed', 'warn', 'تأكيد الاستقالة «تم» بلا رقم طلب خروج', (e) => (e.outSt === CFS[1] && !String(e.reqOut || '').trim() ? [it(e, 'تأكيد بلا رقم طلب خروج')] : [])],
  ['req_out_active', 'warn', 'طلب خروج مسجَّل لموظف ما زال مؤمنًا عليه', (e) => (e.status === 'active' && String(e.reqOut || '').trim() ? [it(e, 'رقم طلب الخروج ' + e.reqOut)] : [])],
  ['rtype_missing', 'info', 'مستقيل بلا سبب خروج', (e) => (e.status !== 'active' && !e.rtype ? [it(e, 'لم يُحدَّد سبب الخروج')] : [])],
  ['id_expired', 'warn', 'بطاقة الرقم القومي منتهية', (e) => (e.nidExp && e.nidExp < today0() ? [it(e, 'انتهت في ' + e.nidExp)] : [])]
];

/* تكرارات تحتاج نظرة على المجموعة كلها */
function dups(key, label, sev, getKey, desc) {
  const m = new Map();
  E().forEach((e) => { const k = getKey(e); if (!k) return; (m.get(k) || m.set(k, []).get(k)).push(e); });
  const items = [];
  m.forEach((l, k) => { if (l.length > 1) l.forEach((e) => items.push({ eid: e.id, name: e.name || '—', company: cn(e.cid), text: desc(k) + ' — مكرر مع: ' + l.filter((x) => x !== e).map((x) => x.name).join('، ') })); });
  return { id: key, sev, title: label, items };
}

export function audit() {
  const groups = CHECKS.map(([id, sev, title, fn]) => ({ id, sev, title, items: E().flatMap((e) => { try { return fn(e); } catch (x) { return []; } }) }));
  groups.push(dups('dup_nid', 'رقم قومي مكرر', 'err', (e) => dig(e.nid || '').replace(/\D/g, '').length === 14 ? dig(e.nid).replace(/\D/g, '') : '', (k) => 'الرقم ' + k));
  groups.push(dups('dup_insno', 'رقم تأميني مكرر', 'err', (e) => String(e.insno || '').trim(), (k) => 'الرقم التأميني ' + k));
  groups.push(dups('dup_code', 'كود مكرر داخل نفس الشركة', 'warn', (e) => (e.code ? e.cid + '|' + e.code : ''), (k) => 'الكود ' + k.split('|')[1]));
  // مطابقة كشوف المرتبات مع البرنامج (آخر شهر مرفوع) — نفس منطق مطابقة الكشوف القديمة
  try {
    const months = [...new Set(PY().map((b) => b.month))].sort();
    if (months.length && typeof reconAll === 'function') {
      const m = months[months.length - 1], r = reconAll(m), bad = r.it.filter((i) => !GOOD.includes(i.t));
      groups.push({ id: 'payroll', sev: bad.some((i) => TT[i.t][1] === 'r') ? 'err' : 'warn', title: 'اختلاف كشف ' + m + ' عن بيانات البرنامج', items: bad.map((i) => ({ eid: i.e && i.e.id, name: (i.e && i.e.name) || (i.ps && i.ps[0] && i.ps[0].name) || '—', company: i.e ? cn(i.e.cid) : '', text: TT[i.t][0] + (i.m ? ' — ' + i.m : '') })) });
    }
  } catch (x) { /* لا شيء */ }
  const found = groups.filter((g) => g.items.length);
  const sum = { err: 0, warn: 0, info: 0, total: 0 };
  found.forEach((g) => { sum[g.sev] += g.items.length; sum.total += g.items.length; });
  return { at: new Date().toISOString(), employees: E().length, groups: found, summary: sum, checked: groups.length };
}

const SEV = { err: 'خطأ', warn: 'يحتاج مراجعة', info: 'ملاحظة' };
export const sevLabel = (s) => SEV[s] || s;
export function toReport(a) {
  const when = new Date(a.at).toLocaleString('ar-EG');
  return {
    title: 'تقرير تدقيق البيانات', subtitle: 'تم فحص ' + a.employees + ' موظف بـ ' + a.checked + ' فحصًا — ' + when + ' — أخطاء: ' + a.summary.err + ' • مراجعة: ' + a.summary.warn + ' • ملاحظات: ' + a.summary.info + '. التقرير للقراءة فقط ولا يغيّر أي بيان.',
    sections: a.groups.sort((x, y) => ['err', 'warn', 'info'].indexOf(x.sev) - ['err', 'warn', 'info'].indexOf(y.sev)).map((g) => ({ title: g.title + ' (' + g.items.length + ')', sev: g.sev, columns: [{ k: 'name', l: 'الاسم' }, { k: 'company', l: 'الشركة' }, { k: 'text', l: 'التفاصيل' }], rows: g.items }))
  };
}
export const summaryText = (a) => (a.summary.total ? 'وجدت ' + a.summary.total + ' ملاحظة: ' + a.summary.err + ' خطأ مؤكد، ' + a.summary.warn + ' تحتاج مراجعة، ' + a.summary.info + ' ملاحظات.\n' + a.groups.slice(0, 6).map((g) => '• ' + g.title + ': ' + g.items.length).join('\n') : 'لم أجد أي تناقض في البيانات بعد ' + a.checked + ' فحصًا.');
void addDays;
