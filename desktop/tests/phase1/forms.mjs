import { chromium, open, PORT, ROOT } from './lib.mjs';
import path from 'node:path';
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('  ✓',n)}else{fail++;console.log('  ✗',n,x!==undefined?JSON.stringify(x).slice(0,300):'')} };
const NOISE=/ERR_NAME_NOT_RESOLVED|404 \(File not found\)|ERR_FAILED|404 \(Not Found\)/;
const browser = await chromium.launch();
const newP = await open(browser, { core: false });
const oldP = await open(browser, { core: false, html: 'index.orig.html' });
const startNew = await newP.page.evaluate(() => ({ loaded: !!FSPEC, scripts: [...document.scripts].map(s => s.src).filter(s => /forms-data/.test(s)) }));
ok('عند البدء: بيانات الاستمارات غير محمّلة', !startNew.loaded && startNew.scripts.length === 0, startNew);
// بيانات مطابقة بالبايت
await newP.page.evaluate(() => formsLoad());
const [a, b] = await Promise.all([
  newP.page.evaluate(() => JSON.stringify([FSPEC, FIMG])),
  oldP.page.evaluate(() => JSON.stringify([FSPEC, FIMG]))
]);
ok('FSPEC و FIMG مطابقتان تمامًا للنسخة الأصلية v14', a === b && a.length > 400000, { len: a.length, same: a === b });
// صفحة الاستمارات: نفس المخرجات لعدة استمارات وحالات
await newP.page.reload({ waitUntil: 'load' }); await newP.page.waitForTimeout(300);
await newP.page.evaluate(() => nv('frm'));
const ph = await newP.page.evaluate(() => document.getElementById('view').textContent.trim());
ok('أول زيارة: رسالة «جارٍ التحميل» ثم الصفحة', /جارٍ تحميل الاستمارات/.test(ph), ph.slice(0, 60));
await newP.page.waitForFunction(() => !!FSPEC && !/جارٍ تحميل/.test(document.getElementById('view').textContent), null, { timeout: 5000 });
// نفس البيانات في الصفحتين (البيانات التجريبية تتولد عشوائيًا في كل جلسة)
const snap = await newP.page.evaluate(() => JSON.stringify(S));
await oldP.page.evaluate((j) => { S = JSON.parse(j); }, snap);
await newP.page.evaluate((j) => { S = JSON.parse(j); }, snap);
const grab = (p) => p.evaluate(async () => {
  const out = {};
  const forms = Object.keys(FSPEC);
  for (const f of forms) { FS.form = f; FS.emp = (S.emps[0] || {}).id; go('frm'); await new Promise(r => setTimeout(r, 30)); out[f] = document.getElementById('view').innerHTML.replace(/\s+/g, ' '); }
  return out;
});
await oldP.page.evaluate(() => nv('frm')); await oldP.page.waitForTimeout(300);
const [h1, h2] = [await grab(newP.page), await grab(oldP.page)];
const keys = Object.keys(h2);
const diffs = keys.filter(k => h1[k] !== h2[k]);
if (diffs.length) { const k = diffs[0]; let i = 0; while (h1[k][i] === h2[k][i]) i++; console.log('   أول اختلاف:', JSON.stringify(h1[k].slice(i - 60, i + 80)), '\n   مقابل:     ', JSON.stringify(h2[k].slice(i - 60, i + 80))); }
ok(`HTML صفحة الاستمارات مطابق للأصل لكل الاستمارات (${keys.length})`, diffs.length === 0 && keys.length >= 2, { diffs });
// frmFor من ملف موظف (المسار الوحيد من خارج الصفحة) في جلسة جديدة بدون تحميل مسبق
const p3 = await open(browser, { core: false });
await p3.page.evaluate(() => { frmFor(S.emps[0].id); });
await p3.page.waitForFunction(() => cur === 'frm' && !!FSPEC && !/جارٍ تحميل/.test(document.getElementById('view').textContent), null, { timeout: 5000 });
ok('frmFor() من ملف الموظف يفتح صفحة الاستمارة بعد التحميل الكسول', await p3.page.evaluate(() => FS.emp === S.emps[0].id));
// فشل التحميل: رسالة واضحة ولا انهيار
const p4 = await open(browser, { core: false });
await p4.page.route('**/forms-data.js', r => r.abort());
await p4.page.evaluate(() => nv('frm')); await p4.page.waitForTimeout(600);
ok('فشل تحميل الملف ⇒ رسالة خطأ وتبقى الصفحة حيّة', await p4.page.evaluate(() => /تعذر تحميل ملف الاستمارات/.test(document.getElementById('toast').textContent) && typeof go === 'function'));
await p4.page.unroute('**/forms-data.js');
await p4.page.evaluate(() => { nv('dash'); nv('frm'); }); await p4.page.waitForTimeout(600);
ok('إعادة المحاولة بعد الفشل تنجح', await p4.page.evaluate(() => !!FSPEC));
// تسخين وقت الخمول بعد الدخول
const p5 = await open(browser, { core: false });
await p5.page.waitForFunction(() => !!FSPEC, null, { timeout: 15000 }).then(() => ok('التحميل المسبق وقت الخمول يعمل (أول فتح فوري)', true)).catch(() => ok('التحميل المسبق وقت الخمول يعمل', false));
for (const x of [newP, oldP, p3, p4, p5]) { const e = x.errors.filter(e => !NOISE.test(e)); if (e.length) { fail++; console.log('  ✗ أخطاء JS', e); } }
// القياس: زمن تحميل index.html
const fs = await import('node:fs'); const fsm = fs;
const sizes = { old: fs.statSync(path.join(ROOT,'tests/phase1/fixtures/index.v14.html')).size, new: fs.statSync(path.join(ROOT,'index.html')).size };
async function measure(html, n = 7) {
  const ts = [];
  for (let i = 0; i < n; i++) {
    const c = await browser.newContext(); const p = await c.newPage();
    await p.route('**/index.orig.html', r => r.fulfill({ contentType: 'text/html', body: fsm.readFileSync(path.join(ROOT, 'tests/phase1/fixtures/index.v14.html'), 'utf8') }));
    await p.addInitScript(() => { localStorage.setItem('ins_users', JSON.stringify([{ u: 't', n: 'T', p: 'x', r: 'admin' }])); sessionStorage.setItem('ins_sess', 't'); });
    await p.goto(`http://localhost:${PORT}/` + html, { waitUntil: 'load' });
    ts.push(await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, js: performance.getEntriesByType('resource').filter(r => /\.js/.test(r.name)).length }; }));
    await c.close();
  }
  const med = k => ts.map(t => t[k]).sort((a, b) => a - b)[Math.floor(n / 2)];
  return { dcl: Math.round(med('dcl')), load: Math.round(med('load')) };
}
const mo = await measure('index.orig.html'), mn = await measure('index.html');
console.log('\nأحجام index.html (بايت):', sizes, '| التوفير:', Math.round((1 - sizes.new / sizes.old) * 100) + '%');
console.log('زمن DOMContentLoaded / load بالمللي ثانية (وسيط 7 تشغيلات، سيرفر محلي):', { قديم: mo, جديد: mn });
console.log(`\n=== ${pass} نجح / ${fail} فشل ===`);
await browser.close(); process.exit(fail ? 1 : 0);
