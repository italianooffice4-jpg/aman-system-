// أداة استرجاع مستندات النسخة القديمة (InsuranceSystem). تُشغَّل بـ 5-recover-old-docs.bat وتعمل على نسخة مؤقتة من المجلد القديم.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'); const fs = require('fs');
const arg = (process.argv.find(a => a.startsWith('--old-copy=')) || '').slice('--old-copy='.length);
if (!arg || !fs.existsSync(arg)) { console.error('missing --old-copy'); process.exit(2); }
app.setPath('userData', arg);                    // نقرأ من النسخة المؤقتة (origin = file://) ولا نلمس الأصل
const newCfg = path.join(process.env.APPDATA || '', 'Aman System', 'aman-config.json');
let Recovery, rc = null, win = null;
const libDir = () => { try { const c = JSON.parse(fs.readFileSync(newCfg, 'utf8')); if (c.libraryDir) return c.libraryDir; } catch (e) {} return path.join(app.getPath('documents'), 'Aman Library'); };
app.whenReady().then(() => {
  ({ Recovery } = require('./recover.js'));
  win = new BrowserWindow({ width: 760, height: 560, title: 'استرجاع مستندات النسخة القديمة', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));      // file:// ← نفس أصل النسخة القديمة (file__0)
});
ipcMain.handle('rec:meta', (_e, S) => { rc = new Recovery(libDir(), S); return { dir: rc.lib.dir }; });
ipcMain.handle('rec:doc', (_e, r) => { if (!rc) rc = new Recovery(libDir(), {}); const x = rc.add(r); return { ok: !!x.ok, skipped: !!x.skipped }; });
ipcMain.handle('rec:done', () => (rc ? rc.summary() : { total: 0, saved: 0, skipped: 0, orphan: 0, bytes: 0, errors: [], dir: libDir() }));
app.on('window-all-closed', () => app.quit());
