// المرحلة 4 — محرك التنبيهات (53–61). بدون Vue؛ يقرأ نفس بيانات البرنامج القديم (S, CS, TS, Q, XF2 ...) ولا يكتب شيئًا في ins_sys_v1.
// الإعدادات (مهلة التقديم، نافذة سن المعاش، الأنواع الموقوفة) في ins_ui_prefs.alerts فقط.
// كل تنبيه: { s: خطورة r/w/i, i: أيقونة, t: نص, g: الصفحة, k: نوع (للإيقاف), x?: مرشح صفحة الموظفين, id?+rec?: سجل بعينه, cf?: مرشح السيارات, month?: شهر المطابقة }
import { getAlertPrefs } from './prefs.js';
import { expiries } from './dash.js';

export const KINDS = [
  ['doc7', '53', 'مستند/ترخيص سيارة ينتهي خلال 7 أيام أو انتهى'],
  ['doc15', '53', 'مستند/ترخيص سيارة ينتهي خلال 15 يومًا'],
  ['doc30', '53', 'مستند/ترخيص سيارة ينتهي خلال 30 يومًا'],
  ['idexp', '53', 'بطاقة رقم قومي منتهية أو تنتهي خلال 30 يومًا'],
  ['nodocs', '54', 'موظفون بمستندات ناقصة'],
  ['noout', '55', 'مستقيل بدون طلب خروج مسجل'],
  ['inc', '56', 'موظفون ببيانات ناقصة'],
  ['recon', '57', 'اختلاف كشوف المرتبات (Excel) عن بيانات البرنامج'],
  ['tasks', '58', 'مهام متأخرة / اليوم'],
  ['retnow', '60', 'بلغوا سن المعاش'],
  ['retsoon', '60', 'مقبلون على سن المعاش'],
  ['latein', '61', 'طلب التحاق لم يُقدَّم بعد المهلة'],
  ['reqdue', '61', 'طلبات دخول موعد تعيينها قريب/فات']
];
export const RET_WOMEN = 55;

const dig = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632);
const ms = (iso) => new Date(iso + 'T00:00:00').getTime();
const dayN = (iso) => Math.round((ms(iso) - ms(today())) / 864e5);        // موجب = مستقبل
const addYears = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y + n, m - 1, d); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };

/* ---------------- سن المعاش (60): رجال = cfg.retAge أو 60 • سيدات = 55 ---------------- */
export function retireInfo(e) {
  const A = window.a9;
  if (!A || typeof A.nid !== 'function' || !e || !e.nid) return null;
  const n = A.nid(dig(e.nid));
  if (!n || !n.valid || !n.birth) return null;
  const men = (S.cfg && +S.cfg.retAge) || 60;
  const age = n.gender === 'أنثى' ? RET_WOMEN : men;
  const date = addYears(n.birth, age);
  return { date, age, gender: n.gender, days: dayN(date) };
}

/* ---------------- المرشحات الجديدة لصفحة الموظفين (EL() تقرأ XF2[flt.x]) ---------------- */
const bad14 = (e) => !/^\d{14}$/.test(dig(e.nid || ''));
const isIn = (e) => e.status == 'active';
export const F = {
  nodocs: (e) => (isIn(e) ? !(e.docs || []).length : !(e.docs || []).some((d) => d.kind === 'استقالة')),
  inc: (e) => (isIn(e) ? bad14(e) || !e.start || !(+e.wage > 0) : !e.end),
  idexp: (e) => { if (!isIn(e) || !e.nidExp) return false; return dayN(e.nidExp) <= 30; },
  retnow: (e) => { if (!isIn(e)) return false; const r = retireInfo(e); return !!r && r.days <= 0; },
  retsoon: (e) => { if (!isIn(e)) return false; const r = retireInfo(e); return !!r && r.days > 0 && r.days <= getAlertPrefs().retDays; },
  latein: (e) => { if (!isIn(e) || e.reqIn || !e.start) return false; return -dayN(e.start) >= getAlertPrefs().fileDays; }
};
export const LABELS = {
  idexp: 'بطاقة منتهية/تنتهي قريبًا', nodocs: 'مستندات ناقصة', inc: 'بيانات ناقصة', retnow: 'بلغ سن المعاش', retsoon: 'مقبل على سن المعاش', latein: 'طلب التحاق لم يُقدَّم'
};
export function installFilters() {
  Object.keys(F).forEach((k) => { if (!XF2[k]) XF2[k] = F[k]; if (!XL[k]) XL[k] = LABELS[k]; });
}

