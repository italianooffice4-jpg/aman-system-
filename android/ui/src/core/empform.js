// المرحلة 3 — منطق نموذج الموظف وملفه (بدون أي اعتماد على Vue حتى يمكن اختباره مباشرة على التطبيق الحقيقي).
// يقرأ ويكتب في نفس بيانات البرنامج القديم (S) وبنفس دوال الحفظ القديمة (chk, addDocs, lg, save)، فلا تغيير في مفاتيح التخزين.
// الإضافة الوحيدة على شكل البيانات (اختيارية وتُضاف عند الحاجة فقط) داخل كائن الموظف نفسه:
//   e.notes = [{ id, t, u, text, pin, arch }]            (44) الملاحظات
//   e.moves = [{ id, t, date, from, to, fromName, toName, note, u }]   (43) سجل الانتقال بين المنشآت
import { emps, norm } from './legacy.js';

/* ---------------- أدوات صغيرة ---------------- */
export const dig = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, c => c.charCodeAt(0) - 1632).replace(/[۰-۹]/g, c => c.charCodeAt(0) - 1776);
const today0 = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
const cname = (id) => (typeof cn === 'function' ? cn(id) : '—');
const user0 = () => { try { return (typeof CU !== 'undefined' && CU && CU.name) || ''; } catch (e) { return ''; } };
const uid0 = () => (typeof uid === 'function' ? uid() : Math.random().toString(36).slice(2, 9));
const S0 = () => (typeof S !== 'undefined' ? S : { emps: [], companies: [], log: [], reqs: [], cfg: {} });

/* قناع التاريخ يوم/شهر/سنة — نفس سلوك dmask القديمة لكن يرجع نصًا (للاستخدام مع v-model) */
export function maskDate(raw) {
  const d = dig(raw).replace(/\D/g, '').slice(0, 8);
  let o = d.slice(0, 2);
  if (d.length > 2) o += '/' + d.slice(2, 4);
  if (d.length > 4) o += '/' + d.slice(4);
  return o;
}
/* '' فارغ • null غير صحيح • 'YYYY-MM-DD' صحيح — نفس pd القديمة */
export function parseDate(s) {
  s = dig(s).trim();
  if (!s) return '';
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
  if (!m) return null;
  const d = +m[1], o = +m[2], y = +m[3], x = new Date(y, o - 1, d);
  if (x.getFullYear() !== y || x.getMonth() !== o - 1 || x.getDate() !== d) return null;
  return y + '-' + String(o).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
export const isoToDmy = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };

/* ---------------- الحقول ---------------- */
export const BASE_KEYS = ['name', 'code', 'cid', 'insno', 'job', 'nid', 'wage', 'start', 'reqIn', 'reqInDate'];
export const RES_KEYS = ['end', 'rtype', 'reqOut', 'reqOutDate'];
export const DATE_KEYS = ['start', 'reqInDate', 'end', 'reqOutDate'];
const EXTRA_FALLBACK = [['nat', 'الجنسية'], ['qual', 'المؤهل'], ['sector', 'القطاع'], ['subcode', 'كود الاشتراك'], ['ptype', 'نوع المدة'], ['phone', 'رقم تليفون المؤمن عليه'], ['addr_b', 'محل الإقامة: عقار رقم'], ['addr_s', 'الشارع'], ['addr_v', 'القرية'], ['addr_d', 'القسم / المركز'], ['addr_g', 'المحافظة']];
/* الحقول الإضافية تُقرأ من EXTRA() القديمة حتى لا تنحرف عنها لو تغيّرت */
export function extraFields() {
  try { if (typeof EXTRA === 'function') { const l = EXTRA({}).map(x => [x.k, x.l]); if (l.length) return l; } } catch (e) { /* احتياطي */ }
  return EXTRA_FALLBACK;
}
export const LABELS = () => ({
  name: 'الاسم', code: 'كود الموظف', cid: 'الشركة (المسجل بها تأمينيًا)', insno: 'الرقم التأميني', job: 'الوظيفة', nid: 'الرقم القومي', wage: 'الأجر الشهري',
  start: 'تاريخ الالتحاق', reqIn: 'رقم طلب الالتحاق', reqInDate: 'تاريخ طلب الالتحاق', end: 'تاريخ الاستقالة', rtype: 'نوع انتهاء الخدمة', reqOut: 'رقم طلب الاستقالة', reqOutDate: 'تاريخ طلب الاستقالة',
  ...Object.fromEntries(extraFields())
});
export const DOC_KINDS = ['التحاق', 'استقالة', 'عقد العمل', 'بطاقة الرقم القومي', 'شهادة الميلاد', 'المؤهل الدراسي', 'تقرير الكشف الطبي 111', 'صحيفة الحالة الجنائية (فيش)', 'أخرى'];
export const rtypes = () => (typeof RT !== 'undefined' ? RT : ['استقالة', 'وفاة', 'انقطاع عن العمل', 'بلوغ السن']);
export const visibleKeys = (rs) => [...BASE_KEYS, ...(rs ? RES_KEYS : []), ...extraFields().map(x => x[0])];

