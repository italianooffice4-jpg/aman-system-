import { chromium, open, PORT, ROOT } from './lib.mjs';
import path from 'node:path';
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('  ✓',n)}else{fail++;console.log('  ✗',n,x!==undefined?JSON.stringify(x).slice(0,300):'')} };
const NOISE=/ERR_NAME_NOT_RESOLVED|404 \((File not found|Not Found)\)|ERR_FAILED/;
const browser = await chromium.launch();
const run = async (core) => {
  const { page, errors } = await open(browser, { core });
  await page.evaluate(() => nv('emp')); await page.waitForSelector('#vue-emp .p-datatable', { timeout: 5000 });
  const rowsTxt = () => page.evaluate(() => document.querySelector('#vue-emp').textContent);
  const nRows = () => page.evaluate(() => document.querySelectorAll('#vue-emp .p-datatable-tbody > tr').length);
  const before = await nRows();
  await page.evaluate(() => { S.emps[0].name = 'اسم-اختبار-تفاعلي'; save(); });
  await page.waitForTimeout(300);
  const seen = (await rowsTxt()).includes('اسم-اختبار-تفاعلي');
  // فلتر متقدم: الأجر الأعلى فقط
  let advRows = null, restored = null;
  if (core) {
    await page.evaluate(() => { const mx = Math.max(...S.emps.map(e => +e.wage || 0)); AmanCore.search.setAdv({ wmin: mx }); AmanUI.refresh(); });
    await page.waitForTimeout(250); advRows = await nRows();
    const expect = await page.evaluate(() => S.emps.filter(e => (+e.wage || 0) >= Math.max(...S.emps.map(x => +x.wage || 0))).length);
    await page.evaluate(() => { AmanCore.search.clearAdv(); AmanUI.refresh(); }); await page.waitForTimeout(250); restored = await nRows();
    return { before, seen, advRows, expect, restored, errors: errors.filter(e => !NOISE.test(e)) };
  }
  return { before, seen, errors: errors.filter(e => !NOISE.test(e)) };
};
const ctl = await run(false), r = await run(true);
ok('الشاهد (بدون الإضافة): تعديل S + save() لا يحدّث جدول Vue تلقائيًا', ctl.seen === false, ctl);
ok('مع الإضافة: نفس التعديل يظهر في جدول Vue تلقائيًا (S تفاعلية)', r.seen === true, r);
ok('الفلتر المتقدم يقلّص صفوف جدول Vue الحقيقي', r.advRows === r.expect && r.advRows < r.before, r);
ok('مسح الفلتر يعيد الصفوف', r.restored === r.before, r);
ok('بدون أخطاء JS', r.errors.length === 0 && ctl.errors.length === 0, [r.errors, ctl.errors]);
console.log(`\n=== ${pass} نجح / ${fail} فشل ===`);
await browser.close(); process.exit(fail ? 1 : 0);
