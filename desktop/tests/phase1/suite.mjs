import { chromium, open, PORT, ROOT } from './lib.mjs';
import path from 'node:path';
let pass = 0, fail = 0; const failed = [];
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; failed.push(name); console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const sleep = (p, ms) => p.waitForTimeout(ms);
const NOISE = /ERR_NAME_NOT_RESOLVED|404 \((File not found|Not Found)\)/;
const clean = (errs) => errs.filter(e => !NOISE.test(e));
const browser = await chromium.launch();

/* ---------- 1) store: S reactive ---------- */
console.log('\n[1] S reactive (store)');
{
  const { page, errors } = await open(browser);
  const r = await page.evaluate(async () => {
    const C = window.AmanCore; let n = 0; C.store.onData(() => n++);
    const v0 = C.store.dataVersion();
    S.cfg.emp = S.cfg.emp; save(); save(); save();
    await new Promise(r => setTimeout(r, 120));
    const v1 = C.store.dataVersion();
    localStorage.setItem('other_key', '1'); await new Promise(r => setTimeout(r, 80));
    return { v0, v1, n, v2: C.store.dataVersion() };
  });
  ok('3 saves متتالية = إعلان واحد (تجميع)', r.v1 === r.v0 + 1 && r.n === 1, r);
  ok('مفتاح آخر لا يطلق إعلانًا', r.v2 === r.v1, r);
  ok('بدون أخطاء JS', clean(errors).length === 0, clean(errors));
  await page.close();
}

