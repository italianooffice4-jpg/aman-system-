// غلاف سطح المكتب (Electron) لنظام Aman — يوفّر الواجهة window.desk التي تتوقعها الصفحة.
const { app, BrowserWindow, protocol, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');
const { Library } = require('./library');
const { Updater } = require('./updater');
const { DataStore } = require('./datastore');
const SW = require('./scanwatch');

const ROOT = app.getAppPath();
const SCHEME = 'app';
const ORIGIN = `${SCHEME}://aman/`;

// بروتوكول محلي ثابت: يجعل التخزين (localStorage / IndexedDB) والـ OCR يعملان بنفس الأصل دائماً
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.map': 'application/json', '.md': 'text/plain; charset=utf-8'
};

let win = null;
let UPD = null;   // نظام التحديث (انظر updater.js) — يُنشأ في app.whenReady

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 650,
    title: 'Aman System', backgroundColor: '#12101a',
    icon: path.join(ROOT, 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(ROOT, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false }
  });
  Menu.setApplicationMenu(null);
  win.maximize();
  win.loadURL(ORIGIN + 'index.html');

  // اختصارات: F12 أدوات المطوّر، Ctrl+R إعادة تحميل
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F12' || (i.control && i.shift && i.key.toLowerCase() === 'i')) win.webContents.toggleDevTools();
    if (i.control && !i.shift && i.key.toLowerCase() === 'r') win.webContents.reload();
  });

  // الروابط الخارجية تُفتح بالمتصفح، وبقية النوافذ (معاينة/طباعة) داخل البرنامج
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  initUpdater();
  protocol.handle(SCHEME, (req) => {
    try {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (p === '/' || p === '') p = '/index.html';
      const rel = path.posix.normalize(p).replace(/^\/+/, '');
      if (rel.startsWith('..')) return new Response('forbidden', { status: 403 });
      // الواجهة (index.html + src/**) تُقرأ من التحديث المنزَّل إن وُجد، وإلا من الملفات المثبّتة
      const file = (UPD && UPD.resolve(rel)) || path.normalize(path.join(ROOT, rel));
      if (!file.startsWith(ROOT) && !(UPD && file.startsWith(UPD.dir))) return new Response('forbidden', { status: 403 });
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('not found', { status: 404 });
      const buf = fs.readFileSync(file);
      return new Response(buf, { headers: { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch (e) { return new Response('error: ' + e.message, { status: 500 }); }
  });
  await firstRunLibrary();
  await openDS();
  createWindow();
  scheduleDbBackups();
  try { const wd = (readCfg().scan || {}).watchDir; if (wd) startScanWatch(wd); } catch (e) { /* لا شيء */ }
  scheduleUpdateChecks();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---------- أدوات ----------
const toDataUrl = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;
const mimeOf = (n) => /\.pdf$/i.test(n) ? 'application/pdf' : /\.png$/i.test(n) ? 'image/png' : 'image/jpeg';
const tmpDir = () => { const d = path.join(os.tmpdir(), 'aman-system'); fs.mkdirSync(d, { recursive: true }); return d; };

// ---------- refocus: إصلاح فقدان التركيز بعد confirm()/اختيار الملفات ----------
ipcMain.handle('desk:refocus', () => {
  if (!win) return;
  try { win.blur(); win.focus(); win.webContents.focus(); } catch (e) {}
});

// ---------- الطباعة (تحفظ الطابعة والإعدادات ولا تسأل كل مرة) ----------
const jsToast = (msg) => { try { if (win) win.webContents.executeJavaScript(`typeof toast==='function'&&toast(${JSON.stringify(msg)},1)`); } catch (e) {} };

ipcMain.handle('desk:printHtml', async (_e, html, opts = {}) => {
  const f = path.join(tmpDir(), 'print-' + Date.now() + '.html');
  fs.writeFileSync(f, html, 'utf8');
  const pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await pw.loadFile(f);
    await new Promise(r => setTimeout(r, 400)); // وقت لتحميل الصور والخطوط
    const cfg = readCfg(), pc = cfg.print || {};
    const base = { printBackground: true, margins: { marginType: 'none' } };
    let o;
    if (pc.ask) {
      o = { ...base, silent: false, pageSize: pc.paper || 'A4', duplexMode: opts.duplex ? 'longEdge' : 'simplex' };
    } else {
      const list = await pw.webContents.getPrintersAsync();
      let pr = list.find(p => p.name === pc.printer) || list.find(p => p.isDefault) || list[0];
      if (!pr) return { ok: false, err: 'لا توجد طابعة معرّفة على الجهاز' };
      const dm = pc.duplex === 'always' ? 'longEdge' : pc.duplex === 'never' ? 'simplex' : (opts.duplex ? 'longEdge' : 'simplex');
      o = { ...base, silent: true, deviceName: pr.name, pageSize: pc.paper || 'A4', color: pc.color !== 'bw', duplexMode: dm };
      if (!pc.printer || pc.printer !== pr.name) { writeCfg({ ...cfg, print: { ...pc, printer: pr.name } }); jsToast('الطباعة على: ' + (pr.displayName || pr.name) + ' — تُغيَّر من الإعدادات'); }
    }
    return await new Promise((resolve) => {
      pw.webContents.print(o, (ok, reason) => resolve(ok ? { ok: true } : { ok: false, err: reason || 'failed' }));
    });
  } catch (e) { return { ok: false, err: String(e.message || e) }; }
  finally { try { pw.close(); } catch (e) {} setTimeout(() => { try { fs.unlinkSync(f); } catch (e) {} }, 60000); }
});

// المرحلة 6 (76): تصدير PDF مباشر بدون نافذة الطباعة. يحتاج مثبّتًا مبنيًا من هذا الإصدار؛ الواجهة تعود لنافذة الطباعة لو لم يوجد desk.pdf.
ipcMain.handle('desk:pdf', async (_e, html, opts = {}) => {
  const f = path.join(tmpDir(), 'pdf-' + Date.now() + '.html');
  fs.writeFileSync(f, html, 'utf8');
  const pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await pw.loadFile(f);
    await new Promise(r => setTimeout(r, 500)); // وقت لتحميل الصور والخطوط
    const buf = await pw.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });   // حجم الورق والهوامش من @page داخل المستند
    const base = String(opts.filename || 'تقرير').replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'تقرير';
    const r = await dialog.showSaveDialog(win, { title: 'حفظ PDF', defaultPath: path.join(app.getPath('documents'), base + '.pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return { ok: false, cancel: true };
    fs.writeFileSync(r.filePath, buf);
    try { shell.showItemInFolder(r.filePath); } catch (e) {}
    return { ok: true, path: r.filePath };
  } catch (e) { return { ok: false, err: String(e.message || e) }; }
  finally { try { pw.close(); } catch (e) {} setTimeout(() => { try { fs.unlinkSync(f); } catch (e) {} }, 60000); }
});

ipcMain.handle('desk:printers', async () => {
  try { const l = await (win || BrowserWindow.getAllWindows()[0]).webContents.getPrintersAsync(); return l.map(p => ({ name: p.name, label: p.displayName || p.name, isDefault: !!p.isDefault })); }
  catch (e) { return []; }
});
ipcMain.handle('desk:cfgGet', () => { const c = readCfg(); return { print: c.print || {}, scan: c.scan || {} }; });
ipcMain.handle('desk:cfgSet', (_e, patch = {}) => {
  const c = readCfg();
  for (const k of ['print', 'scan']) if (patch[k]) c[k] = { ...(c[k] || {}), ...patch[k] };
  writeCfg(c);
  return { ok: true };
});

// ---------- فتح مستند بالبرنامج الافتراضي ----------
ipcMain.handle('desk:openDoc', async (_e, name, dataUrl) => {
  try {
    const safe = String(name || 'document').replace(/[\\/:*?"<>|]/g, '_');
    const f = path.join(tmpDir(), Date.now() + '-' + safe);
    fs.writeFileSync(f, Buffer.from(String(dataUrl).split(',')[1] || '', 'base64'));
    const err = await shell.openPath(f);
    return err ? { ok: false, err } : { ok: true };
  } catch (e) { return { ok: false, err: String(e.message || e) }; }
});

// ---------- آخر ملف ممسوح من مجلد ----------
ipcMain.handle('desk:latestScan', async (_e, dir) => {
  try {
    if (!dir || !fs.existsSync(dir)) {
      const def = path.join(app.getPath('documents'), 'Scanned Documents');
      const r = await dialog.showOpenDialog(win, {
        title: 'اختر مجلد المسح الضوئي', properties: ['openDirectory'],
        defaultPath: fs.existsSync(def) ? def : app.getPath('documents')
      });
      if (r.canceled || !r.filePaths[0]) return { cancel: true };
      dir = r.filePaths[0];
    }
    const files = fs.readdirSync(dir).filter(n => /\.(pdf|jpe?g|png)$/i.test(n))
      .map(n => ({ n, m: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.m - a.m);
    if (!files.length) return { err: 'لا توجد ملفات (PDF/صور) في المجلد: ' + dir };
    const top = files[0];
    return { dir, name: top.n, mtime: top.m, data: toDataUrl(fs.readFileSync(path.join(dir, top.n)), mimeOf(top.n)) };
  } catch (e) { return { err: String(e.message || e) }; }
});

// ---------- المسح الضوئي (Windows WIA عبر PowerShell، بدون الشاشات القديمة) ----------
const SCRIPT = () => path.join(ROOT, 'scripts', 'scan.ps1');
let psChild = null;                       // عملية PowerShell الجارية (للإلغاء)
const scanLog = () => path.join(app.getPath('userData'), 'scan.log');
const logScan = (m) => { try { fs.appendFileSync(scanLog(), new Date().toISOString() + ' ' + m + '\n'); } catch (e) { /* لا شيء */ } };
// <runProc>
// تشغيل عملية خارجية بحيث يرجع الوعد دائمًا: لا ننتظر العمليات الفرعية التي ترث الأنابيب (تعريفات HP تفعل ذلك)،
// والمهلة تقتل شجرة العملية كلها، و stdin مغلق حتى لا ينتظر PowerShell مدخلات.
const killTree = (c) => {
  try {
    if (!c) return;
    if (process.platform === 'win32' && c.pid) execFile('taskkill', ['/PID', String(c.pid), '/T', '/F'], { windowsHide: true }, () => {});
    else c.kill();
  } catch (e) { /* لا شيء */ }
};
const runProc = (bin, argv, timeout) => new Promise((resolve) => {
  const t0 = Date.now();
  let out = '', errText = '', done = false, timedOut = false, code = null, child = null, tm = null, grace = null;
  const clean = (t) => String(t || '').replace(/^\uFEFF/, '').trim();
  const finish = () => {
    if (done) return; done = true; clearTimeout(tm); clearTimeout(grace);
    if (psChild === child) psChild = null;
    const err = timedOut ? new Error('timeout') : (code === 0 || code === null ? null : new Error('exit code ' + code));
    logScan('ps exit pid=' + (child && child.pid) + ' code=' + code + ' timedOut=' + timedOut + ' ms=' + (Date.now() - t0));
    resolve({ err, timedOut, ms: Date.now() - t0, out: clean(out), errText: clean(errText) });
  };
  try { child = spawn(bin, argv, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { errText = String((e && e.message) || e); return finish(); }
  psChild = child;
  logScan('ps spawn pid=' + child.pid);
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d) => { if (out.length < 4e6) out += d; });
  child.stderr.on('data', (d) => { if (errText.length < 1e6) errText += d; });
  child.on('error', (e) => { errText += String((e && e.message) || e); finish(); });
  child.on('exit', (c) => { code = c; grace = setTimeout(finish, 800); if (grace.unref) grace.unref(); });   // نمهل الأنابيب 0.8 ثانية لتفرغ ثم نكمل
  child.on('close', finish);
  tm = setTimeout(() => { timedOut = true; killTree(child); const g = setTimeout(finish, 1500); if (g.unref) g.unref(); }, timeout);
});
// </runProc>
const runPS = (args, timeout) => runProc('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-File', SCRIPT(), ...args], timeout);
async function listScanners() {
  if (process.platform !== 'win32') return [];
  const r = await runPS(['-Mode', 'list'], 20000);
  try { const j = JSON.parse(r.out || '[]'); return Array.isArray(j) ? j : [j]; } catch (e) { return []; }
}
ipcMain.handle('desk:scanners', () => listScanners());

// قفل المسح: عملية واحدة فقط، وتتحرر دائمًا في finally (حتى مع الخطأ/المهلة/الإلغاء) — لا يبقى «جارٍ مسح آخر» للأبد
let scanning = 0, scanCancelled = false;
ipcMain.handle('desk:scanCancel', () => {
  scanCancelled = true;
  killTree(psChild);
  logScan('cancel requested by user');
  return { ok: true, wasBusy: !!scanning };
});
ipcMain.handle('desk:scan', async (_e, opts = {}) => {
  if (process.platform !== 'win32') return { err: 'المسح الضوئي المباشر يعمل على Windows فقط' };
  logScan('scan request adf=' + !!opts.adf + ' legacy=' + !!opts.legacy + ' lockAge=' + (scanning ? Date.now() - scanning : 0) + ' child=' + !!psChild);
  if (scanning && psChild && Date.now() - scanning < 6 * 60 * 1000) return { err: 'يوجد مسح جارٍ الآن. انتظر انتهاءه أو اضغط «إلغاء المسح السابق».', busy: true };
  if (scanning) { logScan('stale scan lock released'); killTree(psChild); psChild = null; }   // قفل قديم بلا عملية شغالة: نتجاوزه بدل أن يعلق المسح للأبد
  const myLock = scanning = Date.now(); scanCancelled = false;
  let out = '';
  try {
    let cfg = readCfg(), sc = cfg.scan || {};
    let list = [], dev = sc.deviceId ? { id: sc.deviceId, name: sc.deviceName || '' } : null;   // جهاز محفوظ: لا حاجة لعملية PowerShell إضافية للسرد
    if (!dev) {
      list = await listScanners();
      if (!list.length) return { err: 'لم يتم العثور على ماسح ضوئي متصل. تأكد من تشغيله وتعريفه.' };
    }
    if (!dev) {
      if (list.length === 1) dev = list[0];
      else {
        const i = dialog.showMessageBoxSync(win, { type: 'question', title: 'Aman System', message: 'اختر الماسح الضوئي (مرة واحدة فقط، ويمكن تغييره من الإعدادات)', buttons: [...list.map(s => s.name), 'إلغاء'], cancelId: list.length, defaultId: 0 });
        if (i === list.length) return { cancel: true };
        dev = list[i];
      }
      sc = { ...sc, deviceId: dev.id, deviceName: dev.name };
      cfg = { ...cfg, scan: sc }; writeCfg(cfg);
    }
    const dpi = [100, 150, 200, 300, 400, 600].includes(+sc.dpi) ? +sc.dpi : 200;
    const intent = sc.color === 'gray' ? 2 : sc.color === 'bw' ? 4 : 1;
    // legacy: نافذة الماسح الخاصة بالتعريف (أكثر ثباتًا مع بعض أجهزة HP) — تُطلب صراحةً أو من الإعدادات (scan.mode = 'dialog')
    const legacy = opts.legacy === true || sc.mode === 'dialog';
    const timeout = legacy ? 5 * 60 * 1000 : (opts.adf ? 4 * 60 * 1000 : 90 * 1000);
    out = fs.mkdtempSync(path.join(tmpDir(), 'scan-'));
    logScan('start dev=' + dev.name + ' adf=' + !!opts.adf + ' dpi=' + dpi + ' legacy=' + legacy + ' timeout=' + timeout / 1000 + 's');
    const r = await runPS(['-Mode', 'scan', '-Adf', opts.adf ? '1' : '0', '-OutDir', out, '-DeviceId', dev.id, '-Dpi', String(dpi), '-Intent', String(intent), '-Legacy', legacy ? '1' : '0', '-Log', scanLog()], timeout);
    logScan('end ms=' + r.ms + ' timedOut=' + r.timedOut + ' out=' + r.out.slice(0, 120) + ' err=' + r.errText.slice(0, 200));
    if (scanCancelled) return { cancel: true };
    if (/^CANCEL/m.test(r.out)) return { cancel: true };
    const files = fs.readdirSync(out).filter(n => /\.jpg$/i.test(n)).sort();
    if (!files.length) {
      if (r.timedOut) return { err: 'انتهت مهلة المسح المباشر (' + Math.round(timeout / 1000) + ' ثانية) دون أن يُرجع الجهاز صورة.', timeout: true, legacy };
      let msg = r.errText || r.out || (r.err && r.err.message) || '';
      if (/NO_PAPER_IN_FEEDER/.test(msg)) msg = 'لا توجد أوراق في التغذية التلقائية';
      else if (/NO_SCANNER|0x80210015/i.test(msg) || !msg) msg = 'لم يتم العثور على ماسح ضوئي متصل. تأكد من تشغيله وتعريفه.';
      return { err: msg.slice(0, 300), legacy };
    }
    const pages = files.map(n => toDataUrl(fs.readFileSync(path.join(out, n)), 'image/jpeg'));
    return { pages, data: pages[0] }; // data للتوافق مع الكود القديم
  } catch (e) {
    logScan('exception ' + (e && e.message));
    return { err: 'تعذر المسح: ' + String((e && e.message) || e).slice(0, 200) };
  } finally {
    if (scanning === myLock) scanning = 0;
    logScan('scan finished');
    if (out) { try { fs.rmSync(out, { recursive: true, force: true }); } catch (e) { /* لا شيء */ } }
  }
});

// ---------- (66) مراقبة مجلد الماسح ----------
let scanWatcher = null, scanWatchDir = '';
function stopScanWatch() { try { if (scanWatcher) scanWatcher.close(); } catch (e) { /* لا شيء */ } scanWatcher = null; scanWatchDir = ''; }
function startScanWatch(dir) {
  stopScanWatch();
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return { ok: false, err: 'المجلد غير موجود' };
  const w = SW.startWatch(dir, (f) => { try { if (win && !win.isDestroyed()) win.webContents.send('desk:scanFile', f); } catch (e) { /* لا شيء */ } });
  if (w.error) return { ok: false, err: w.error };
  scanWatcher = w; scanWatchDir = dir; logScan('watch start ' + dir);
  return { ok: true, dir };
}
ipcMain.handle('desk:scanWatchState', () => ({ dir: scanWatchDir, on: !!scanWatcher, saved: ((readCfg().scan || {}).watchDir) || '' }));
ipcMain.handle('desk:scanWatchChoose', async () => {
  const def = path.join(app.getPath('documents'), 'Scanned Documents');
  const r = await dialog.showOpenDialog(win, { title: 'اختر المجلد الذي يحفظ فيه الماسح (HP Scan وغيره) ملفاته', properties: ['openDirectory'], defaultPath: fs.existsSync(def) ? def : app.getPath('documents') });
  if (r.canceled || !r.filePaths[0]) return { cancel: true };
  const res = startScanWatch(r.filePaths[0]);
  if (res.ok) { const c = readCfg(); writeCfg({ ...c, scan: { ...(c.scan || {}), watchDir: r.filePaths[0] } }); }
  return res;
});
ipcMain.handle('desk:scanWatchStop', () => { stopScanWatch(); const c = readCfg(); writeCfg({ ...c, scan: { ...(c.scan || {}), watchDir: '' } }); return { ok: true }; });
ipcMain.handle('desk:scanWatchRead', (_e, name) => SW.readIncoming(scanWatchDir, name));
app.on('will-quit', () => { killTree(psChild); stopScanWatch(); try { if (DS) { DS.flush(); DS.close(); } } catch (e) { /* لا شيء */ } });

// ---------- الذكاء الاصطناعي (OpenAI / Claude / Ollama) ----------
ipcMain.handle('desk:ai', async (_e, o = {}) => {
  const { prov, url, key, model, system, messages = [] } = o;
  try {
    let r, j;
    if (prov === 'claude') {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key || '', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 1500, system, messages })
      });
      j = await r.json();
      if (!r.ok) return { err: (j.error && j.error.message) || ('HTTP ' + r.status) };
      return { text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n') };
    }
    if (prov === 'ollama') {
      const base = String(url || 'http://localhost:11434').replace(/\/+$/, '');
      r = await fetch(base + '/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: system }, ...messages] })
      });
      j = await r.json();
      if (!r.ok) return { err: j.error || ('HTTP ' + r.status) };
      return { text: (j.message && j.message.content) || '' };
    }
    r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (key || '') },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages] })
    });
    j = await r.json();
    if (!r.ok) return { err: (j.error && j.error.message) || ('HTTP ' + r.status) };
    return { text: (j.choices && j.choices[0] && j.choices[0].message.content) || '' };
  } catch (e) { return { err: String(e.message || e) }; }
});


