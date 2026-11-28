// منطق لوحة التحكم (المرحلة 2) — بدون Vue، ويقرأ نفس بيانات وحسابات البرنامج القديم (S, stats, calc, Q, TS, CS, alerts ...).
// لا يكتب أي شيء في ins_sys_v1. الإعدادات (الشركة/الفترة/التحديث التلقائي/الملخص اليومي) في مفتاح الواجهة ins_ui_prefs فقط.
import { getPrefs, setPrefs } from './prefs.js';
import { openAlertTarget } from './alerts.js';

export const PERIODS = [{ v: 3, l: '٣ أشهر' }, { v: 6, l: '٦ أشهر' }, { v: 12, l: '١٢ شهر' }];
export const PALETTE = ['#7c3aed', '#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#84cc16', '#ef4444'];

/* ---------------- التفضيلات ---------------- */
export const getDash = () => getPrefs().dash;
export const setDash = (patch) => setPrefs({ dash: { ...getPrefs().dash, ...patch } }).dash;
// الشركة المحفوظة قد تُحذف لاحقًا: نتعامل معها كـ «الكل»
export const validCo = (co) => (co && S.companies.some(c => c.id == co) ? co : '');

/* ---------------- نطاق الشركة ----------------
   كل دوال البرنامج القديم (stats, moData, alerts …) تقرأ S مباشرة. بدل ما نعيد كتابتها نضيّق S.emps/S.reqs/S.pay مؤقتًا
   أثناء الاستدعاء (متزامن) ثم نعيدها في finally — لا حفظ ولا تأثير على التخزين. */
export function scoped(co, fn) {
  co = validCo(co);
  if (!co) return fn();
  const had = { emps: 'emps' in S, reqs: 'reqs' in S, pay: 'pay' in S };
  const o = { emps: S.emps, reqs: S.reqs, pay: S.pay };
  try {
    const mine = (o.emps || []).filter(e => e.cid == co);
    const nids = new Set(mine.map(e => String(e.nid || '')).filter(Boolean));
    const codes = new Set(mine.map(e => String(e.code || '')).filter(Boolean));
    const cname = cn(co);
    S.emps = mine;
    S.reqs = (o.reqs || []).filter(q => q.cid == co || (typeof qc === 'function' ? qc(q) === cname : q.cname === cname));
    // كشوف المرتبات: نحتفظ فقط بصفوف موظفي الشركة (الصفوف التي لا تُنسب لأحد لا تدخل في حساب شركة بعينها)
    S.pay = (o.pay || []).map(b => ({ ...b, rows: (b.rows || []).filter(r => (r.nid && nids.has(String(r.nid))) || (r.code && codes.has(String(r.code)))) }));
    return fn();
  } finally {
    ['emps', 'reqs', 'pay'].forEach(k => { if (had[k]) S[k] = o[k]; else delete S[k]; });
  }
}

/* نوافذ تفاصيل الشهر القديمة (a9.chOpen/chSel/chTable) تُبنى من S مباشرة وأزرار «الشهر السابق/التالي» داخلها تستدعي a9.chOpen لاحقًا؛
   لذلك نغلّفها طوال بقاء اللوحة معروضة حتى تحترم فلتر الشركة. */
export function installScopeHooks(getCo) {
  const a = window.a9; if (!a) return () => {};
  const names = ['chOpen', 'chSel', 'chTable'], orig = {};
  names.forEach(n => {
    if (typeof a[n] !== 'function') return;
    orig[n] = a[n];
    a[n] = function () { const args = arguments; return scoped(getCo(), () => orig[n].apply(a, args)); };
  });
  return () => names.forEach(n => { if (orig[n]) a[n] = orig[n]; });
}

/* ---------------- بيانات الأشهر ---------------- */
export const monthly = (co, n) => scoped(co, () => window.a9.dx.moData(window.a9.dx.monN(n)));
export const empsOf = (co) => (validCo(co) ? S.emps.filter(e => e.cid == co) : S.emps);