/* ---------- 2) prefs: ثيمات/ألوان/خط/خلفية/حجم/قوائم ---------- */
console.log('\n[15/16/17] prefs & themes');
{
  const { page, errors } = await open(browser);
  const css = () => page.evaluate(() => document.getElementById('aman-ui-prefs')?.textContent || '');
  ok('الافتراضي: لا CSS مضاف (الشكل الأصلي كما هو)', (await css()) === '', await css());
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  const pri0 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pri').trim());
  await page.evaluate(() => AmanCore.prefs.setTheme('royal'));
  const a = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return { pri: s.getPropertyValue('--pri').trim(), pri2: s.getPropertyValue('--pri2').trim(), p500: s.getPropertyValue('--p-primary-500').trim(), side: s.getPropertyValue('--side').trim() }; });
  ok('الثيم الملكي يغيّر --pri (الأصل في الفاتح #6366f1)', pri0 === '#6366f1' && a.pri === '#2b4fc4', { pri0, a });
  const dk = await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; const v = getComputedStyle(document.documentElement).getPropertyValue('--pri').trim(); document.documentElement.dataset.theme = 'light'; return v; });
  ok('في الداكن يُستخدم نفس اللون مفتَّحًا (لا يعود للبنفسجي القديم #7c3aed)', dk.includes('2b4fc4') && !dk.includes('7c3aed'), dk);
  ok('--p-primary-500 (PrimeVue) يتبع اللون', a.p500 === '#2b4fc4', a);
  ok('الشريط الجانبي لا يُمَسّ (يبقى أبيض في الفاتح كما صممه v9)', a.side === '#ffffff', a);
  const glow = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pri-glow').trim());
  ok('توهج الزر/القائمة النشطة (--pri-glow) يتبع الثيم', glow.includes('2b4fc4'), glow);
  const btnBg = await page.evaluate(() => { const b = document.createElement('button'); b.className = 'btn'; document.body.appendChild(b); const v = getComputedStyle(b).backgroundImage; b.remove(); return v; });
  ok('أزرار .btn تتبع اللون الجديد', /43, 79, 196/.test(btnBg), btnBg);
  await page.evaluate(() => { go('dash'); });
  await sleep(page, 600);
  const hero = await page.evaluate(() => { const h = document.querySelector('.hero'); return h ? getComputedStyle(h).backgroundImage : null; });
  ok('بانر الصفحة الرئيسية يتبع الثيم', hero === null || (/43, 79, 196/.test(hero) && !/113, 75, 103/.test(hero)), hero);
  await page.evaluate(() => AmanCore.prefs.setTheme('emerald'));
  ok('الثيم الزمردي', (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pri').trim())) === '#0b8a63');
  await page.evaluate(() => AmanCore.prefs.setColors('#aa3366', '#115577'));
  const c = await page.evaluate(() => ({ t: AmanCore.prefs.getPrefs().theme, pri: getComputedStyle(document.documentElement).getPropertyValue('--pri').trim() }));
  ok('ألوان مخصصة ⇒ theme=custom', c.t === 'custom' && c.pri === '#aa3366', c);
  await page.evaluate(() => AmanCore.prefs.setColors('#2b4fc4', '#0b8aa6'));
  ok('نفس ألوان ثيم جاهز ⇒ يعود اسم الثيم', (await page.evaluate(() => AmanCore.prefs.getPrefs().theme)) === 'royal');
  // خط وحجم وخلفية
  await page.evaluate(() => AmanCore.prefs.setPrefs({ font: 'plex', size: 125, bg: 'warm' }));
  const f = await page.evaluate(() => { const b = getComputedStyle(document.body); return { ff: b.fontFamily, fs: b.fontSize, rem: getComputedStyle(document.documentElement).fontSize }; });
  ok('الخط يتغير', /IBM Plex/.test(f.ff), f);
  ok('حجم الخط 125%: body=17.5px و rem=20px', f.fs === '17.5px' && f.rem === '20px', f);
  const bg = await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; const l = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(); document.documentElement.dataset.theme = 'dark'; const d = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(); return { l, d }; });
  ok('الخلفية الدافئة تعمل في الفاتح والداكن بقيمتين مختلفتين', bg.l === '#f7f3ec' && bg.d === '#16120e', bg);
  // مدخلات غير صالحة لا تكسر شيئًا ولا تُحقن في CSS
  await page.evaluate(() => AmanCore.prefs.setPrefs({ primary: 'red;}body{display:none', hideNav: ["x'] {}body{display:none;/*", 'cars'], font: 'nope', size: 7 }));
  const bad = await page.evaluate(() => ({ p: AmanCore.prefs.getPrefs(), disp: getComputedStyle(document.body).display }));
  ok('قيمة لون غير صالحة تُهمَل', /^#[0-9a-f]{6}$/.test(bad.p.primary), bad.p.primary);
  ok('معرّف قائمة خبيث لا يدخل CSS، والسليم يبقى', bad.p.hideNav.length === 1 && bad.p.hideNav[0] === 'cars' && bad.disp !== 'none', bad.p.hideNav);
  ok('خط/حجم غير معروف يرجع للافتراضي', bad.p.font === 'cairo' && bad.p.size === 100, bad.p);
  // إخفاء القوائم
  await page.evaluate(() => { AmanCore.prefs.resetAppearance(); AmanCore.prefs.setNavHidden('cars', true); AmanCore.prefs.setNavHidden('dash', true); AmanCore.prefs.setNavHidden('set', true); go('dash'); });
  await sleep(page, 200);
  const nav = await page.evaluate(() => { const vis = id => { const b = document.querySelector(`#nav .ni[onclick="nv('${id}')"]`); return b ? getComputedStyle(b).display !== 'none' : null; }; return { cars: vis('cars'), dash: vis('dash'), set: vis('set'), emp: vis('emp') }; });
  ok('السيارات مخفية، والرئيسية والإعدادات لا يمكن إخفاؤهما', nav.cars === false && nav.dash === true && nav.set === true && nav.emp === true, nav);
  // إخفاء مجموعة كاملة يخفي عنوانها
  const grp = await page.evaluate(() => { const g = NAV.find(g => g[1].every(x => !['dash', 'set'].includes(x[0])) && g[1].length); return g ? { name: g[0], ids: g[1].map(x => x[0]) } : null; });
  if (grp) {
    await page.evaluate((ids) => { ids.forEach(id => AmanCore.prefs.setNavHidden(id, true)); go('dash'); }, grp.ids);
    await sleep(page, 200);
    const h6 = await page.evaluate((name) => { const h = [...document.querySelectorAll('#nav h6')].find(x => x.textContent.trim() === name); return h ? getComputedStyle(h).display : 'missing'; }, grp.name);
    ok('مجموعة كل عناصرها مخفية يختفي عنوانها', h6 === 'none', { grp, h6 });
  }
  ok('بدون أخطاء JS', clean(errors).length === 0, clean(errors));
  await page.close();
}

