// المرحلة 5 (68) — فهم الأسئلة المركبة بالعربية وتنفيذها على بيانات البرنامج (محليًا بلا إنترنت ولا ذكاء اصطناعي خارجي).
// يفهم: العدد/القائمة/الإجمالي/المتوسط/الأعلى/الأقل/التوزيع، مع مرشحات مجمّعة: الحالة، الشركة، الوظيفة، الأجر (أكبر/أقل/بين)، السن، النوع،
// تاريخ الالتحاق أو الاستقالة (سنة/شهر/«هذا الشهر»/«آخر 3 أشهر»…)، ونواقص (بلا مستندات/بلا رقم تأميني/بيانات ناقصة/معاش).
// يرجع { understood: [..] } ليرى المستخدم كيف فُهم سؤاله، أو null لو لم يتعرف على شيء فيرجع المساعد القديم لمنطقه.
import { F as ALERT_F } from './alerts.js';

const AD = '٠١٢٣٤٥٦٧٨٩', PD = '۰۱۲۳۴۵۶۷۸۹';
const dig = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, (d) => AD.indexOf(d)).replace(/[۰-۹]/g, (d) => PD.indexOf(d));
const norm = (s) => dig(s).replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[؟?!,،.]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (t, re) => re.test(t);
const num = (t) => { const m = /(\d[\d,٬]*(?:\.\d+)?)/.exec(t); return m ? +m[1].replace(/[,٬]/g, '') : null; };

const MONTHS = [['يناير', 'كانون الثاني'], ['فبراير', 'شباط'], ['مارس', 'اذار'], ['ابريل', 'نيسان'], ['مايو', 'ايار'], ['يونيو', 'حزيران'], ['يوليو', 'تموز'], ['اغسطس', 'اب'], ['سبتمبر', 'ايلول'], ['اكتوبر', 'تشرين الاول'], ['نوفمبر', 'تشرين الثاني'], ['ديسمبر', 'كانون الاول']].map((a) => a.map(norm));
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const lastDay = (y, m) => new Date(y, m, 0).getDate();

/* ---------- مدى التاريخ: { from, to, label } أو null ---------- */
export function dateRange(t, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth() + 1;
  let r;
  if ((r = /اخر\s+(\d+|ثلاث|ثلاثه|ست|سته)?\s*(يوم|ايام|شهر|شهور|اشهر|سنه|سنوات|سنين)/.exec(t))) {
    const n = r[1] ? (/^\d+$/.test(r[1]) ? +r[1] : /ثلاث/.test(r[1]) ? 3 : 6) : 1, u = r[2], d = new Date(now);
    if (/يوم|ايام/.test(u)) d.setDate(d.getDate() - n); else if (/شهر|شهور|اشهر/.test(u)) d.setMonth(d.getMonth() - n); else d.setFullYear(d.getFullYear() - n);
    return { from: iso(d), to: iso(now), label: 'آخر ' + n + ' ' + (/يوم|ايام/.test(u) ? 'يوم' : /شهر|شهور|اشهر/.test(u) ? 'شهر' : 'سنة') };
  }
  if (/(هذا|الحالي|الجاري)\s*(الشهر)|الشهر\s*(هذا|الحالي|الجاري)/.test(t)) return { from: y + '-' + pad(m) + '-01', to: y + '-' + pad(m) + '-' + pad(lastDay(y, m)), label: 'هذا الشهر' };
  if (/(الشهر)\s*(الماضي|السابق)/.test(t)) { const d = new Date(y, m - 2, 1); return { from: iso(d), to: y + '-' + pad(d.getMonth() + 1) + '-' + pad(lastDay(d.getFullYear(), d.getMonth() + 1)), label: 'الشهر الماضي' }; }
  if (/(العام|السنه)\s*(الماضي|السابق|الماضيه)/.test(t)) return { from: (y - 1) + '-01-01', to: (y - 1) + '-12-31', label: 'العام الماضي (' + (y - 1) + ')' };
  if (/(هذا|الحالي|الجاري)\s*(العام|السنه)|(العام|السنه)\s*(هذا|الحالي|الجاري)/.test(t)) return { from: y + '-01-01', to: y + '-12-31', label: 'هذا العام (' + y + ')' };
  // السنة تُقبل فقط بسياقها (في/عام/سنة/بعد/قبل/خلال… أو بعد اسم شهر) كي لا يُفهم أجر مثل 2050 على أنه سنة
  const yr = /(?:في|عام|سنه|لعام|لسنه|بعد|قبل|خلال|استقالات|التحاقات|تعيينات)\s*(20\d\d)(?:\s|$)/.exec(t) || new RegExp('(?:' + MONTHS.flat().join('|') + ')\\s*(20\\d\\d)').exec(t), yy = yr ? +yr[1] : null;
  for (let i = 0; i < 12; i++) {
    if (MONTHS[i].some((n) => new RegExp('(^|\\s)(ب|ل|في )?' + n + '(\\s|$)').test(t))) {
      const Y = yy || y;
      return { from: Y + '-' + pad(i + 1) + '-01', to: Y + '-' + pad(i + 1) + '-' + pad(lastDay(Y, i + 1)), label: MONTHS[i][0] + ' ' + Y };
    }
  }
  if (yy) return { from: yy + '-01-01', to: yy + '-12-31', label: 'سنة ' + yy };
  return null;
}

