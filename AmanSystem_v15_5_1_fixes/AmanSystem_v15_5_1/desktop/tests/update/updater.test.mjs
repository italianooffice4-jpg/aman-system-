// اختبار نظام التحديث end-to-end بدون إنترنت: make-release.mjs ← خادم GitHub مزيّف على localhost ← Updater
// التشغيل (من مجلد desktop):  node tests/update/updater.test.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import http from 'node:http'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Updater, cmpVer, extractTarGz, safeRel } = require('../../updater.js');
let ok = 0, bad = 0;
const chk = (n, c, x) => { if (c) { ok++; console.log('✔', n); } else { bad++; console.log('✘', n, x === undefined ? '' : x); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aupd-'));
const rm = (p) => fs.rmSync(p, { recursive: true, force: true });

// ---- مجلد "التطبيق المثبّت" (إصدار 15.2.0) ----
const mkApp = (dir, ver, extra) => {
  fs.mkdirSync(path.join(dir, 'src/ui'), { recursive: true }); fs.mkdirSync(path.join(dir, 'src/merge'), { recursive: true }); fs.mkdirSync(path.join(dir, 'src/vendor/tesseract'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>v' + ver + '</html>'); fs.writeFileSync(path.join(dir, 'src/ui/aman-ui.js'), '/*ui ' + ver + '*/'); fs.writeFileSync(path.join(dir, 'src/merge/a.js'), 'a' + ver);
  fs.writeFileSync(path.join(dir, 'src/vendor/tesseract/big.wasm'), 'OCR'); fs.writeFileSync(path.join(dir, 'main.js'), 'shell');
  fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ version: ver })); fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ amanShellApi: (extra && extra.shellApi) || 1 }));
};
const installed = path.join(tmp, 'installed'); mkApp(installed, '15.2.0');
const src = path.join(tmp, 'src153'); mkApp(src, '15.3.0');
const src2 = path.join(tmp, 'src160'); mkApp(src2, '16.0.0', { shellApi: 2 });
const mk = (app, ver, out, notes) => { const nf = path.join(tmp, 'n-' + ver + '.md'); fs.writeFileSync(nf, notes); execFileSync('node', ['scripts/make-release.mjs', '--version', ver, '--app', app, '--out', out, '--notes', nf], { stdio: 'pipe' }); };
const out153 = path.join(tmp, 'rel153'), out160 = path.join(tmp, 'rel160');
mk(src, '15.3.0', out153, 'المرحلة 4: ملاحظات'); mk(src2, '16.0.0', out160, 'يحتاج غلاف جديد');
const man = JSON.parse(fs.readFileSync(path.join(out153, 'update.json'), 'utf8'));
chk('make-release: update.json صحيح (sha256/حجم/ملاحظات/shellApi)', man.version === '15.3.0' && /^[0-9a-f]{64}$/.test(man.sha256) && man.size > 0 && man.notes.includes('المرحلة 4') && man.shellApi === 1, man);
chk('make-release: يستبعد محرك OCR', !require('zlib').gunzipSync(fs.readFileSync(path.join(out153, man.asset))).toString('latin1').includes('big.wasm'));

// ---- خادم GitHub مزيّف ----
let mode = { rel: out153, status: 200, tamper: false, noManifest: false, down: false };
const srv = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x');
  if (mode.down) { q.socket.destroy(); return; }
  if (u.pathname === '/repos/o/r/releases/latest') {
    if (mode.status !== 200) { r.statusCode = mode.status; return r.end('{}'); }
    const m = JSON.parse(fs.readFileSync(path.join(mode.rel, 'update.json'), 'utf8')); const base = 'http://localhost:' + srv.address().port + '/dl/';
    const assets = [{ name: m.asset, browser_download_url: base + m.asset, size: m.size }]; if (!mode.noManifest) assets.push({ name: 'update.json', browser_download_url: base + 'update.json' });
    r.setHeader('content-type', 'application/json'); return r.end(JSON.stringify({ tag_name: 'v' + m.version, body: 'body', html_url: 'http://rel', assets }));
  }
  if (u.pathname.startsWith('/dl/')) {
    let b = fs.readFileSync(path.join(mode.rel, path.basename(u.pathname)));
    if (mode.tamper && u.pathname.endsWith('.tar.gz')) { b = Buffer.from(b); b[b.length - 20] ^= 0xff; }
    r.setHeader('content-length', b.length); return r.end(b);
  }
  r.statusCode = 404; r.end();
});
await new Promise(r => srv.listen(0, r));
const API = 'http://localhost:' + srv.address().port;
const mkU = (name, o) => new Updater({ root: installed, dataDir: path.join(tmp, name), repo: 'o/r', api: API, shellApi: 1, ...o });