/* ---------- 3) persistence + تطبيق مبكر ---------- */
console.log('\n[persist] التفضيلات بعد إعادة التحميل');
{
  const { page, errors } = await open(browser);
  await page.evaluate(() => { AmanCore.prefs.setTheme('emerald'); AmanCore.prefs.setPrefs({ size: 112, hideNav: ['cars'], start: 'comp' }); });
  await page.reload({ waitUntil: 'load' }); await sleep(page, 500);
  const r = await page.evaluate(() => { save(); return { pri: getComputedStyle(document.documentElement).getPropertyValue('--p-primary-500').trim(), fs: getComputedStyle(document.body).fontSize, cur, stored: Object.keys(localStorage).filter(k => k.startsWith('ins_')) }; });
  ok('الثيم والحجم يُطبَّقان بعد إعادة التشغيل', r.pri === '#0b8a63' && r.fs === '15.68px', r);
  ok('شاشة البداية المختارة (الشركات) تفتح بدل الرئيسية — بدون وميض', r.cur === 'comp', r.cur);
  const same = await page.evaluate(() => { const a = localStorage.getItem('ins_sys_v1'); AmanCore.prefs.setTheme('royal'); AmanCore.prefs.setNavHidden('cars', true); AmanCore.prefs.saveView('emp', 'x', {}); AmanCore.prefs.pushHistory('اختبار'); return a === localStorage.getItem('ins_sys_v1') && a.length > 100; });
  ok('تغيير كل التفضيلات لا يمسّ ins_sys_v1 إطلاقًا (بايت ببايت)', same);
  ok('المفاتيح: ins_ui_prefs هو الوحيد المضاف', r.stored.includes('ins_ui_prefs') && r.stored.includes('ins_sys_v1'), r.stored);
  await page.evaluate(() => AmanCore.prefs.setPrefs({ start: 'last' }));
  await page.evaluate(() => nv('req')); await sleep(page, 150);
  await page.reload({ waitUntil: 'load' }); await sleep(page, 500);
  ok('«آخر صفحة زرتها» تفتح على الطلبات', (await page.evaluate(() => cur)) === 'req');
  await page.evaluate(() => AmanCore.prefs.setPrefs({ start: 'cars', hideNav: ['cars'] }));
  await page.reload({ waitUntil: 'load' }); await sleep(page, 500);
  ok('شاشة بداية مخفية من القوائم ⇒ ترجع للرئيسية بأمان', (await page.evaluate(() => cur)) === 'dash');
  await page.evaluate(() => localStorage.setItem('ins_ui_prefs', '{bad json'));
  await page.reload({ waitUntil: 'load' }); await sleep(page, 400);
  ok('ملف تفضيلات تالف لا يكسر البرنامج', (await page.evaluate(() => cur)) === 'dash' && clean(errors).filter(e => /pageerror/.test(e)).length === 0, clean(errors));
  await page.close();
}