/* ---------- مقارنة رقمية: «أكبر من 5000» «بين 3000 و 5000» «لا يقل عن» ---------- */
export function compare(t, key) {
  // key: كلمات الموضوع (أجر/مرتب… أو عمر/سن)؛ نقرأ المقارنة التي تلي الكلمة مباشرة وتتوقف عند موضوع آخر (حتى لا تختلط شروط الأجر بشروط السن)
  const km = new RegExp('(?:' + key + ')').exec(t);
  if (!km) return null;
  let w = t.slice(km.index + km[0].length);
  const stop = /(عمر|(^| )سن( |ه)|اجر|مرتب|راتب|وظيف|شرك|التحق|استقال)/.exec(w.slice(1));
  if (stop) w = w.slice(0, stop.index + 1);
  const m = /(لا يقل عن|لا يزيد عن|اكبر من|اكثر من|اعلي من|اعلي|فوق|يزيد عن|يتجاوز|اقل من|اقل|تحت|دون|ينقص عن|يساوي|بالضبط|بين|من)?\s*(\d[\d,٬]*)(?:\s*(?:و|الي|الى|-|حتي)\s*(\d[\d,٬]*))?/.exec(w);
  if (!m) return null;
  const word = m[1] || '', a = num(m[2]), b = m[3] ? num(m[3]) : null;
  if (b != null) return { op: 'between', a: Math.min(a, b), b: Math.max(a, b) };
  if (/لا يقل عن/.test(word)) return { op: '>=', a };
  if (/لا يزيد عن/.test(word)) return { op: '<=', a };
  if (/اكبر|اكثر|اعلي|فوق|يزيد|يتجاوز/.test(word)) return { op: '>', a };
  if (/اقل|تحت|دون|ينقص/.test(word)) return { op: '<', a };
  if (/يساوي|بالضبط/.test(word) || !word) return { op: '=', a };
  return null;
}
const test = (c, v) => (c.op === '>' ? v > c.a : c.op === '<' ? v < c.a : c.op === '>=' ? v >= c.a : c.op === '<=' ? v <= c.a : c.op === 'between' ? v >= c.a && v <= c.b : v === c.a);
const cLabel = (c) => (c.op === 'between' ? 'بين ' + c.a + ' و ' + c.b : (c.op === '>=' ? '≥ ' : c.op === '<=' ? '≤ ' : c.op === '=' ? '= ' : c.op + ' ') + c.a);