/* ---------------- 23/25: المؤشرات ---------------- */
export function kpis(co, per) {
  co = validCo(co);
  return scoped(co, () => {
    const dx = window.a9.dx, t = stats(), sr = dx.series(), D = dx.moData(dx.monN(per));
    const cp = (+S.cfg.emp || 0) + (+S.cfg.er || 0);
    const pend = Q().filter(q => q.status == QS[0]);
    const d0 = new Date(), cm = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0');
    const added = S.emps.filter(e => e.status == 'active' && String(e.start || '').slice(0, 7) == cm).length;
    const wageMoney = sr.wage.map(x => x * cp / 100);
    const dMoney = wageMoney.length > 1 ? wageMoney[wageMoney.length - 1] - wageMoney[wageMoney.length - 2] : 0;
    return {
      t, cp, sr, wageMoney, pendN: pend.length, totalReq: Q().length, pend,
      companies: co ? 1 : S.companies.length,
      cntDelta: dx.dtxt(sr.cnt, 'عن الشهر الماضي') || (added ? '+' + fm(added) + ' هذا الشهر' : ''),
      totDelta: dMoney ? (dMoney > 0 ? '▲ +' : '▼ −') + mny(Math.abs(dMoney)) + ' عن الشهر الماضي' : 'بدون تغيير عن الشهر الماضي',
      hires: D.reduce((s, x) => s + x.hires.length, 0), leaves: D.reduce((s, x) => s + x.leaves.length, 0),
      ops: S.log.slice(0, 4).map(l => ({ a: l.a, d: l.d, when: new Date(l.t).toLocaleString('ar-EG') })),
      coRows: (co ? S.companies.filter(c => c.id == co) : S.companies).map(c => { const s = stats(c.id); return { id: c.id, name: c.name, act: s.act, res: s.res, a: s.a, b: s.b, t: s.t }; })
    };
  });
}

/* ---------------- 30: مقارنة الالتحاقات والخروج شهريًا ---------------- */
export function compare(co, per) {
  const D = monthly(co, per), dx = window.a9.dx;
  const hires = D.map(x => x.hires.length), leaves = D.map(x => x.leaves.length);
  return {
    D, hires, leaves, net: hires.map((h, i) => h - leaves[i]),
    labels: D.map((x, i) => dx.mlabC(x.mo, i, per)),
    sumH: hires.reduce((a, b) => a + b, 0), sumL: leaves.reduce((a, b) => a + b, 0)
  };
}