/* ---------- 4) notify / toast / bell ---------- */
console.log('\n[51/52] Toast والجرس');
{
  const { page, errors } = await open(browser);
  const r = await page.evaluate(async () => {
    const N = AmanCore.notify; N._reset();
    toast('تم الحفظ', 1); toast('لم يتم الحفظ: خطأ في الرقم'); toast('اكتب اسم المستند أولاً');
    const t = N.getToasts().map(x => x.type);
    for (let i = 0; i < 3; i++) toast('تم الحفظ', 1);
    const dup = N.getToasts().find(x => x.msg === 'تم الحفظ');
    for (let i = 0; i < 8; i++) toast('رسالة ' + i, 1);
    const act = N.getToasts().length;
    const hist = N.getHistory();
    N.markAllRead(); const unreadAfterRead = N.unreadCount();
    const aid = N.notify('تم الحذف', 'info', { action: { label: 'تراجع', fn: () => (window.__undone = 1) } });
    N.runAction(aid);
    const afterAct = { undone: window.__undone, still: !!N.getToasts().find(x => x.id === aid) };
    const w = (() => { alert('رسالة alert'); return N.getHistory()[0]; })();
    return { t, dupCount: dup && dup.count, act, histLen: hist.length, unread: unreadAfterRead, afterAct, alertMsg: w.msg, alertType: w.type };
  });
  ok('تصنيف: نجاح / خطأ / تنبيه', JSON.stringify(r.t) === '["success","error","warn"]', r.t);
  ok('تكرار نفس الرسالة يزيد العدّاد ولا يكدّس (×4)', r.dupCount === 4, r.dupCount);
  ok('الحد الأقصى 4 رسائل على الشاشة', r.act === 4, r.act);
  ok('السجل محدود ويحفظ الكل', r.histLen > 4 && r.histLen <= 40, r.histLen);
  ok('«تم القراءة» تصفّر غير المقروء', r.unread === 0, r.unread);
  ok('زر الإجراء (تراجع) يعمل ثم تُغلق الرسالة', r.afterAct.undone === 1 && !r.afterAct.still, r.afterAct);
  ok('alert() يتحول لإشعار', r.alertMsg === 'رسالة alert' && r.alertType === 'warn', r);
  // انتهاء المدة + pause/resume
  const timing = await page.evaluate(async () => {
    const N = AmanCore.notify; N._reset();
    const id = N.notify('قصيرة', 'success', { duration: 300 });
    const id2 = N.notify('متوقفة', 'success', { duration: 300 }); N.pause(id2);
    await new Promise(r => setTimeout(r, 700));
    const a = { gone: !N.getToasts().find(x => x.id === id), paused: !!N.getToasts().find(x => x.id === id2) };
    N.resume(id2); await new Promise(r => setTimeout(r, 1700));
    a.goneAfterResume = !N.getToasts().find(x => x.id === id2); return a;
  });
  ok('تختفي تلقائيًا، وتتوقف عند pause وتكمل عند resume', timing.gone && timing.paused && timing.goneAfterResume, timing);
  // الجرس والبحث السريع يوجهان للواجهة الجديدة
  await page.evaluate(() => { document.getElementById('bell').click(); gs(); });
  const calls = await page.evaluate(() => window.__calls);
  ok('زر الجرس و gs() (Ctrl+K) يفتحان الواجهة الجديدة', calls.bell === 1 && calls.search === 1, calls);
  const modalOn = await page.evaluate(() => document.getElementById('modal').classList.contains('on'));
  ok('النافذة القديمة لا تُفتح معها', !modalOn);
  // شارة الجرس تتحدث مع تغيّر البيانات (كانت تتحدث عند التنقل فقط)
  const badge = await page.evaluate(async () => {
    const dot = () => (document.querySelector('#bell .dot') || {}).textContent || '0';
    const before = dot();
    S.emps.forEach(e => { e.insno = ''; }); save();
    await new Promise(r => setTimeout(r, 200));
    return { before, after: dot(), real: alerts().length };
  });
  ok('شارة الجرس تتحدث فورًا بعد الحفظ', String(badge.after) === String(badge.real) && badge.after !== badge.before, badge);
  ok('بدون أخطاء JS', clean(errors).length === 0, clean(errors));
  await page.close();
  // بدون host (الواجهة العامة لم تُركَّب): السلوك القديم كما هو
  const p2 = await open(browser, { noHost: true });
  await p2.page.evaluate(() => { toast('رسالة قديمة', 1); bellM(); });
  const old = await p2.page.evaluate(() => ({ t: document.getElementById('toast').textContent, on: document.getElementById('toast').classList.contains('on') || document.getElementById('toast').className, modal: document.getElementById('modal').classList.contains('on') }));
  ok('بدون host: toast القديم والجرس القديم يعملان', old.t === 'رسالة قديمة' && old.modal === true, old);
  await p2.page.close();
}