/* نموذج الحقول (نصوص كما تظهر للمستخدم) من كائن الموظف */
export function toModel(e, rs) {
  e = e || {};
  const m = {};
  visibleKeys(rs).forEach((k) => {
    if (DATE_KEYS.includes(k)) m[k] = isoToDmy(e[k]);
    else if (k === 'wage') m[k] = e.wage == null || e.wage === '' ? '' : String(e.wage);
    else m[k] = e[k] == null ? '' : String(e[k]);
  });
  if (!m.rtype && rs) m.rtype = rtypes()[0];
  m.moveDate = isoToDmy(today0());
  m.moveNote = '';
  m.moveKind = 'move';        // move = انتقال فعلي (يُسجَّل) • fix = تصحيح شركة مسجلة بالخطأ (لا يُسجَّل)
  return m;
}

/* القيم المحفوظة (نفس شكل v في editE القديمة): نصوص مقصوصة، تواريخ ISO، أجر رقمي */
export function toValues(m, rs) {
  const v = {};
  visibleKeys(rs).forEach((k) => {
    const raw = m[k] == null ? '' : String(m[k]);
    if (DATE_KEYS.includes(k)) { const d = parseDate(raw); v[k] = d || ''; }
    else if (k === 'wage') v.wage = +dig(raw) || 0;
    else if (k === 'nid') v.nid = dig(raw).replace(/\s+/g, '');
    else if (k === 'insno' || k === 'phone') v[k] = dig(raw).trim();
    else v[k] = raw.trim();
  });
  return v;
}

/* ---------------- الرقم القومي (35/36) ---------------- */
export function nidState(raw) {
  const id = dig(raw).replace(/\D/g, '');
  if (!id) return { state: 'empty', id };
  if (id.length < 14) return { state: 'partial', id, len: id.length };
  if (id.length > 14) return { state: 'long', id, len: id.length };
  const A = window.a9;
  if (!A || typeof A.nid !== 'function') return { state: 'unknown', id };
  const r = A.nid(id);
  return r.valid ? { state: 'ok', id, ...r } : { state: 'bad', id, error: r.error };
}

/* ---------------- حساب الاشتراك (37) ---------------- */
export function contrib(wageRaw) {
  const t = dig(wageRaw).trim();
  if (!t) return null;
  const w = +t;
  if (!isFinite(w) || w < 0) return null;
  const cfg = S0().cfg || {};
  const r = calc({ wage: w });
  return { wage: w, base: r.w, emp: r.a, er: r.b, total: r.a + r.b, capped: w < +cfg.min ? 'min' : w > +cfg.max ? 'max' : '', min: +cfg.min, max: +cfg.max, empPct: cfg.emp, erPct: cfg.er };
}

/* ---------------- التكرار (35) ---------------- */
export function dupInfo(nid, insno, selfId) {
  const others = emps().filter(x => x.id !== selfId);
  const out = { nidActive: null, insActive: null, nidOld: null, insOld: null };
  if (nid) { out.nidActive = others.find(x => x.status === 'active' && x.nid === nid) || null; if (!out.nidActive) out.nidOld = others.find(x => x.nid === nid) || null; }
  if (insno) { out.insActive = others.find(x => x.status === 'active' && x.insno === insno) || null; if (!out.insActive) out.insOld = others.find(x => x.insno === insno) || null; }
  return out;
}