/* ---------------- بناء التنبيهات الجديدة ---------------- */
const one = (list, nameOf) => (list.length === 1 ? ' — ' + nameOf(list[0]) : '');
const rec = (list) => (list.length === 1 ? { id: list[0].id, rec: 'emp' } : {});

export function build(a) {
  const P = getAlertPrefs(), off = new Set(P.off), push = (o) => { if (!off.has(o.k)) a.push(o); };
  const sink = { push };
  /* 53: مستندات وتراخيص السيارات 30/15/7 يوم (+ المنتهي) — تحل محل تنبيهين مجمَّعين قديمين */
  try {
    const ex = expiries();
    const bands = [
      ['doc7', 'r', (x) => x.days <= 7, 'تنتهي خلال 7 أيام أو انتهت', 'r'],
      ['doc15', 'w', (x) => x.days > 7 && x.days <= 15, 'تنتهي خلال 15 يومًا', 'w'],
      ['doc30', 'i', (x) => x.days > 15 && x.days <= 30, 'تنتهي خلال 30 يومًا', 'w']
    ];
    bands.forEach(([k, s, f, label, cf]) => {
      const l = ex.filter(f); if (!l.length) return;
      const t = l.length === 1 ? l[0].what + ' للسيارة ' + l[0].plate + ' ' + (l[0].days < 0 ? 'انتهت منذ ' + fm(-l[0].days) + ' يوم' : l[0].days === 0 ? 'تنتهي اليوم' : 'تنتهي بعد ' + fm(l[0].days) + ' يوم') : fm(l.length) + ' مستند/ترخيص سيارات ' + label;
      sink.push({ k, s, i: 'car', t, g: 'cars', cf });
    });
  } catch (e) { console.error('[AmanUI] alerts:doc', e); }

  /* 54/55/56/60/61: الموظفون */
  try {
    const E = S.emps;
    const ie = E.filter(F.idexp);
    if (ie.length) sink.push({ k: 'idexp', s: ie.some((e) => dayN(e.nidExp) < 0) ? 'r' : 'w', i: 'clock', t: fm(ie.length) + ' بطاقة رقم قومي منتهية أو تنتهي خلال 30 يومًا' + one(ie, (e) => e.name), g: 'emp', x: 'idexp', ...rec(ie) });
    const nd = E.filter(F.nodocs);
    if (nd.length) sink.push({ k: 'nodocs', s: 'w', i: 'pclip', t: fm(nd.length) + ' موظف مستنداته ناقصة (مؤمن عليه بلا أي مستند، أو مستقيل بلا مستند استقالة)' + one(nd, (e) => e.name), g: 'emp', x: 'nodocs', ...rec(nd) });
    const no = E.filter(XF2.noout);
    if (no.length) sink.push({ k: 'noout', s: 'i', i: 'file', t: fm(no.length) + ' موظف مستقيل بدون طلب خروج مسجل' + one(no, (e) => e.name), g: 'emp', x: 'noout', ...rec(no) });
    const inc = E.filter(F.inc);
    if (inc.length) sink.push({ k: 'inc', s: 'w', i: 'alert', t: fm(inc.length) + ' موظف ببيانات ناقصة (رقم قومي/تاريخ التحاق/أجر، أو تاريخ استقالة)' + one(inc, (e) => e.name), g: 'emp', x: 'inc', ...rec(inc) });
    const rn = E.filter(F.retnow), rs = E.filter(F.retsoon);
    if (rn.length) sink.push({ k: 'retnow', s: 'r', i: 'alert', t: fm(rn.length) + ' مؤمن عليه بلغ سن المعاش (رجال ' + ((S.cfg && +S.cfg.retAge) || 60) + ' / سيدات ' + RET_WOMEN + ')' + one(rn, (e) => e.name), g: 'emp', x: 'retnow', ...rec(rn) });
    if (rs.length) sink.push({ k: 'retsoon', s: 'w', i: 'clock', t: fm(rs.length) + ' مؤمن عليه يبلغ سن المعاش خلال ' + fm(Math.round(P.retDays / 30)) + ' أشهر' + one(rs, (e) => e.name), g: 'emp', x: 'retsoon', ...rec(rs) });
    const li = E.filter(F.latein);
    if (li.length) sink.push({ k: 'latein', s: 'r', i: 'clock', t: fm(li.length) + ' موظف مرّ على التحاقه أكثر من ' + fm(P.fileDays) + ' أيام ولم يُسجَّل له طلب التحاق' + one(li, (e) => e.name), g: 'emp', x: 'latein', ...rec(li) });
  } catch (e) { console.error('[AmanUI] alerts:emp', e); }

  /* 61: طلبات دخول (قائمة الانتظار) موعد تعيينها خلال 3 أيام أو فات */
  try {
    const due = Q().filter((q) => q.status == QS[0] && q.hdate && dayN(q.hdate) <= 3);
    if (due.length) sink.push({ k: 'reqdue', s: due.some((q) => dayN(q.hdate) < 0) ? 'r' : 'w', i: 'clip', t: fm(due.length) + ' طلب دخول بانتظار الاعتماد وموعد تعيينه ' + (due.every((q) => dayN(q.hdate) < 0) ? 'فات' : 'قريب أو فات') + one(due, (q) => q.name), g: 'req' });
  } catch (e) { console.error('[AmanUI] alerts:req', e); }

  /* 57: كشوف المرتبات (Excel) مقابل بيانات البرنامج — آخر شهر مرفوع */
  try {
    const months = [...new Set(PY().map((b) => b.month))].sort();
    if (months.length && typeof reconAll === 'function') {
      const m = months[months.length - 1], r = reconAll(m), bad = r.it.filter((i) => !GOOD.includes(i.t));
      if (bad.length) {
        const by = {}; bad.forEach((i) => { by[i.t] = (by[i.t] || 0) + 1; });
        const det = Object.keys(by).map((t) => TT[t][0] + ' ' + fm(by[t])).join('، ');
        sink.push({ k: 'recon', s: bad.some((i) => TT[i.t][1] === 'r') ? 'r' : 'w', i: 'layers', t: 'كشوف شهر ' + m + ' تختلف عن بيانات البرنامج: ' + fm(bad.length) + ' ملاحظة (' + det + ')', g: 'rec', month: m });
      }
    }
  } catch (e) { console.error('[AmanUI] alerts:recon', e); }

  /* 58: المهام المتأخرة واليوم */
  try {
    const T = TS(), late = T.filter((t) => tst(t) == 'late'), td = T.filter((t) => tst(t) == 'today');
    if (late.length) sink.push({ k: 'tasks', s: 'r', i: 'clock', t: fm(late.length) + ' مهمة متأخرة' + one(late, (t) => t.title), g: 'asst' });
    if (td.length) sink.push({ k: 'tasks', s: 'w', i: 'clock', t: fm(td.length) + ' مهمة اليوم' + one(td, (t) => t.title), g: 'asst' });
  } catch (e) { console.error('[AmanUI] alerts:tasks', e); }
}

