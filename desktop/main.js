// غلاف سطح المكتب (Electron) لنظام Aman — يوفّر الواجهة window.desk التي تتوقعها الصفحة.
const { app, BrowserWindow, protocol, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { Library } = require('./library');
const { Updater } = require('./updater');

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
  createWindow();
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
const runPS = (args, timeout) => new Promise((resolve) => {
  execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-File', SCRIPT(), ...args],
    { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' }, (err, stdout, stderr) =>
      resolve({ err, out: String(stdout || '').replace(/^\uFEFF/, '').trim(), errText: String(stderr || '').replace(/^\uFEFF/, '').trim() }));
});
async function listScanners() {
  if (process.platform !== 'win32') return [];
  const r = await runPS(['-Mode', 'list'], 30000);
  try { const j = JSON.parse(r.out || '[]'); return Array.isArray(j) ? j : [j]; } catch (e) { return []; }
}
ipcMain.handle('desk:scanners', () => listScanners());

ipcMain.handle('desk:scan', async (_e, opts = {}) => {
  if (process.platform !== 'win32') return { err: 'المسح الضوئي المباشر يعمل على Windows فقط' };
  let cfg = readCfg(), sc = cfg.scan || {};
  const list = await listScanners();
  if (!list.length) return { err: 'لم يتم العثور على ماسح ضوئي متصل. تأكد من تشغيله وتعريفه.' };
  let dev = list.find(s => s.id === sc.deviceId);
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
  const out = fs.mkdtempSync(path.join(tmpDir(), 'scan-'));
  const r = await runPS(['-Mode', 'scan', '-Adf', opts.adf ? '1' : '0', '-OutDir', out, '-DeviceId', dev.id, '-Dpi', String(dpi), '-Intent', String(intent)], 5 * 60 * 1000);
  if (/^CANCEL/m.test(r.out)) return { cancel: true };
  const files = fs.readdirSync(out).filter(n => /\.jpg$/i.test(n)).sort();
  if (!files.length) {
    let msg = r.errText || r.out || (r.err && r.err.message) || '';
    if (/NO_PAPER_IN_FEEDER/.test(msg)) msg = 'لا توجد أوراق في التغذية التلقائية';
    else if (/NO_SCANNER|0x80210015/i.test(msg) || !msg) msg = 'لم يتم العثور على ماسح ضوئي متصل. تأكد من تشغيله وتعريفه.';
    return { err: msg.slice(0, 300) };
  }
  const pages = files.map(n => toDataUrl(fs.readFileSync(path.join(out, n)), 'image/jpeg'));
  try { fs.rmSync(out, { recursive: true, force: true }); } catch (e) {}
  return { pages, data: pages[0] }; // data للتوافق مع الكود القديم
});

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
    LIB = nl; nl.rebuild();
    writeCfg({ ...readCfg(), libraryDir: nd });
    return { ok: true, dir: nd, copied };
  } catch (e) { return { err: String(e.message || e) }; }
});

// نسخة البيانات
ipcMain.handle('desk:libSaveData', (_e, json) => { try { return lib().writeData(String(json)); } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.handle('desk:libLoadData', () => lib().readData());
ipcMain.handle('desk:libSnapshot', () => { try { return { ok: true, path: lib().snapshotNow() }; } catch (e) { return { ok: false, err: String(e.message || e) }; } });
ipcMain.on('desk:loadDataSync', (e) => { try { e.returnValue = lib().readData(); } catch (x) { e.returnValue = null; } });


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