/* ---------------- اقتراح الرقم التأميني (38) ----------------
   الرقم التأميني يخص الشخص لا الشركة: لو نفس الرقم القومي مسجّل من قبل (موظف سابق/مستقيل) ومعه رقم تأميني نقترحه.
   بدون رقم قومي: نقترح من ملف بنفس الاسم تمامًا (اقتراح أضعف ويُنبَّه عليه). لا نخترع أرقامًا تسلسلية. */
export function suggestInsNo(nidRaw, name, selfId) {
  const id = dig(nidRaw).replace(/\D/g, '');
  const others = emps().filter(x => x.id !== selfId && x.insno);
  const rank = (a, b) => (a.status === 'active') - (b.status === 'active') || (b._u || 0) - (a._u || 0);
  if (id.length === 14) {
    const hit = others.filter(x => x.nid === id).sort(rank).reverse()[0];
    if (hit) return { value: String(hit.insno), reason: 'مسجل لنفس الرقم القومي في ملف «' + hit.name + '» (' + cname(hit.cid) + ')', weak: false, empId: hit.id };
  }
  const nm = norm(name || '');
  if (nm.length >= 6 && id.length !== 14) {
    const hit = others.filter(x => norm(x.name) === nm && (!x.nid || !id)).sort(rank).reverse()[0];
    if (hit) return { value: String(hit.insno), reason: 'نفس الاسم في ملف (' + cname(hit.cid) + ') — تأكد أنه نفس الشخص', weak: true, empId: hit.id };
  }
  return null;
}

/* ---------------- إكمال الاسم (40) ---------------- */
export function nameMatches(q, selfId, limit) {
  limit = limit || 6;
  const nq = norm(q || '');
  if (nq.length < 2) return [];
  const toks = nq.split(' ').filter(Boolean);
  const res = [];
  for (const e of emps()) {
    if (e.id === selfId || !e.name) continue;
    const n = norm(e.name);
    if (!toks.every(t => n.includes(t))) continue;
    const sc = n.startsWith(toks[0]) ? 3 : n.split(' ').some(w => w.startsWith(toks[0])) ? 2 : 1;
    res.push({ sc: sc + (e.status === 'active' ? 0.5 : 0), kind: 'emp', id: e.id, name: e.name, sub: cname(e.cid) + ' · ' + (e.status === 'active' ? 'مؤمن عليه' : (e.rtype || 'مستقيل')), nid: e.nid || '' });
  }
  const reqs = S0().reqs || [];
  for (const r of reqs) {
    if (!r.name) continue;
    const n = norm(r.name);
    if (!toks.every(t => n.includes(t))) continue;
    res.push({ sc: 1.2, kind: 'req', id: r.id, name: r.name, sub: 'طلب دخول · ' + (r.status || ''), nid: '' });
  }
  res.sort((a, b) => (b.sc - a.sc) || a.name.localeCompare(b.name, 'ar'));
  return res.slice(0, limit);
}
/* القيم التي تُنقل عند اختيار اقتراح (لا يُنقل الأجر ولا التواريخ ولا الكود ولا الشركة من موظف قديم) */
export function prefillFrom(item) {
  const out = {};
  if (item.kind === 'emp') {
    const e = emps().find(x => x.id === item.id); if (!e) return out;
    ['name', 'nid', 'insno', 'job', ...extraFields().map(x => x[0])].forEach((k) => { if (e[k]) out[k] = String(e[k]); });
  } else {
    const q = (S0().reqs || []).find(x => x.id === item.id); if (!q) return out;
    out.name = q.name || '';
    if (q.code) out.code = String(q.code);
    if (q.job) out.job = String(q.job);
    if (q.hdate) out.start = isoToDmy(q.hdate);
    let cid = '';
    try { const nm = typeof qc === 'function' ? qc(q) : q.cname; cid = (S0().companies.find(c => c.name === nm) || {}).id || q.cid || ''; } catch (e) { cid = q.cid || ''; }
    if (cid) out.cid = cid;
  }
  return out;
}
export function sameNameOthers(name, selfId) {
  const nm = norm(name || '');
  if (nm.length < 4) return [];
  return emps().filter(x => x.id !== selfId && norm(x.name) === nm);
}