// ======================================================================
// مكتبة المستندات + نسخة البيانات الاحتياطية
// ======================================================================
const cfgFile = () => path.join(app.getPath('userData'), 'aman-config.json');
const readCfg = () => { try { return JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); } catch (e) { return {}; } };
const writeCfg = (c) => { try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(c)); } catch (e) {} };
const defaultLibDir = () => path.join(app.getPath('documents'), 'Aman Library');
let LIB = null;
function lib() {
  if (LIB) return LIB;
  const dir = readCfg().libraryDir || defaultLibDir();
  try { LIB = new Library(dir); }
  catch (e) { LIB = new Library(defaultLibDir()); }
  return LIB;
}

// أول تشغيل: اسأل عن مكان المكتبة (أو استخدم الافتراضي)
async function firstRunLibrary() {
  const c = readCfg();
  if (c.libraryDir) return;
  const r = dialog.showMessageBoxSync({
    type: 'question', title: 'Aman System', buttons: ['اختيار مجلد المكتبة', 'استخدام المكان الافتراضي'], defaultId: 0, cancelId: 1,
    message: 'أين تريد حفظ مستندات الموظفين (مكتبة الملفات)؟',
    detail: 'سيُنشأ داخل المجلد: مجلد لكل شركة ثم موظف ثم نوع المستند، ومعها نسخة احتياطية تلقائية للبيانات.\nالمكان الافتراضي: ' + defaultLibDir() + '\nيمكنك تغييره لاحقاً من الإعدادات.'
  });
  let dir = defaultLibDir();
  if (r === 0) {
    const p = dialog.showOpenDialogSync({ title: 'اختر مجلد المكتبة', properties: ['openDirectory', 'createDirectory'], defaultPath: app.getPath('documents') });
    if (p && p[0]) dir = p[0];
  }
  writeCfg({ ...c, libraryDir: dir });
}