/* ---------------- 31: توزيع المشتركين حسب المنشأة ---------------- */
export function distribution(co) {
  co = validCo(co);
  if (co) {                                   // شركة واحدة: التوزيع بين النشط والمستقيل
    const s = scoped(co, () => stats());
    return { mode: 'status', total: s.n, items: [{ id: 'active', name: 'نشط', v: s.act, color: '#0d9488' }, { id: 'resigned', name: 'مستقيل', v: s.res, color: '#ef4444' }].filter(x => x.v > 0) };
  }
  const items = S.companies.map((c, i) => ({ id: c.id, name: c.name, v: stats(c.id).act, color: PALETTE[i % PALETTE.length] })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  return { mode: 'company', total: items.reduce((s, x) => s + x.v, 0), items };
}

/* ---------------- 26: شرائط التقدم (الأجور والاشتراكات) ---------------- */
export function bars(co) {
  co = validCo(co);
  return scoped(co, () => {
    const dx = window.a9.dx, st = stats(), act = S.emps.filter(e => e.status == 'active');
    const out = [];
    const tone = (p, good = 90, mid = 60) => (p >= good ? 'a' : p >= mid ? 'w' : 'r');

    // الأجور: متوسط الأجر المحسوب مقابل الحد الأقصى للأجر التأميني
    const mx = +S.cfg.max || 0, avg = act.length ? st.w / act.length : 0, pw = mx ? Math.min(100, avg / mx * 100) : 0;
    out.push({ g: 'الأجور', k: 'wage', label: 'متوسط الأجر التأميني مقابل الحد الأقصى', pct: pw, val: mny(avg) + ' من ' + mny(mx), tone: 'i', hint: 'إجمالي الأجور التأمينية: ' + mny(st.w) });
    // الاشتراكات: حصة العامل وصاحب العمل من الإجمالي الشهري
    const tt = st.t || 0;
    out.push({ g: 'الاشتراكات', k: 'emp', label: 'حصة العاملين (' + S.cfg.emp + '%)', pct: tt ? st.a / tt * 100 : 0, val: mny(st.a), tone: 'i', hint: 'من إجمالي ' + mny(tt) });
    out.push({ g: 'الاشتراكات', k: 'er', label: 'حصة أصحاب العمل (' + S.cfg.er + '%)', pct: tt ? st.b / tt * 100 : 0, val: mny(st.b), tone: 'i', hint: 'من إجمالي ' + mny(tt) });
    // المخصوم فعليًا بالكشوف مقابل المتوقع لآخر شهر له كشف
    const D = dx.moData(dx.monN(12)).filter(x => x.hasPay), last = D[D.length - 1];
    if (last && last.exp > 0) {
      const p = last.act / last.exp * 100;
      out.push({ g: 'الاشتراكات', k: 'pay', label: 'المخصوم فعليًا بالكشوف مقابل المتوقع — ' + dx.mlabL(last.mo), pct: Math.min(100, p), val: mny(last.act) + ' من ' + mny(last.exp), tone: Math.abs(p - 100) <= 0.5 ? 'a' : p < 100 ? 'w' : 'r', hint: p > 100.5 ? 'المخصوم أكبر من المتوقع (' + Math.round(p) + '٪)' : p < 99.5 ? 'نقص عن المتوقع (' + Math.round(p) + '٪)' : 'مطابق للمتوقع' });
    }
    // اكتمال الأرقام التأمينية
    const withNo = act.filter(e => e.insno).length;
    out.push({ g: 'جودة البيانات', k: 'insno', label: 'اكتمال الأرقام التأمينية', pct: act.length ? withNo / act.length * 100 : 0, val: fm(withNo) + ' من ' + fm(act.length) + ' مؤمن عليه', tone: act.length ? tone(withNo / act.length * 100) : 'i', hint: '' });
    return out;
  });
}

/* ---------------- 29: ملفات تحتاج مراجعة ---------------- */
const RV = [['noins', 'r'], ['cfi', 'r'], ['low', 'w'], ['noout', 'w'], ['nostart', 'w'], ['cfp', 'i']];
export function review(co) {
  return scoped(co, () => {
    const ids = new Set();
    const cats = RV.map(([k, s]) => {
      const f = XF2[k], l = f ? S.emps.filter(f) : [];
      l.forEach(e => ids.add(e.id));
      return { k, s, label: XL[k] || k, n: l.length, list: l.map(e => ({ id: e.id, name: e.name, co: cn(e.cid), code: e.code || '' })) };
    }).filter(c => c.n);
    return { total: ids.size, cats };
  });
}

/* ---------------- 28: انتهاء المستندات والتجديدات (مستندات السيارات: الرخصة/التأمين الإجباري/الفحص الفني) ---------------- */
const EXP_FIELDS = [['licExp', 'رخصة السيارة'], ['insExp', 'التأمين الإجباري'], ['inspExp', 'الفحص الفني']];
export function expiries() {
  const out = [], t0 = new Date(today() + 'T00:00:00');
  CS().forEach(c => EXP_FIELDS.forEach(([k, l]) => {
    const d = c[k]; if (!d) return;
    const n = Math.ceil((new Date(d + 'T00:00:00') - t0) / 864e5);
    if (isNaN(n)) return;
    out.push({ id: c.id + k, car: c.id, plate: c.plate || '—', what: l, date: d, days: n, sev: n <= 7 ? 'r' : n <= 30 ? 'w' : 'a' });
  }));
  return out.sort((a, b) => a.days - b.days);
}
export function expiryText(n) {
  if (n < 0) return 'منتهي منذ ' + fm(-n) + ' يوم';
  if (n === 0) return 'ينتهي اليوم';
  if (n === 1) return 'ينتهي غدًا';
  return 'متبقي ' + fm(n) + ' يوم';
}
export function expirySummary() {
  const l = expiries();
  return { all: l, near: l.filter(x => x.days <= 90), expired: l.filter(x => x.days < 0).length, soon: l.filter(x => x.days >= 0 && x.days <= 30).length, ok: l.filter(x => x.days > 30).length };
}

/* ---------------- 32: كارت التنبيهات ---------------- */
export const alertList = (co) => scoped(co, () => alerts().map(a => ({ ...a })));

/* ---------------- 33: الملخص اليومي ---------------- */
export function summary() {
  const T = TS(), keep = t => ({ id: t.id, title: t.title, due: t.due, time: t.time || '', pri: t.pri });
  const late = T.filter(t => tst(t) == 'late').sort(tsort), td = T.filter(t => tst(t) == 'today').sort(tsort);
  const soon = T.filter(t => tst(t) == 'soon').sort(tsort)[0];
  const pend = Q().filter(q => q.status == QS[0]);
  const ex = expiries().filter(x => x.days <= 30), al = alerts(), rv = review('');
  const d0 = new Date(), cm = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0');
  const hires = S.emps.filter(e => String(e.start || '').slice(0, 7) == cm).length;
  const leaves = S.emps.filter(e => e.status != 'active' && String(e.end || '').slice(0, 7) == cm).length;
  const s = {
    date: d0.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    late: late.map(keep), today: td.map(keep), next: soon ? keep(soon) : null,
    pend: pend.length, exp: ex.slice(0, 5), expN: ex.length, alerts: al.length, review: rv.total, hires, leaves
  };
  s.empty = !s.late.length && !s.today.length && !s.pend && !s.expN && !s.alerts && !s.review;
  return s;
}
export const hasSummary = () => { try { return !summary().empty; } catch (e) { return false; } };

/* ---------------- تنقّل ---------------- */
// نفس طريقة aGo() القديمة: تضبط مرشحات صفحة الموظفين ثم تنتقل
// v15.6: التنقل يُنفَّذ بعد انتهاء معالج الضغط (setTimeout 0) حتى لا يُفكّ تطبيق Vue ولا يُستبدل DOM الخاص به أثناء تنفيذه،
// وأي خطأ في الانتقال لا يصل لمعالج أخطاء اللوحة (الذي كان يعيد الشكل القديم ويلغي الضغطة).
export function later(fn) {
  setTimeout(() => { try { fn(); } catch (e) { console.error('[AmanUI]', e); try { toast('تعذر فتح الصفحة المطلوبة'); } catch (x) { /* لا شيء */ } } }, 0);
}
export function openEmps({ co = '', s = '', x = '' } = {}) {
  if (x && !XF2[x]) x = '';
  later(() => { flt = { c: validCo(co), s, q: '', x, fn: '', k: '' }; ep = 0; nv('emp'); });
}
export function openReqs(co) { later(() => { qf = { c: validCo(co) ? cn(co) : '', q: '' }; nv('req'); }); }
export function openAlert(a, co) {   // المرحلة 4 (59): يفتح السجل المطلوب نفسه؛ ولو فشل الانتقال الغني نذهب للصفحة مباشرة
  later(() => {
    try { openAlertTarget(a, co); } catch (e) {
      console.error('[AmanUI] openAlert', e);
      if (a && a.g === 'emp') { flt = { c: '', s: '', q: '', x: '', fn: '', k: '' }; ep = 0; }
      nv((a && a.g) || 'dash');
    }
  });
}   // المرحلة 4 (59): يفتح السجل المطلوب نفسه
