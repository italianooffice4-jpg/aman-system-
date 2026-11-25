import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export { chromium } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PORT = +process.env.AMAN_TEST_PORT || 8765;
export const CORE = fs.readFileSync(path.join(HERE, '.build', 'core-test.js'), 'utf8');
const V14 = path.join(HERE, 'fixtures', 'index.v14.html');
export const ROOT = path.resolve(HERE, '..', '..');
export async function open(browser, { html = 'index.html', core = true, noHost = false, prelude = null, session = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar-EG' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // نسخة v14 الأصلية (قبل التحميل الكسول) لمقارنة المخرجات؛ تُخدَّم من الجذر نفسه ليعمل مسار الملفات النسبية
  await page.route('**/index.orig.html', route => route.fulfill({ contentType: 'text/html', body: fs.readFileSync(V14, 'utf8') }));
  await page.route('**/index.html', async route => {
    const r = await route.fetch();
    let t = await r.text();
    if (core) t = t.replace('<script src="src/ui/aman-ui.js"></script>', (noHost ? '<script>window.__noHost=1</script>' : '') + '<script src="/__core.js"></script>\n<script src="src/ui/aman-ui.js"></script>');
    route.fulfill({ response: r, body: t });
  });
  await page.route('**/__core.js', route => route.fulfill({ contentType: 'text/javascript', body: CORE }));
  await page.addInitScript(({ session, prelude }) => {
    if (!sessionStorage.getItem('__seeded')) {
      sessionStorage.setItem('__seeded', '1');
      if (session) {
        localStorage.setItem('ins_users', JSON.stringify([{ u: 't', n: 'Tester', name: 'Tester', p: 'x', r: 'admin', role: 'admin' }]));
        sessionStorage.setItem('ins_sess', 't');
      }
      if (prelude) { try { (0, eval)(prelude); } catch (e) {} }
    }
  }, { session, prelude });
  await page.goto(`http://localhost:${PORT}/` + html, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