ipcMain.handle('desk:libInfo', () => ({ on: true, dir: lib().dir }));
ipcMain.handle('desk:libStats', () => { try { return { ok: true, dir: lib().dir, ...lib().stats() }; } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.handle('desk:libSave', (_e, o) => { try { return lib().save(o); } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.handle('desk:libGet', (_e, id) => { try { return lib().get(id); } catch (e) { return null; } });
ipcMain.handle('desk:libDelete', (_e, id) => { try { return lib().remove(id); } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.handle('desk:libOpenFolder', () => shell.openPath(lib().dir));

// تغيير مكان المكتبة (يُنسخ المحتوى الحالي للمكان الجديد، والقديم يبقى كما هو)
ipcMain.handle('desk:libChoose', async () => {
  const p = await dialog.showOpenDialog(win, { title: 'اختر مجلد المكتبة الجديد', properties: ['openDirectory', 'createDirectory'], defaultPath: lib().dir });
  if (p.canceled || !p.filePaths[0]) return { cancel: true };
  const nd = p.filePaths[0], old = lib().dir;
  if (path.resolve(nd) === path.resolve(old)) return { ok: true, dir: old, same: true };
  try {
    const nl = new Library(nd);
    let copied = false;
    if (fs.existsSync(path.join(old, 'المستندات'))) {
      const ans = dialog.showMessageBoxSync(win, { type: 'question', buttons: ['نسخ الملفات الحالية للمكان الجديد', 'عدم النسخ'], defaultId: 0, cancelId: 1, message: 'هل تريد نسخ مستنداتك الحالية إلى المجلد الجديد؟', detail: 'المجلد القديم لن يُحذف.' });
      if (ans === 0) {
        fs.cpSync(path.join(old, 'المستندات'), path.join(nd, 'المستندات'), { recursive: true, force: false, errorOnExist: false });
        const d = lib().readData(); if (d) nl.writeData(d);
        nl.rebuild(); copied = true;
      }
    }
    LIB = nl; nl.rebuild(); await openDS();
    writeCfg({ ...readCfg(), libraryDir: nd });
    return { ok: true, dir: nd, copied };
  } catch (e) { return { err: String(e.message || e) }; }
});

// نسخة البيانات
ipcMain.handle('desk:libSaveData', (_e, json) => { try { return lib().writeData(String(json)); } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.handle('desk:libLoadData', () => lib().readData());
ipcMain.handle('desk:libSnapshot', () => { try { return { ok: true, path: lib().snapshotNow() }; } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.on('desk:loadDataSync', (e) => {
  let raw = null; try { raw = lib().readData(); } catch (x) { raw = null; }
  // المرحلة 7: لو ملف النسخة مفقود أو تالف نرجع للقاعدة (SQLite) بدلًا منه
  let ok = false; try { const o = JSON.parse(raw); ok = !!(o && o.ls && o.ls.ins_sys_v1); } catch (x) { ok = false; }
  if (!ok && DS) { try { const S = DS.loadS(); if (S) raw = JSON.stringify({ v: 2, t: +DS.getMeta('savedAt') || Date.now(), ls: { ...DS.loadKv(), ins_sys_v1: JSON.stringify(S) }, from: 'sqlite' }); } catch (x) { /* لا شيء */ } }
  e.returnValue = raw;
});


// ======================================================================
// المرحلة 7 — قاعدة SQLite (datastore.js): نسخة دائمة موثّقة + نسخ احتياطي مجدول + تصدير/استيراد + بحث + تدقيق المستندات.
// localStorage وملف aman-data.json يبقيان كما هما (لا يُحذف شيء)؛ فشل القاعدة لا يوقف البرنامج.
// ======================================================================
let DS = null, PENDING = null;
async function openDS() {
  try { if (DS) { try { DS.flush(); DS.close(); } catch (e) { /* لا شيء */ } DS = null; } DS = await DataStore.open(lib().meta, { log: (m) => console.log('[db] ' + m) }); if (DS) console.log('[db] engine=' + DS.engine.name); else console.warn('[db] لا يوجد محرك SQLite — يعمل البرنامج بالنسخ الاحتياطي JSON فقط'); }
  catch (e) { console.error('[db] open failed: ' + e.message); DS = null; }
}
function scheduleDbBackups() {
  const run = () => { try { if (DS && DS.backupDue()) DS.backup('تلقائي'); } catch (e) { console.error('[db] backup failed: ' + e.message); } };
  setTimeout(run, 25000); setInterval(run, 10 * 60 * 1000);
}
const noDb = { ok: false, err: 'قاعدة البيانات غير متاحة في هذا التثبيت (محرك SQLite غير محمّل)' };
const dbw = (fn) => async (_e, ...a) => { if (!DS) return noDb; try { return await fn(...a); } catch (e) { return { ok: false, err: String(e.message || e) }; } };
ipcMain.handle('desk:dbStatus', async () => { if (!DS) return noDb; try { return { ok: true, ...DS.status(), settings: DS.settings(), backups: DS.listBackups(), libDir: lib().dir }; } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.handle('desk:dbSave', dbw((o) => DS.saveS(String(o.main), o.kv || {})));
ipcMain.handle('desk:dbMigrate', dbw((o) => DS.migrate(String(o.main), o.kv || {})));
ipcMain.handle('desk:dbVerify', dbw((o) => DS.verify(String(o.main))));
ipcMain.handle('desk:dbSearch', dbw((q, lim) => ({ ok: true, rows: DS.search(String(q || ''), { limit: lim || 50 }) })));
ipcMain.handle('desk:dbBackupNow', dbw(() => ({ ok: true, name: DS.backup('يدوي') })));
ipcMain.handle('desk:dbSettings', dbw((p) => ({ ok: true, settings: p ? DS.setSettings(p) : DS.settings() })));
ipcMain.handle('desk:dbReadBackup', dbw((name) => { const r = DS.readBackup(name); if (!r.ok) return r; DS.backup('قبل-الاسترجاع'); return r; }));
ipcMain.handle('desk:dbExport', dbw(async (o) => {
  const zip = o.kind === 'zip', d = new Date(), n = 'aman-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const r = await dialog.showSaveDialog(win, { title: 'تصدير البيانات', defaultPath: path.join(app.getPath('documents'), n + (zip ? '.zip' : '.json')), filters: [zip ? { name: 'ZIP', extensions: ['zip'] } : { name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { ok: false, cancel: true };
  const res = zip ? DS.exportZip(r.filePath, String(o.main), o.kv || {}, { libDir: lib().dir, withDocs: o.withDocs !== false, withUsers: !!o.withUsers }) : DS.exportJson(r.filePath, String(o.main), o.kv || {}, { withUsers: !!o.withUsers });
  try { shell.showItemInFolder(r.filePath); } catch (e) { /* لا شيء */ }
  return { ...res, path: r.filePath };
}));
ipcMain.handle('desk:dbImportPick', dbw(async () => {
  const r = await dialog.showOpenDialog(win, { title: 'اختر ملف تصدير أمان', properties: ['openFile'], filters: [{ name: 'تصدير أمان', extensions: ['zip', 'json'] }] });
  if (r.canceled || !r.filePaths[0]) return { ok: false, cancel: true };
  const pkg = DS.readPackage(r.filePaths[0]); if (!pkg.ok) return pkg;
  PENDING = { file: r.filePaths[0], pkg };
  return { ok: true, file: r.filePaths[0], counts: pkg.counts, docs: pkg.docs, at: pkg.at, kind: pkg.kind };
}));
ipcMain.handle('desk:dbImportApply', dbw((o) => {
  if (!PENDING) return { ok: false, err: 'لا يوجد ملف مختار' };
  const { file, pkg } = PENDING; PENDING = null;
  const bk = DS.backup('قبل-الاستيراد'); let docs = null;
  if (o && o.docs && pkg.kind === 'zip') { docs = DS.extractDocs(file, lib().dir); lib().rebuild(); }
  return { ok: true, main: pkg.main, kv: pkg.kv, counts: pkg.counts, docs, backup: bk };
}));
ipcMain.handle('desk:docsAudit', (_e, ids) => { try { return { ok: true, ...lib().audit(Array.isArray(ids) ? ids : []) }; } catch (e) { return { ok: false, err: String(e.message || e) }; } });


// ======================================================================
// التحديث من GitHub (طبقة الواجهة فقط) — التفاصيل في updater.js و UPDATES_AR.md
// ======================================================================
function initUpdater() {
  try {
    const pkg = require('./package.json');
    let conf = {}; try { conf = JSON.parse(fs.readFileSync(path.join(ROOT, 'update-config.json'), 'utf8')); } catch (e) {}
    const uc = (readCfg().update || {});
    UPD = new Updater({
      root: ROOT, dataDir: path.join(app.getPath('userData'), 'updates'), shellApi: pkg.amanShellApi || 1,
      repo: uc.repo || conf.repo || '', token: uc.token || conf.token || '',
      log: (m) => console.log('[update] ' + m),
      onProgress: (p) => { try { if (win) win.webContents.send('desk:updProgress', p); } catch (e) {} }
    });
    UPD.boot();
  } catch (e) { console.error('[update] init failed: ' + e.message); UPD = null; }
}
function scheduleUpdateChecks() {
  if (!UPD) return;
  const run = async () => {
    try {
      if (!UPD.info().auto || !win) return;
      const r = await UPD.check();
      if (r.status === 'available' || r.status === 'needs-shell') { if (!r.skipped) win.webContents.send('desk:updAvail', r); }
    } catch (e) {}
  };
  setTimeout(run, 12000);
  setInterval(run, 6 * 60 * 60 * 1000);
}
const noUpd = { status: 'error', message: 'نظام التحديث غير متاح' };
ipcMain.handle('desk:updInfo', () => UPD ? UPD.info() : null);
ipcMain.handle('desk:updCheck', () => UPD ? UPD.check({ force: true }) : noUpd);
ipcMain.handle('desk:updInstall', async (_e, o = {}) => {
  if (!UPD) return noUpd;
  try {
    await UPD.stage();
    if (o.when === 'next') return { ok: true, when: 'next' };
    const v = UPD.activate();
    setTimeout(() => { try { if (win) win.webContents.reloadIgnoringCache(); } catch (e) {} }, 400);
    return { ok: true, when: 'now', version: v };
  } catch (e) { return { ok: false, err: String(e.message || e) }; }
});
ipcMain.handle('desk:updOk', () => UPD ? UPD.markOk() : false);
ipcMain.handle('desk:updAck', () => { if (UPD) UPD.ackJustUpdated(); return true; });
ipcMain.handle('desk:updSkip', (_e, v) => { if (UPD) UPD.skip(String(v || '')); return true; });
ipcMain.handle('desk:updAuto', (_e, on) => { if (UPD) UPD.setAuto(on); return true; });