/* ---------- 5) search ---------- */
console.log('\n[40/46/47/48] البحث');
{
  const { page, errors } = await open(browser);
  const r = await page.evaluate(() => {
    const SR = AmanCore.search, P = AmanCore.prefs;
    const first = S.emps[0].name;
    const tok = first.split(' ')[0];
    const names = SR.suggestNames(tok.replace(/أ/g, 'ا'), 8);
    const all = SR.suggestNames('', 8);
    // تطبيع: إكمال بنصف الاسم، بحروف مختلفة (أ/ا، ة/ه)
    S.emps[1].name = 'أحمد عبد الرحمة'; save();
    const n2 = SR.suggestNames('احمد عبد الرحمه', 5);
    P.clearHistory(); P.pushHistory('أحمد'); P.pushHistory('أحمد'); P.pushHistory('س'); P.pushHistory('منى');
    const hist = P.getHistory();
    const sg = SR.suggestions('', 8), sg2 = SR.suggestions('اح', 8);
    return { first, names, all, n2, hist, sg: sg.map(x => x.kind + ':' + x.text), sg2: sg2.map(x => x.kind + ':' + x.text) };
  });
  ok('اقتراح أسماء بالكتابة', r.names.includes(r.first), r);
  ok('نص فارغ لا يقترح أسماء', r.all.length === 0);
  ok('التطبيع: أحمد=احمد و ة=ه', r.n2.includes('أحمد عبد الرحمة'), r.n2);
  ok('تاريخ البحث: بدون تكرار، ويتجاهل أقل من حرفين', JSON.stringify(r.hist) === '["منى","أحمد"]', r.hist);
  ok('حقل فارغ ⇒ يعرض تاريخ البحث', r.sg.every(x => x.startsWith('hist:')) && r.sg.length === 2, r.sg);
  ok('اقتراح عمليات بحث سابقة مطابقة مع الأسماء', r.sg2.some(x => x.startsWith('hist:')) && r.sg2.some(x => x.startsWith('name:')), r.sg2);
  // الفلاتر المركبة
  const f = await page.evaluate(() => {
    const SR = AmanCore.search; SR.clearAdv();
    const total = EL().length;
    const wages = S.emps.map(e => +e.wage || 0).sort((a, b) => a - b), mid = wages[Math.floor(wages.length / 2)];
    SR.setAdv({ wmin: mid });
    const hi = EL().length, expectHi = S.emps.filter(e => (+e.wage || 0) >= mid).length;
    SR.setAdv({ wmax: mid });
    const band = EL().length, expectBand = S.emps.filter(e => (+e.wage || 0) === mid).length;
    SR.clearAdv();
    const job = S.emps.find(e => e.job)?.job || '';
    SR.setAdv({ job });
    const byJob = EL().length, expectJob = S.emps.filter(e => e.job === job).length;
    SR.clearAdv();
    SR.setAdv({ docs: 'has' }); const has = EL().length; SR.setAdv({ docs: 'none' }); const none = EL().length; SR.clearAdv();
    const starts = S.emps.map(e => e.start).filter(Boolean).sort(); const d = starts[Math.floor(starts.length / 2)];
    SR.setAdv({ dfrom: d }); const df = EL().length, expDf = S.emps.filter(e => e.start && e.start >= d).length; SR.clearAdv();
    // الفلاتر القديمة تتجمع مع المتقدمة
    const c1 = S.companies[0].id; flt.c = c1; const base = EL().length; SR.setAdv({ wmin: mid }); const comb = EL().length, expComb = S.emps.filter(e => e.cid == c1 && (+e.wage || 0) >= mid).length; flt.c = ''; SR.clearAdv();
    return { total, hi, expectHi, band, expectBand, byJob, expectJob, has, none, empsN: S.emps.length, df, expDf, comb, expComb, base, count0: SR.advCount(), jobs: SR.distinctJobs().length };
  });
  ok('نطاق الأجر (من)', f.hi === f.expectHi && f.hi < f.total, f);
  ok('نطاق الأجر (من+إلى)', f.band === f.expectBand, f);
  ok('فلتر القسم/الوظيفة', f.byJob === f.expectJob && f.byJob > 0, f);
  ok('المستندات: لديه/بدون = الإجمالي', f.has + f.none === f.empsN, f);
  ok('تاريخ الالتحاق من', f.df === f.expDf, f);
  ok('الفلاتر المتقدمة تتجمع مع شركة/حالة القديمة', f.comb === f.expComb, f);
  ok('مسح الفلاتر يعيد العدد الكامل', f.count0 === 0, f);
  // نفس القائمة تصل للطباعة والتعيين الجماعي (empTable)
  const pr = await page.evaluate(() => { const SR = AmanCore.search; SR.setAdv({ wmin: Math.max(...S.emps.map(e => +e.wage || 0)) }); const n = EL().length; const html = empTable(EL()); SR.clearAdv(); return { n, rows: (html.match(/<tr/g) || []).length }; });
  ok('الطباعة/الجدول القديم يحترم الفلاتر المتقدمة (نفس EL)', pr.rows <= pr.n + 2 && pr.n >= 1, pr);
  ok('بدون أخطاء JS', clean(errors).length === 0, clean(errors));
  await page.close();
}