/* ---------------- التحقق (35/39) ----------------
   يعيد { err: {حقل: {m, req}}, warn: {حقل: نص} }.  req=true ⇒ رسالة «مطلوب» (تظهر بعد لمس الحقل أو محاولة الحفظ فقط).
   الأخطاء تمنع الحفظ؛ التحذيرات لا. القواعد الصارمة هي نفسها في editE/chk القديمة (14 رقمًا، تكرار الموظفين المؤمن عليهم). */
export function validate(m, ctx) {
  const err = {}, warn = {};
  const rs = !!ctx.rs, orig = ctx.orig || {};
  const E = (k, msg, req) => { if (!err[k]) err[k] = { m: msg, req: !!req }; };
  const W = (k, msg) => { if (!warn[k]) warn[k] = msg; };
  const v = toValues(m, rs);

  if (!v.name) E('name', 'الاسم مطلوب', true);
  if (!m.cid) E('cid', 'اختر الشركة', true);

  // الرقم القومي
  if (!v.nid) E('nid', 'الرقم القومي مطلوب', true);
  else {
    const changed = orig.nid !== v.nid;
    if (!/^\d{14}$/.test(v.nid)) {
      if (changed) E('nid', 'الرقم القومي يجب أن يتكون من 14 رقمًا' + (/^\d+$/.test(v.nid) ? ' (المكتوب ' + v.nid.length + ')' : ''));
      else W('nid', 'الرقم القومي المسجّل ليس 14 رقمًا — يُنصح بتصحيحه');
    } else {
      const st = nidState(v.nid);
      if (st.state === 'bad') W('nid', 'الرقم لا يطابق قواعد الرقم القومي (' + st.error + ') — يمكن الحفظ لكن راجع الرقم');
      else if (st.state === 'ok') {
        if (!rs && st.retired) W('nid', 'بلغ سن المعاش بتاريخ ' + isoToDmy(st.retire));
        const sd = parseDate(m.start);
        if (sd) { const ageAt = +sd.slice(0, 4) - +st.birth.slice(0, 4); if (ageAt < 15) W('nid', 'السن وقت الالتحاق نحو ' + ageAt + ' سنة — راجع تاريخ الالتحاق أو الرقم'); }
      }
    }
  }
  // الرقم التأميني
  if (v.insno && !/^\d+$/.test(v.insno)) W('insno', 'الرقم التأميني عادةً أرقام فقط');

  // التكرار — نفس قاعدة chk القديمة: يُمنع للموظف المؤمن عليه فقط
  const d = dupInfo(v.nid, v.insno, ctx.id);
  if (d.nidActive) {
    const msg = 'الرقم القومي مسجل بالفعل للموظف المؤمن عليه «' + d.nidActive.name + '»';
    if (!rs) E('nid', msg); else W('nid', msg);
  } else if (d.nidOld && /^\d{14}$/.test(v.nid)) W('nid', 'مسجل أيضًا في ملف سابق «' + d.nidOld.name + '» (' + cname(d.nidOld.cid) + ')');
  if (d.insActive) {
    const msg = 'الرقم التأميني مسجل بالفعل للموظف المؤمن عليه «' + d.insActive.name + '»';
    if (!rs) E('insno', msg); else W('insno', msg);
  }

  // الأجر
  const wt = dig(m.wage).trim();
  if (!wt) E('wage', 'الأجر مطلوب', true);
  else if (!isFinite(+wt) || +wt < 0) E('wage', 'أدخل أجرًا صحيحًا (رقم موجب)');
  else if (+wt === 0) W('wage', 'الأجر صفر — سيُحتسب التأمين على الحد الأدنى');

  // التواريخ
  const BADD = 'اكتب التاريخ بصيغة يوم/شهر/سنة، مثال 25/03/2026';
  DATE_KEYS.forEach((k) => {
    if (!(k in m)) return;
    if (k === 'end' && !rs) return;
    if (k === 'reqOutDate' && !rs) return;
    const raw = String(m[k] || '').trim();
    if (!raw) { if (k === 'start') E(k, 'تاريخ الالتحاق مطلوب', true); else if (k === 'end' && rs) E(k, 'تاريخ الاستقالة مطلوب', true); return; }
    if (parseDate(raw) === null) E(k, BADD);
  });
  const sd = parseDate(m.start), ed = rs ? parseDate(m.end) : '';
  if (sd && ed && ed < sd) E('end', 'تاريخ الاستقالة قبل تاريخ الالتحاق');
  if (sd && sd > today0()) W('start', 'تاريخ الالتحاق في المستقبل');

  // الانتقال بين المنشآت (43): فقط لموظف مؤمن عليه قائم تغيّرت شركته ولم يُعلَّم أنه تصحيح
  const mv = moveIntent(m, ctx);
  if (mv) {
    const md = String(m.moveDate || '').trim();
    if (!md) E('moveDate', 'تاريخ الانتقال مطلوب', true);
    else if (parseDate(md) === null) E('moveDate', BADD);
    else if (sd && parseDate(md) < sd) E('moveDate', 'تاريخ الانتقال قبل تاريخ الالتحاق');
  }
  return { err, warn };
}
export function moveIntent(m, ctx) {
  const orig = ctx.orig || {};
  return !!(ctx.id && !ctx.rs && orig.cid && m.cid && m.cid !== orig.cid && m.moveKind !== 'fix');
}