// ---- إصدارات ومسارات ----
chk('مقارنة الإصدارات', cmpVer('15.10.0', '15.9.9') === 1 && cmpVer('v15.2.0-phase3', '15.2.0') === 0 && cmpVer('15.2.0', '15.3.0') === -1);
chk('safeRel يرفض المسارات الخطرة', ['../x', '/etc/x', 'a/../../x', 'C:/x', 'a\\b', ''].every(x => safeRel(x) === null) && safeRel('src/a.js') === 'src/a.js');

// ---- فحص ----
let u = mkU('d1'); u.boot();
let c = await u.check();
chk('فحص: تحديث متاح 15.3.0 مع الملاحظات والحجم', c.status === 'available' && c.latest === '15.3.0' && c.notes.includes('المرحلة 4') && c.size > 0, c);
mode.status = 404; c = await mkU('d1').check(); chk('لا إصدارات بعد (404) = none', c.status === 'none', c);
mode.status = 403; c = await mkU('d1').check(); chk('حدّ GitHub (403) = رسالة مفهومة', c.status === 'error' && /حدّ/.test(c.message), c);
mode.status = 200; mode.noManifest = true; c = await mkU('d1').check(); chk('إصدار بلا update.json = خطأ مفهوم', c.status === 'error', c); mode.noManifest = false;
mode.down = true; c = await mkU('d1').check(); chk('انقطاع الإنترنت = خطأ بلا استثناء', c.status === 'error' && /تعذر الاتصال/.test(c.message), c); mode.down = false;
c = await mkU('d1', { repo: 'OWNER/REPO' }).check(); chk('المستودع غير مضبوط = norepo', c.status === 'norepo');
mode.rel = out160; c = await mkU('d1').check(); chk('إصدار يحتاج غلافًا أحدث = needs-shell ولا يُنزَّل', c.status === 'needs-shell' && c.releaseUrl === 'http://rel', c); mode.rel = out153;
const same = mkU('d1b'); same.root = src; c = await same.check(); chk('نفس الإصدار = uptodate', c.status === 'uptodate', c); same.root = installed;

// ---- سلامة: sha256 ----
mode.tamper = true; u = mkU('d2'); u.boot(); await u.check();
let err = ''; try { await u.stage(); } catch (e) { err = e.message; }
chk('ملف تالف/معدّل = يُرفض بخطأ sha256 ولا يُنزَّل شيء', /sha256|السلامة/.test(err) && !fs.existsSync(path.join(tmp, 'd2', 'staged')) && !fs.existsSync(path.join(tmp, 'd2', 'current')), err);
mode.tamper = false;

// ---- تنزيل + تفعيل ----
u = mkU('d3'); u.boot(); await u.check(); const prog = []; u.onProgress = (p) => prog.push(p.pct);
const st = await u.stage();
chk('stage: تنزيل وفك وتحقق (مع تقدّم)', st.version === '15.3.0' && fs.existsSync(path.join(tmp, 'd3/staged/index.html')) && prog.length > 0 && prog.at(-1) === 100, prog);
chk('قبل التفعيل: الواجهة ما زالت 15.2.0', u.version() === '15.2.0' && fs.readFileSync(u.resolve('index.html'), 'utf8').includes('v15.2.0'));
u.activate();
chk('activate: الإصدار 15.3.0 والملفات من التحديث', u.version() === '15.3.0' && fs.readFileSync(u.resolve('index.html'), 'utf8').includes('v15.3.0') && fs.readFileSync(u.resolve('src/ui/aman-ui.js'), 'utf8').includes('15.3.0'));
chk('الملف غير الموجود في التحديث (محرك OCR) يُقرأ من المثبَّت', u.resolve('src/vendor/tesseract/big.wasm') === path.join(installed, 'src/vendor/tesseract/big.wasm'));
chk('ملفات الغلاف (main.js) لا تُقرأ من التحديث أبدًا', u.resolve('main.js') === path.join(installed, 'main.js'));
chk('resolve يرفض الخروج من المجلد', u.resolve('../outside') === null && u.resolve('src/../../x') === null);
chk('الحالة: pending بعد التفعيل', u.state().pending === true);
u.markOk();
chk('markOk: لا pending + رسالة «تم التحديث» + حذف النسخة السابقة', !u.state().pending && u.info().justUpdated === '15.3.0' && u.info().justNotes.includes('المرحلة 4') && !fs.existsSync(path.join(tmp, 'd3/prev')));
u.ackJustUpdated(); chk('ackJustUpdated', u.info().justUpdated === '');
const u3b = mkU('d3'); u3b.boot(); chk('إعادة تشغيل بعد نجاح: يبقى 15.3.0', u3b.version() === '15.3.0');
c = await u3b.check(); chk('بعد التحديث: uptodate', c.status === 'uptodate', c);

