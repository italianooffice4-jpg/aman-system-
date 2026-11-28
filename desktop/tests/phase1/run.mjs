// تشغيل كل اختبارات المرحلة 1:  node tests/phase1/run.mjs
// المتطلبات (مرة واحدة، خارج المشروع أو --no-save):  npm i --no-save playwright esbuild  &&  npx playwright install chromium
import { build } from 'esbuild';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const runNode = (file) => new Promise(res => spawn(process.execPath, [file], { stdio: 'inherit', env: process.env }).on('exit', c => res(c || 0)));
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = +process.env.AMAN_TEST_PORT || 8765;
await build({ entryPoints: [path.join(HERE, 'entry.js')], bundle: true, format: 'iife', outfile: path.join(HERE, '.build', 'core-test.js'), logLevel: 'warning' });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(PORT);
let bad = 0;
for (const f of ['suite.mjs', 'vue-integration.mjs', 'forms.mjs']) {
  console.log('\n########', f);
  bad += (await runNode(path.join(HERE, f))) ? 1 : 0;
}
const py = spawnSync('python3', [path.join(HERE, 'lint_sfc.py'), ...fs.readdirSync(path.join(ROOT, 'ui', 'src')).filter(f => f.endsWith('.vue')).map(f => path.join(ROOT, 'ui', 'src', f))], { stdio: 'inherit' });
if (py.error) console.log('(تخطّيت فحص ملفات .vue: python3 غير متاح)'); else console.log('(فحص بديل للصياغة والمتغيرات فقط — لا يغني عن npm run ui:build)');
server.close();
process.exit(bad ? 1 : 0);