/* ---------------- مراجعة التعديلات قبل الحفظ (45) ---------------- */
const show = (k, val) => {
  if (val == null || val === '') return '—';
  if (DATE_KEYS.includes(k)) return isoToDmy(val) || String(val);
  if (k === 'cid') return cname(val);
  if (k === 'wage') return String(+val);
  return String(val);
};
export function diffModel(orig, m, rs, isNew) {
  const v = toValues(m, rs), L = LABELS(), out = [];
  visibleKeys(rs).forEach((k) => {
    const a = isNew ? '' : (orig[k] == null ? '' : orig[k]);
    const b = v[k] == null ? '' : v[k];
    if (isNew) { if (b !== '' && b !== 0) out.push({ k, label: L[k] || k, from: '—', to: show(k, b) }); return; }
    const same = k === 'wage' ? (+a || 0) === (+b || 0) : String(a) === String(b);
    if (!same) out.push({ k, label: L[k] || k, from: show(k, a), to: show(k, b) });
  });
  return out;
}

/* ---------------- الحفظ (نفس منطق editE/regQ القديمة) ---------------- */
export function recordMove(e, fromCid, toCid, dateISO, note) {
  e.moves = e.moves || [];
  const mv = { id: uid0(), t: Date.now(), date: dateISO || today0(), from: fromCid, to: toCid, fromName: cname(fromCid), toName: cname(toCid), note: String(note || '').trim(), u: user0() };
  e.moves.push(mv);
  return mv;
}