const RANK = { r: 0, w: 1, i: 2 };
/* يغلّف alerts() القديمة: يحذف تنبيهات السيارات/المهام المجمَّعة القديمة (أُعيد بناؤها أدق) ثم يضيف الجديد ويرتّب بالخطورة (مستقر) */
export function install() {
  installFilters();
  const _alerts = window.alerts;
  window.alerts = function () {
    const base = _alerts.apply(this, arguments).filter((x) => x.g !== 'cars' && x.g !== 'asst');
    build(base);
    return base.map((x, i) => [x, i]).sort((p, q) => (RANK[p[0].s] ?? 3) - (RANK[q[0].s] ?? 3) || p[1] - q[1]).map((p) => p[0]);
  };
  const _aGo = window.aGo;
  window.aGo = function (i) {
    const a = (typeof AL !== 'undefined' ? AL : [])[i];
    if (a && isRich(a)) { closeM(); return openAlertTarget(a); }
    return _aGo.apply(this, arguments);
  };
}
const isRich = (a) => !!(a.rec || a.cf !== undefined || a.month || a.k);

/* ---------------- 59: زر كل تنبيه يفتح السجل المطلوب ---------------- */
export function openAlertTarget(a, co) {
  if (a.rec === 'emp' && a.id) { prof(a.id); return; }
  if (a.g === 'emp') { flt = { c: co && S.companies.some((c) => c.id == co) ? co : '', s: '', q: '', x: XF2[a.x] ? a.x : '', fn: '', k: '' }; ep = 0; nv('emp'); return; }
  if (a.g === 'cars') { cf = a.cf || ''; nv('cars'); return; }
  if (a.g === 'rec' && a.month && typeof openRec === 'function') { nv('rec'); openRec(a.month); return; }
  nv(a.g);
}
export const actionLabel = (a) => (a.rec === 'emp' ? 'افتح الملف' : a.g === 'emp' ? 'اعرض القائمة' : a.g === 'cars' ? 'السيارات' : a.g === 'rec' ? 'المطابقة' : a.g === 'req' ? 'الطلبات' : a.g === 'asst' ? 'المهام' : 'افتح');