// ---- رجوع تلقائي ----
u = mkU('d4'); u.boot(); await u.check(); await u.stage(); u.activate();
const u4b = mkU('d4'); u4b.boot();    // أُعيد تشغيل البرنامج دون markOk
chk('تحديث لم يتأكد نجاحه + إعادة تشغيل = رجوع تلقائي للنسخة المثبَّتة', u4b.version() === '15.2.0' && u4b.info().rolledBack && u4b.info().rolledBack.from === '15.3.0' && u4b.info().bad.includes('15.3.0'), u4b.info());
c = await u4b.check(); chk('الإصدار الفاشل يُعلَّم bad عند الفحص', c.status === 'available' && c.bad === true, c);
// رجوع إلى نسخة محدّثة سابقة (وليس المثبَّتة)
u = mkU('d5'); u.boot(); await u.check(); await u.stage(); u.activate(); u.markOk();
fs.cpSync(path.join(tmp, 'rel160'), path.join(tmp, 'rel1531'), { recursive: true });
const man2 = { ...man, version: '15.3.1' }; // نسخة ثانية فعلية
const src3 = path.join(tmp, 'src1531'); mkApp(src3, '15.3.1'); mk(src3, '15.3.1', path.join(tmp, 'rel1531b'), 'x'); mode.rel = path.join(tmp, 'rel1531b');
u = mkU('d5'); u.boot(); await u.check(); await u.stage(); u.activate();
const u5b = mkU('d5'); u5b.boot();
chk('الرجوع يعيد آخر نسخة محدَّثة ناجحة (15.3.0) لا المثبَّتة', u5b.version() === '15.3.0', u5b.info()); mode.rel = out153;

// ---- التطبيق عند التشغيل القادم ----
u = mkU('d6'); u.boot(); await u.check(); await u.stage();
chk('stage فقط: لا تغيير في الإصدار الحالي', u.version() === '15.2.0' && u.info().staged === '15.3.0');
const u6b = mkU('d6'); u6b.boot();
chk('التشغيل القادم يفعّل المنزَّل تلقائيًا', u6b.version() === '15.3.0' && u6b.state().pending === true);

// ---- تثبيت نسخة جديدة من البرنامج أحدث من التحديث المنزَّل ----
const newInst = path.join(tmp, 'installed2'); mkApp(newInst, '15.4.0');
const u7 = new Updater({ root: newInst, dataDir: path.join(tmp, 'd5'), repo: 'o/r', api: API }); u7.boot();
chk('المثبَّت الجديد أحدث ⇒ يُهمَل التحديث المنزَّل القديم ويُحذف', u7.version() === '15.4.0' && !fs.existsSync(path.join(tmp, 'd5', 'current')));

// ---- أمان tar ----
const tarOf = (entries, type) => { const parts = []; for (const [name, data] of entries) { const b = Buffer.alloc(512); b.write(name, 0, 100); b.write('0000644\0', 100); b.write(data.length.toString(8).padStart(11, '0') + '\0', 124); b.write('        ', 148); b.write(type || '0', 156); b.write('ustar\0', 257); let s = 0; for (let i = 0; i < 512; i++) s += b[i]; b.write(s.toString(8).padStart(6, '0') + '\0 ', 148); parts.push(b, Buffer.from(data), Buffer.alloc((512 - (data.length % 512)) % 512)); } parts.push(Buffer.alloc(1024)); return zlib.gzipSync(Buffer.concat(parts)); };
const tryX = (gz) => { const d = path.join(tmp, 'x' + Math.random()); try { extractTarGz(gz, d); return 'ok'; } catch (e) { return e.message; } finally { rm(d); } };
chk('tar: مسار ../ مرفوض', /غير آمن/.test(tryX(tarOf([['../evil.js', 'x']]))));
chk('tar: مسار مطلق مرفوض', /غير آمن/.test(tryX(tarOf([['/etc/x', 'x']]))));
chk('tar: ملف خارج المسموح (main.js) مرفوض', /غير مسموح/.test(tryX(tarOf([['main.js', 'x']]))));
chk('tar: رابط رمزي مرفوض', /غير مسموح/.test(tryX(tarOf([['src/a', 'x']], '2'))));
chk('tar: ملف مسموح يمر', tryX(tarOf([['src/a.js', 'x'], ['index.html', 'y']])) === 'ok');
chk('tar: أرشيف تالف مرفوض', /checksum|تالف|incorrect|unexpected/i.test(tryX(Buffer.from(zlib.gzipSync(Buffer.from('garbage'.repeat(200)))))));
const dd = path.join(tmp, 'x-atomic'); try { extractTarGz(tarOf([['src/ok.js', 'x'], ['../bad', 'x']]), dd); } catch (e) { /* متوقع */ }
chk('أرشيف فيه ملف سيئ = لا يُكتب أي ملف منه (ذرّي)', !fs.existsSync(dd));

srv.close(); rm(tmp);
console.log(`\n${ok} نجح • ${bad} فشل`); process.exit(bad ? 1 : 0);