/* opts: { id, rs, files, kind, removeDocs:Set, moveKind, moveDate, moveNote, reqId }  — يعيد {ok, err, field, emp} */
export async function saveEmployee(m, opts) {
  const s = S0(), rs = !!opts.rs;
  const v = toValues(m, rs);
  let e = opts.id ? s.emps.find(x => x.id === opts.id) : null;
  const isNew = !e;
  const chkArg = e || {};
  const er = typeof chk === 'function' ? chk(v, !rs, chkArg) : '';
  if (er) return { ok: false, err: er, field: /الرقم القومي/.test(er) ? 'nid' : /الرقم التأميني/.test(er) ? 'insno' : '' };

  const ctx = { id: opts.id, rs, orig: e || {} };
  const doMove = moveIntent(m, ctx);
  const fromCid = e ? e.cid : '';
  if (isNew) { e = {}; Object.assign(e, { id: uid0(), status: 'active', end: '', docs: [], inSt: 'بانتظار التأكيد' }, v); s.emps.push(e); }
  else Object.assign(e, v);

  if (doMove) {
    const dISO = parseDate(m.moveDate) || today0();
    recordMove(e, fromCid, v.cid, dISO, m.moveNote);
    lg('نقل موظف', e.name + ': ' + cname(fromCid) + ' ← ' + cname(v.cid), e.id);
  }
  const rm = opts.removeDocs ? [...opts.removeDocs] : [];
  if (rm.length && e.docs) {
    e.docs.filter(d => rm.includes(d.id)).forEach((d) => { lg('حذف مستند', e.name + ': ' + d.name, e.id); });
    e.docs = e.docs.filter(d => !rm.includes(d.id));
    rm.forEach((id) => { try { dbx('delete', id).catch(() => {}); } catch (x) { /* لا شيء */ } });
  }
  let docsErr = '';
  if (opts.files && opts.files.length) {
    try { await addDocs(e, opts.files, opts.kind || (rs ? 'استقالة' : 'التحاق')); } catch (x) { console.error('[AmanUI] addDocs', x); docsErr = 'تعذر حفظ المستندات'; }
  }
  if (opts.reqId) {
    s.reqs = (s.reqs || []).filter(x => x.id !== opts.reqId);
    lg('تسجيل موظف من طلب دخول', e.name, e.id);
  } else lg(isNew ? 'إضافة موظف' : 'تعديل موظف', e.name, e.id);
  return { ok: true, emp: e, isNew, moved: doMove, docsErr };
}

/* ---------------- الانتقال من شاشة الملف (43) ---------------- */
export function transferEmp(e, toCid, dateRaw, note) {
  const s = S0();
  if (!e) return { ok: false, err: 'الموظف غير موجود' };
  if (e.status !== 'active') return { ok: false, err: 'لا يمكن تسجيل انتقال لموظف مستقيل' };
  if (!toCid || !s.companies.some(c => c.id === toCid)) return { ok: false, err: 'اختر الشركة المنقول إليها' };
  if (toCid === e.cid) return { ok: false, err: 'الموظف مسجل بالفعل في هذه الشركة' };
  const raw = String(dateRaw || '').trim();
  const d = raw ? parseDate(raw) : today0();
  if (d === null) return { ok: false, err: 'اكتب تاريخ الانتقال بصيغة يوم/شهر/سنة، مثال 25/03/2026', field: 'date' };
  if (e.start && d < e.start) return { ok: false, err: 'تاريخ الانتقال قبل تاريخ الالتحاق', field: 'date' };
  const from = e.cid;
  e.cid = toCid;
  recordMove(e, from, toCid, d, note);
  lg('نقل موظف', e.name + ': ' + cname(from) + ' ← ' + cname(toCid), e.id);
  return { ok: true };
}

/* ---------------- الملاحظات (44) ---------------- */
export const NOTE_LOG = ['إضافة ملاحظة', 'تثبيت ملاحظة', 'إلغاء تثبيت ملاحظة', 'أرشفة ملاحظة', 'استعادة ملاحظة', 'حذف ملاحظة'];
export function notesOf(e, arch) {
  const l = (e && e.notes || []).filter(n => !!n.arch === !!arch);
  return l.sort((a, b) => (!!b.pin - !!a.pin) || (b.t - a.t));
}
export function addNote(e, text, pin) {
  text = String(text || '').trim();
  if (!text) return { ok: false, err: 'اكتب نص الملاحظة' };
  if (text.length > 2000) return { ok: false, err: 'الملاحظة أطول من 2000 حرف' };
  e.notes = e.notes || [];
  const n = { id: uid0(), t: Date.now(), u: user0(), text, pin: !!pin, arch: false };
  e.notes.push(n);
  lg('إضافة ملاحظة', e.name, e.id);
  return { ok: true, note: n };
}
const noteOp = (e, id, fn, act) => { const n = (e.notes || []).find(x => x.id === id); if (!n) return false; fn(n); lg(act, e.name, e.id); return true; };
export const pinNote = (e, id, on) => noteOp(e, id, n => { n.pin = !!on; }, on ? 'تثبيت ملاحظة' : 'إلغاء تثبيت ملاحظة');
export const archiveNote = (e, id) => noteOp(e, id, n => { n.arch = true; n.pin = false; }, 'أرشفة ملاحظة');
export const restoreNote = (e, id) => noteOp(e, id, n => { n.arch = false; }, 'استعادة ملاحظة');
export function deleteNote(e, id) {
  const i = (e.notes || []).findIndex(x => x.id === id && x.arch);   // الحذف النهائي للمؤرشفة فقط
  if (i < 0) return false;
  e.notes.splice(i, 1); lg('حذف ملاحظة', e.name, e.id);
  return true;
}