/* ---------- 6) shortcuts ---------- */
console.log('\n[84] الاختصارات');
{
  const { page, errors } = await open(browser);
  const key = (code, extra = {}) => page.evaluate(({ code, extra }) => { const e = new KeyboardEvent('keydown', { code, key: extra.key || '', bubbles: true, cancelable: true, ...extra }); (extra.target ? document.querySelector(extra.target) : document.body).dispatchEvent(e); return e.defaultPrevented; }, { code, extra });
  await key('KeyG'); await key('KeyE'); await sleep(page, 200);
  ok('G ثم E ⇒ الموظفون', (await page.evaluate(() => cur)) === 'emp');
  await key('KeyG'); await key('KeyC'); await sleep(page, 200);
  ok('G ثم C ⇒ الشركات (يعمل بأي لغة لوحة مفاتيح عبر e.code)', (await page.evaluate(() => cur)) === 'comp');
  await key('KeyN'); await sleep(page, 150);
  ok('N في الشركات ⇒ نافذة شركة جديدة', await page.evaluate(() => document.getElementById('modal').classList.contains('on') && /شركة جديدة/.test(document.getElementById('modal').textContent)));
  await page.evaluate(() => { document.getElementById('f_name').value = 'شركة الاختبار'; document.getElementById('f_no').value = '999'; });
  const before = await page.evaluate(() => S.companies.length);
  await key('KeyS', { ctrlKey: true, key: 's', target: '#f_name' }); await sleep(page, 300);
  const after = await page.evaluate(() => S.companies.length);
  ok('Ctrl+S داخل النافذة يحفظ (حتى والتركيز داخل حقل)', after === before + 1, { before, after });
  await page.evaluate(() => closeM());
  // تجاهل الكتابة داخل الحقول
  await page.evaluate(() => nv('comp')); await sleep(page, 100);
  await page.evaluate(() => { const i = document.createElement('input'); i.id = '__t'; document.body.appendChild(i); i.focus(); });
  await key('KeyG', { target: '#__t' }); await key('KeyE', { target: '#__t' }); await sleep(page, 150);
  ok('لا تعمل الاختصارات أثناء الكتابة في حقل', (await page.evaluate(() => cur)) === 'comp');
  await page.evaluate(() => document.getElementById('__t').remove());
  await key('Slash', { key: '/' }); await sleep(page, 80);
  await page.evaluate(() => nv('emp')); await sleep(page, 700);
  const focused = await (async () => { await key('Slash', { key: '/' }); return page.evaluate(() => { const a = document.activeElement; return a && a.tagName === 'INPUT' ? a.placeholder : null; }); })();
  ok('/ يركّز خانة البحث في الصفحة', !!focused && /بحث/.test(focused), focused);
  await page.evaluate(() => document.activeElement.blur());
  await key('Slash', { key: '?', shiftKey: true });
  ok('? يفتح قائمة الاختصارات', (await page.evaluate(() => window.__calls.help)) === 1);
  await key('KeyB', { altKey: true });
  ok('Alt+B يفتح الجرس', (await page.evaluate(() => window.__calls.bell)) === 1);
  const th1 = await page.evaluate(() => document.documentElement.dataset.theme);
  await key('KeyT', { altKey: true }); await sleep(page, 50);
  const th2 = await page.evaluate(() => ({ t: document.documentElement.dataset.theme, s: localStorage.getItem('ins_theme') }));
  ok('Alt+T يبدّل فاتح/داكن ويحفظ الاختيار (22)', th2.t !== th1 && th2.s === th2.t, { th1, th2 });
  await key('KeyG'); await key('KeyZ');
  ok('حرف غير معروف بعد G لا يفعل شيئًا ولا يعلّق', (await page.evaluate(() => cur)) === 'emp');
  ok('بدون أخطاء JS', clean(errors).length === 0, clean(errors));
  await page.close();
}