const ageOf = (e) => { const r = window.a9 && a9.nid && e.nid ? a9.nid(dig(e.nid)) : null; if (!r || !r.valid || !r.birth) return null; const b = new Date(r.birth + 'T00:00:00'), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const genderOf = (e) => { const r = window.a9 && a9.nid && e.nid ? a9.nid(dig(e.nid)) : null; return r && r.valid ? r.gender : null; };
const clampW = (w) => Math.min(Math.max(+w || 0, +S.cfg.min || 0), +S.cfg.max || 1e12);

/* ---------- المحلل ---------- */
export function parse(q, now = new Date()) {
  const raw = String(q || ''), t = ' ' + norm(raw) + ' ', u = [], f = [];
  const out = { raw, entity: 'emp', agg: 'list', group: '', filters: f, understood: u, recognized: 0 };

  // الكيان
  if (has(t, / (شركات|شركه|منشات|منشاه) /) && !has(t, / (موظف|موظفين|عمال|عامل|مستقيل|مؤمن) /)) out.entity = 'comp';
  else if (has(t, / (سيارات|سياره|عربيات|عربيه|مركبات|ترخيص|تراخيص) /)) out.entity = 'car';
  else if (has(t, / (طلبات|طلب) /) && !has(t, / (موظف|موظفين|عمال) /)) out.entity = 'req';
  const E = { emp: 'موظفون', comp: 'شركات', car: 'سيارات', req: 'طلبات دخول' }[out.entity];
  if (has(t, / (موظف|موظفين|الموظفين|عمال|العمال|عامل|مؤمن|المؤمن|مستقيل|مستقيلين|المستقيلين|مستقيله|سيدات|رجال|ذكور|اناث|نساء|موظفات) /) || /(موظف|عامل|مؤمن|مستقيل|سيدات|رجال)/.test(t)) out.recognized++;
  if (out.entity !== 'emp') out.recognized++;

  // نوع النتيجة
  if (/(^| )(كم|عدد|كام)( |$)/.test(t)) { out.agg = 'count'; out.recognized++; }
  else if (/(اجمالي|مجموع)\s*(ال)?(اجور|اجر|مرتبات|رواتب|مرتب|راتب)/.test(t)) { out.agg = 'sum'; out.recognized++; }
  else if (/(متوسط)\s*(ال)?(اجور|اجر|مرتب|راتب|مرتبات|رواتب)/.test(t)) { out.agg = 'avg'; out.recognized++; }
  else if (/(اعلي|اكبر|اقصي)\s*(ال)?(اجر|مرتب|راتب)/.test(t)) { out.agg = 'max'; out.recognized++; }
  else if (/(اقل|ادني)\s*(ال)?(اجر|مرتب|راتب)/.test(t)) { out.agg = 'min'; out.recognized++; }
  else if (/(^| )(اعرض|هات|اعطني|اظهر|اريد|قائمه|اسماء|من هم|مين|ليستة|ورني|عايز)( |$)/.test(t)) { out.agg = 'list'; out.recognized++; }
  if (/(حسب|لكل|توزيع|موزعين على|موزعه على)\s*(الشركه|الشركات|شركه|المنشات|منشاه)/.test(t)) { out.group = 'comp'; out.recognized++; }
  else if (/(حسب|لكل|توزيع)\s*(الوظيفه|الوظائف|وظيفه|المهنه)/.test(t)) { out.group = 'job'; out.recognized++; }
  else if (/(حسب|لكل|توزيع)\s*(الحاله|الجنس|النوع)/.test(t)) { out.group = /الجنس|النوع/.test(t) ? 'gender' : 'status'; out.recognized++; }

  out.hasEntity = out.entity === 'emp' && /(موظف|عامل|مؤمن|مستقيل|سيدات|سيده|رجال|ذكور|اناث|موظفات)/.test(t);
  out.hasVerb = out.agg !== 'list' || /(^| )(اعرض|هات|اعطني|اظهر|اريد|قائمه|اسماء|من هم|مين|ورني|عايز)( |$)/.test(t);
  if (out.entity === 'emp') {
    // الحالة
    if (/(مستقيل|مستقيلين|المستقيلين|مستقيله|استقال|استقالوا|خرجوا|تركوا|انتهت خدمتهم)/.test(t)) { f.push({ k: 'status', v: 'resigned', l: 'مستقيلون' }); out.recognized++; }
    else if (/(مؤمن عليهم|مؤمن عليه|مؤمن عليها|المؤمن عليهم|علي راس العمل|نشط|حاليا|الحاليين|علي رأس العمل|شغالين)/.test(t)) { f.push({ k: 'status', v: 'active', l: 'مؤمن عليهم حاليًا' }); out.recognized++; }
    // الشركة (أطول اسم يطابق أولًا)
    const cs = S.companies.map((c) => ({ c, n: norm(c.name) })).filter((x) => x.n.length >= 2).sort((a, b) => b.n.length - a.n.length);
    const hit = []; let tt = t;
    cs.forEach((x) => { if (tt.includes(' ' + x.n + ' ') || tt.includes(x.n)) { hit.push(x.c); tt = tt.replace(x.n, ' '); } });
    if (hit.length) { f.push({ k: 'company', v: hit.map((c) => c.id), l: 'شركة ' + hit.map((c) => c.name).join(' أو ') }); out.recognized++; }
    // الوظيفة
    const jobs = [...new Set(S.emps.map((e) => (e.job || '').trim()).filter((j) => j.length >= 3))].map((j) => ({ j, n: norm(j) })).sort((a, b) => b.n.length - a.n.length);
    const jh = jobs.find((x) => { const j = x.n.replace(/^ال/, ''); return j.length >= 4 && t.includes(j); });   // «المحاسبين» تطابق «محاسب»
    if (jh) { f.push({ k: 'job', v: jh.n, l: 'وظيفة ' + jh.j }); out.recognized++; }
    // الأجر والسن
    const wc = compare(t, 'اجر|اجره|اجرهم|مرتب|مرتبه|مرتبهم|راتب|راتبه|راتبهم|يتقاضي|يتقاضون');
    if (wc && /(اجر|مرتب|راتب|يتقاضي|يتقاضون)/.test(t)) { f.push({ k: 'wage', v: wc, l: 'الأجر ' + cLabel(wc) }); out.recognized++; }
    const ac = /(عمر|سن|سنه)/.test(t) ? compare(t, 'عمر|عمره|عمرهم|سن|سنه') : null;
    if (ac && /(عمر|سن )/.test(t)) { f.push({ k: 'age', v: ac, l: 'السن ' + cLabel(ac) }); out.recognized++; }
    // النوع
    if (/(سيدات|سيده|اناث|انثي|نساء|موظفات|موظفه|بنات|الاناث)/.test(t)) { f.push({ k: 'gender', v: 'أنثى', l: 'سيدات' }); out.recognized++; }
    else if (/(رجال|ذكور|الرجال)/.test(t)) { f.push({ k: 'gender', v: 'ذكر', l: 'رجال' }); out.recognized++; }
    // التاريخ: الاستقالة تُقرأ من end والالتحاق من start
    const dr = dateRange(t.replace(/\d+\s*(جنيه|ج)/g, ' '), now);
    if (dr) {
      const resigned = f.some((x) => x.k === 'status' && x.v === 'resigned') || /(استقال|استقالوا|خرجوا|تركوا|استقالات|خروج)/.test(t);
      const field = resigned && !/(التحق|التحاق|تعيين|عينوا|بدا|بدأ)/.test(t) ? 'end' : 'start';
      f.push({ k: 'date', field, v: dr, l: (field === 'end' ? 'تاريخ الاستقالة ' : 'تاريخ الالتحاق ') + dr.label });
      if (field === 'end' && !f.some((x) => x.k === 'status')) f.push({ k: 'status', v: 'resigned', l: 'مستقيلون' });
      out.recognized++;
    }
    // نواقص
    const miss = [[/(بدون|بلا|ليس لديهم|مفيش|ناقص)\s*(مستندات|مستند|ملفات)|مستنداتهم ناقصه|مستندات ناقصه/, 'nodocs', 'مستندات ناقصة'], [/(بدون|بلا|مفيش)\s*(رقم تاميني|رقم التامين|رقم تامين)/, 'noins', 'بلا رقم تأميني'], [/(بدون|بلا|مفيش)\s*(رقم قومي)|بيانات ناقصه|بياناتهم ناقصه/, 'inc', 'بيانات ناقصة'], [/(المقبلين علي|يقتربون من|قاربوا)\s*(المعاش|سن المعاش|التقاعد)|قريبا علي المعاش/, 'retsoon', 'مقبلون على المعاش'], [/(بلغوا|وصلوا)\s*(سن)?\s*(المعاش|التقاعد)/, 'retnow', 'بلغوا سن المعاش'], [/(بدون|بلا)\s*(طلب خروج)/, 'noout', 'بلا طلب خروج'], [/(لم يقدم لهم|بدون|بلا)\s*(طلب التحاق|طلب دخول)/, 'latein', 'طلب التحاق لم يُقدَّم']];
    miss.forEach(([re, key, l]) => { if (re.test(t)) { f.push({ k: 'miss', v: key, l }); out.recognized++; } });
  }
  if (out.entity === 'car') {
    if (/(منتهي|منتهيه|انتهت)/.test(t)) { f.push({ k: 'carexp', v: 'expired', l: 'منتهية' }); out.recognized++; }
    else if (/(قريب|تنتهي|ستنتهي|خلال)/.test(t)) { const n = num(t.replace(/20\d\d/, '')); f.push({ k: 'carexp', v: n || 30, l: 'تنتهي خلال ' + (n || 30) + ' يومًا' }); out.recognized++; }
  }
  if (out.entity === 'req') {
    const st = [['معتمد', /معتمد|اعتمد/], ['مرفوض', /مرفوض|رفض/], ['قيد الانتظار', /انتظار|معلق|معلقه/]].find((x) => x[1].test(t));
    if (st) { f.push({ k: 'reqst', v: st[0], l: st[0] }); out.recognized++; }
  }
  out.E = E;
  return out;
}

/* ---------- التنفيذ ---------- */
const inRange = (v, r) => !!v && v >= r.from && v <= r.to;
function pass(e, f) {
  switch (f.k) {
    case 'status': return e.status === f.v;
    case 'company': return f.v.includes(e.cid);
    case 'job': return norm(e.job || '').includes(f.v);
    case 'wage': return test(f.v, +e.wage || 0);
    case 'age': { const a = ageOf(e); return a != null && test(f.v, a); }
    case 'gender': return genderOf(e) === f.v;
    case 'date': return inRange(e[f.field], f.v);
    case 'miss': return f.v === 'noins' ? !e.insno : !!(window.XF2 && XF2[f.v] ? XF2[f.v](e) : ALERT_F[f.v] && ALERT_F[f.v](e));
    default: return true;
  }
}
const daysTo = (d) => Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
const EMP_COLS = [{ k: 'name', l: 'الاسم' }, { k: 'company', l: 'الشركة' }, { k: 'job', l: 'الوظيفة' }, { k: 'st', l: 'الحالة' }, { k: 'wage', l: 'الأجر' }, { k: 'start', l: 'الالتحاق' }, { k: 'end', l: 'الاستقالة' }];
const empRow = (e) => ({ eid: e.id, name: e.name || '', company: cn(e.cid), job: e.job || '', st: e.status === 'active' ? 'مؤمن عليه' : (e.rtype || 'مستقيل'), wage: +e.wage || 0, start: e.start || '', end: e.end || '' });

export function run(p) {
  const A = window.a9; void A;
  let rows, columns, title;
  if (p.entity === 'emp') {
    const list = S.emps.filter((e) => p.filters.every((f) => pass(e, f)));
    rows = list.map(empRow); columns = EMP_COLS;
    title = 'موظفون' + (p.filters.length ? ' — ' + p.filters.map((f) => f.l).join(' • ') : '');
    const w = list.map((e) => +e.wage || 0), sum = w.reduce((a, b) => a + b, 0);
    const res = { rows, columns, title, count: list.length, sum, avg: w.length ? sum / w.length : 0, max: w.length ? Math.max(...w) : 0, min: w.length ? Math.min(...w) : 0, insurable: list.filter((e) => e.status === 'active').reduce((a, e) => a + clampW(e.wage), 0) };
    if (p.group) {
      const g = {};
      list.forEach((e) => { const k = p.group === 'comp' ? cn(e.cid) : p.group === 'job' ? (e.job || 'غير محدد') : p.group === 'gender' ? (genderOf(e) || 'غير محدد') : (e.status === 'active' ? 'مؤمن عليه' : 'مستقيل'); g[k] = (g[k] || 0) + 1; });
      res.groups = Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n }));
    }
    return res;
  }
  if (p.entity === 'comp') {
    rows = S.companies.map((c) => { const s = stats(c.id); return { name: c.name, no: c.no || '', act: s.act, res: s.res, total: s.t }; });
    return { rows, columns: [{ k: 'name', l: 'الشركة' }, { k: 'no', l: 'رقم المنشأة' }, { k: 'act', l: 'مؤمن عليهم' }, { k: 'res', l: 'مستقيلون' }, { k: 'total', l: 'الإجمالي الشهري' }], title: 'الشركات', count: rows.length };
  }
  if (p.entity === 'car') {
    const lim = p.filters.find((f) => f.k === 'carexp');
    const L = [['licExp', 'الترخيص'], ['insExp', 'التأمين'], ['inspExp', 'الفحص']];
    rows = [];
    (S.cars || []).forEach((c) => L.forEach(([k, l]) => { if (!c[k]) return; const d = daysTo(c[k]); if (!lim || (lim.v === 'expired' ? d < 0 : d <= lim.v)) rows.push({ name: c.plate || '', type: c.type || '', what: l, date: c[k], left: d }); }));
    rows.sort((a, b) => a.left - b.left);
    return { rows, columns: [{ k: 'name', l: 'اللوحة' }, { k: 'type', l: 'النوع' }, { k: 'what', l: 'المستند' }, { k: 'date', l: 'تاريخ الانتهاء' }, { k: 'left', l: 'الأيام المتبقية' }], title: 'مستندات السيارات' + (lim ? ' — ' + lim.l : ''), count: rows.length };
  }
  const st = p.filters.find((f) => f.k === 'reqst');
  const list = (window.Q ? Q() : S.reqs || []).filter((q) => !st || q.status === st.v);
  rows = list.map((q) => ({ name: q.name || '', job: q.job || '', hdate: q.hdate || '', status: q.status || '' }));
  return { rows, columns: [{ k: 'name', l: 'الاسم' }, { k: 'job', l: 'الوظيفة' }, { k: 'hdate', l: 'تاريخ التعيين' }, { k: 'status', l: 'الحالة' }], title: 'طلبات الدخول' + (st ? ' — ' + st.l : ''), count: rows.length };
}