/* ---------------- الخط الزمني (42) ---------------- */
export const TL_TYPES = { hire: 'التحاق', exit: 'خروج', req: 'طلب', edit: 'تعديل', doc: 'مستند', move: 'انتقال', note: 'ملاحظة', other: 'أخرى' };
const logType = (a) => {
  a = String(a || '');
  if (/^(إضافة موظف|تسجيل موظف|إعادة تعيين)/.test(a)) return 'hire';
  if (/^تسجيل /.test(a)) return 'exit';
  if (/^تعديل/.test(a)) return 'edit';
  if (/مستند|بطاقة|OCR/.test(a)) return 'doc';
  return 'other';
};
const dayTs = (iso) => { const t = new Date(String(iso) + 'T12:00:00').getTime(); return isFinite(t) ? t : 0; };
export function buildTimeline(e) {
  if (!e) return [];
  const ev = [], add = (key, ts, type, title, detail, user, timed) => { if (ts) ev.push({ key, ts, type, title, detail: detail || '', user: user || '', timed: !!timed, day: new Date(ts).toISOString().slice(0, 10) }); };
  if (e.reqIn) add('rq-in', dayTs(e.reqInDate) || dayTs(e.start), 'req', 'طلب التحاق رقم ' + e.reqIn, e.reqInDate ? '' : 'بدون تاريخ');
  if (e.start) add('start', dayTs(e.start), 'hire', 'تاريخ الالتحاق', cname(e.cid));
  if (e.reqOut) add('rq-out', dayTs(e.reqOutDate) || dayTs(e.end), 'req', 'طلب ' + (e.rtype || 'استقالة') + ' رقم ' + e.reqOut, '');
  if (e.status === 'resigned' && e.end) add('end', dayTs(e.end), 'exit', 'انتهاء الخدمة: ' + (e.rtype || 'استقالة'), '');
  (e.moves || []).forEach((mv, i) => add('mv' + i, dayTs(mv.date) || mv.t, 'move', 'انتقال من «' + (mv.fromName || cname(mv.from)) + '» إلى «' + (mv.toName || cname(mv.to)) + '»', mv.note, mv.u));
  (e.notes || []).forEach((n, i) => add('nt' + i, n.t, 'note', (n.pin ? '📌 ' : '') + 'ملاحظة' + (n.arch ? ' (مؤرشفة)' : ''), n.text, n.u, true));
  (S0().log || []).filter(l => l.eid === e.id && !NOTE_LOG.includes(l.a) && l.a !== 'نقل موظف').forEach((l, i) => add('lg' + i, l.t, logType(l.a), l.a, l.d && l.d !== e.name ? l.d : '', l.u, true));
  ev.sort((a, b) => b.ts - a.ts);
  return ev;
}

/* ---------------- مراجع ----------------
   عند الحاجة لعرض رقم الملف/رسالة التأكيد: نفس دوال البرنامج القديم */
export function fileInfo(e) {
  let fno = '—', cf = '—';
  try { fno = fm(FNM().get(e.id)) + ' من ' + fm(fnTot(e)) + ' في ' + cname(e.cid); } catch (x) { /* لا شيء */ }
  try { cf = (e.status === 'resigned' ? 'خروج: ' : 'دخول: ') + (cfOf(e).st || 'غير محدد'); } catch (x) { /* لا شيء */ }
  return { fno, cf };
}