/* ---------- 7) view modes + instant search on legacy pages ---------- */
console.log('\n[20/46] طرق العرض والبحث الفوري في الصفحات القديمة');
{
  const { page, errors } = await open(browser);
  await page.evaluate(() => { nv('req'); setqm('list'); nv('req'); nv('cars'); setcm('table'); nv('cars'); });
  await sleep(page, 200);
  const pv = await page.evaluate(() => AmanCore.prefs.getPrefs().view);
  ok('طريقة عرض الطلبات والسيارات تُحفظ بعد التنقل', pv.req === 'list' && pv.cars === 'table', pv);
  await page.reload({ waitUntil: 'load' }); await sleep(page, 400);
  const mv = await page.evaluate(() => ({ qm, cm }));
  ok('تُطبَّق عند إعادة التشغيل', mv.qm === 'list' && mv.cm === 'table', mv);
  // بحث فوري في طلبات الدخول (كان ينتظر Enter/الخروج من الحقل ويفقد التركيز)
  await page.evaluate(() => { S.reqs = S.reqs || []; ['منى سعيد', 'خالد نور', 'سارة فؤاد'].forEach((n, i) => (S.reqs.push({ id: 'rq' + i, name: n, status: QS[0], cid: S.companies[0].id, code: '' }))); save(); nv('req'); });
  await sleep(page, 200);
  const inp = page.locator('#view input[placeholder^="بحث بالاسم"]').first();
  await inp.click(); await inp.pressSequentially('خالد', { delay: 40 });
  await sleep(page, 700);
  const st = await page.evaluate(() => ({ q: qf.q, focus: document.activeElement && document.activeElement.placeholder, val: document.activeElement && document.activeElement.value, visible: document.getElementById('view').textContent.includes('خالد نور'), other: document.getElementById('view').textContent.includes('منى سعيد') }));
  ok('البحث يُطبَّق أثناء الكتابة بدون Enter', st.q === 'خالد' && st.visible && !st.other, st);
  ok('التركيز والنص يبقيان بعد إعادة رسم الصفحة', /بحث بالاسم/.test(st.focus || '') && st.val === 'خالد', st);
  ok('بدون أخطاء JS', clean(errors).length === 0, clean(errors));
  await page.close();
}

/* ---------- 8) settings mount ---------- */
console.log('\n[14] الإعدادات: حاوية البطاقات الجديدة');
{
  const { page, errors } = await open(browser, { prelude: null });
  await page.evaluate(() => { window.__mounted = 0; AmanUI.mountSettings = (el) => { window.__mounted++; el.setAttribute('data-ok', '1'); }; nv('set'); });
  await sleep(page, 200);
  const r = await page.evaluate(() => { const el = document.getElementById('vue-set'); return { mounted: window.__mounted, ok: el && el.getAttribute('data-ok'), parentCls: el && el.parentElement.className, spans: el && el.style.gridColumn }; });
  ok('حاوية vue-set داخل شبكة الإعدادات وتُركَّب مرة واحدة', r.mounted === 1 && r.ok === '1' && /grid/.test(r.parentCls) && /1/.test(r.spans), r);
  ok('بطاقات الإعدادات القديمة سليمة', await page.evaluate(() => document.getElementById('view').textContent.includes('معدلات الاشتراك')));
  await page.close();
  const p2 = await open(browser);   // الحزمة القديمة بدون mountSettings
  await p2.page.evaluate(() => nv('set')); await sleep(p2.page, 150);
  ok('بدون mountSettings: الإعدادات القديمة بلا حاوية زائدة', await p2.page.evaluate(() => !document.getElementById('vue-set') && document.getElementById('view').textContent.includes('معدلات الاشتراك')));
  await p2.page.close();
}

console.log(`\n=== ${pass} نجح / ${fail} فشل ===`); if (fail) console.log(failed);
await browser.close();
process.exit(fail ? 1 : 0);