/* سؤال كامل: يرجع null لو لم يفهم شيئًا ذا معنى؛ وإلا { text, report, parsed } */
export function ask(q, now) {
  const p = parse(q, now);
  const meaningful = p.filters.length > 0 || p.group || p.agg !== 'list' || p.entity !== 'emp';
  if (!meaningful || p.recognized < 2 && !p.filters.length) return null;
  if (p.entity === 'emp' && !p.filters.length && !p.group && p.agg === 'list') return null;
  // اسم موظف يحتوي كلمة وظيفة (مثل «أحمد المحاسب») ليس سؤالًا مركبًا: يترك للبحث القديم ما لم يوجد فعل/كيان/شرط آخر
  if (p.entity === 'emp' && !p.group && !p.hasVerb && !p.hasEntity && p.filters.every((f) => f.k === 'job')) return null;   // «اعرض موظف» بلا شروط: يترك للبحث القديم
  const r = run(p), n = (x) => fm(Math.round(x)), M = (x) => mny(Math.round(x));
  const want = p.entity === 'emp' ? 'موظف' : p.entity === 'comp' ? 'شركة' : p.entity === 'car' ? 'مستند' : 'طلب';
  const lines = ['فهمت سؤالك هكذا: ' + [p.E].concat(p.filters.map((f) => f.l)).join(' • ') + (p.group ? ' • موزَّعين حسب ' + ({ comp: 'الشركة', job: 'الوظيفة', gender: 'النوع', status: 'الحالة' }[p.group]) : '')];
  if (p.entity === 'emp' && p.agg === 'sum') lines.push('إجمالي الأجور: ' + M(r.sum) + ' (الأجر التأميني بعد الحد الأدنى/الأقصى للمؤمن عليهم: ' + M(r.insurable) + ') — عدد ' + n(r.count) + ' موظف');
  else if (p.entity === 'emp' && p.agg === 'avg') lines.push('متوسط الأجر: ' + M(r.avg) + ' (من ' + n(r.count) + ' موظف)');
  else if (p.entity === 'emp' && p.agg === 'max') lines.push('أعلى أجر: ' + M(r.max) + (r.rows.length ? ' — ' + r.rows.slice().sort((a, b) => b.wage - a.wage)[0].name : ''));
  else if (p.entity === 'emp' && p.agg === 'min') lines.push('أقل أجر: ' + M(r.min) + (r.rows.length ? ' — ' + r.rows.slice().sort((a, b) => a.wage - b.wage)[0].name : ''));
  else lines.push('العدد: ' + n(r.count) + ' ' + want + (r.count ? '' : ' (لا نتائج مطابقة)'));
  if (r.groups && r.groups.length) lines.push(r.groups.slice(0, 10).map((g) => '• ' + g.k + ': ' + n(g.n)).join('\n'));
  return { text: lines.join('\n'), report: { title: r.title, subtitle: 'السؤال: ' + String(q).trim(), sections: [{ columns: r.columns, rows: r.rows, groups: r.groups }] }, parsed: p, result: r };
}
