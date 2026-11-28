// المرحلة 7 — طبقة البيانات: قاعدة SQLite (aman.db) نسخة دائمة وموثّقة من بيانات البرنامج.
// مبدأ الأمان: لا تمسّ هذه الوحدة localStorage ولا ملف aman-data.json؛ تكتب بجانبهما، وكل ترحيل يُتحقق منه (أعداد + تطابق كل سجل)
// قبل أن يُعتمد. وحدة Node خالصة قابلة للاختبار؛ المحرك: sql.js (WASM، يعمل مع Electron) ثم node:sqlite (Node ≥ 22.5) كاحتياط.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ZipWriter, ZipReader } = require('./zip.js');

const MAIN_KEY = 'ins_sys_v1';
const SECRET_KV = /^ins_(ai_key|cloud)/;          // لا نكتب أي مفاتيح سرية في القاعدة أو التصدير
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
const stamp = (d = new Date()) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0');
const atomic = (file, buf) => { const tmp = file + '.tmp'; fs.writeFileSync(tmp, buf); fs.renameSync(tmp, file); };
// تطبيع النص العربي للبحث: أرقام هندية → لاتينية، حذف التشكيل والتطويل، توحيد الألف والياء والتاء المربوطة
const norm = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632).replace(/[۰-۹]/g, (c) => c.charCodeAt(0) - 1776)
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();

/* ============================ المحركات ============================ */
function nodeSqliteAdapter(file) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');
  return {
    name: 'node:sqlite',
    exec: (s) => db.exec(s),
    run: (s, p = []) => db.prepare(s).run(...p),
    all: (s, p = []) => db.prepare(s).all(...p).map((r) => ({ ...r })),
    snapshotTo: (f) => { try { fs.unlinkSync(f); } catch (e) { /* لا شيء */ } db.exec("VACUUM INTO '" + f.replace(/'/g, "''") + "'"); },
    flush: () => {}, close: () => { try { db.close(); } catch (e) { /* لا شيء */ } }
  };
}
function sqlJsAdapter(file, SQL) {
  let buf = null; try { buf = fs.readFileSync(file); } catch (e) { /* قاعدة جديدة */ }
  const db = buf && buf.length ? new SQL.Database(new Uint8Array(buf)) : new SQL.Database();
  let timer = null, dirty = false;
  const persist = () => { clearTimeout(timer); timer = null; if (!dirty) return; atomic(file, Buffer.from(db.export())); dirty = false; };
  const sched = () => { dirty = true; clearTimeout(timer); timer = setTimeout(() => { try { persist(); } catch (e) { console.error('[datastore] persist failed', e.message); } }, 300); };
  return {
    name: 'sql.js',
    exec: (s) => { db.exec(s); sched(); },
    run: (s, p = []) => { db.run(s, p); sched(); },
    all: (s, p = []) => { const st = db.prepare(s); try { st.bind(p); const out = []; while (st.step()) out.push(st.getAsObject()); return out; } finally { st.free(); } },
    snapshotTo: (f) => { atomic(f, Buffer.from(db.export())); },
    flush: persist, close: () => { try { persist(); } catch (e) { /* لا شيء */ } try { db.close(); } catch (e) { /* لا شيء */ } }
  };
}
// يرجع { make(file) , name } أو null لو لا يوجد أي محرك
async function pickEngine(pref = 'auto') {
  if (pref === 'auto' || pref === 'sqljs') {
    try {
      const init = require('sql.js');
      const SQL = await init({ locateFile: (f) => path.join(path.dirname(require.resolve('sql.js')), f) });
      return { name: 'sql.js', make: (file) => sqlJsAdapter(file, SQL) };
    } catch (e) { if (pref === 'sqljs') return null; }
  }
  if (pref === 'auto' || pref === 'node') {
    try { require('node:sqlite'); return { name: 'node:sqlite', make: nodeSqliteAdapter }; } catch (e) { /* غير متاح */ }
  }
  return null;
}

/* ============================ تقسيم البيانات ============================ */
const COLL_LABEL = { emps: 'موظف', reqs: 'طلب دخول', companies: 'شركة', cars: 'سيارة', tasks: 'مهمة', log: 'سجل', pay: 'كشف مرتبات' };
const SEARCHABLE = ['emps', 'reqs', 'companies', 'cars', 'tasks'];
function split(S) {
  const cmap = {}; (Array.isArray(S.companies) ? S.companies : []).forEach((c) => { if (c && c.id != null) cmap[c.id] = c.name; });
  const colls = {}, order = [];
  const txtOf = (it) => {
    if (it == null || typeof it !== 'object') return norm(it);
    const a = []; for (const v of Object.values(it)) { if (typeof v === 'string' ? v.length <= 200 : typeof v === 'number') a.push(v); }
    if (it.cid != null && cmap[it.cid]) a.push(cmap[it.cid]);
    return norm(a.join(' ')).slice(0, 600);
  };
  for (const k of Object.keys(S)) {
    const v = S[k];
    if (Array.isArray(v)) {
      const seen = new Set(), rows = v.map((it, i) => { let id = it && typeof it === 'object' && it.id != null ? String(it.id) : '#' + i; if (seen.has(id)) id += '#' + i; seen.add(id); const body = JSON.stringify(it); return { id, body: body === undefined ? 'null' : body, txt: SEARCHABLE.includes(k) ? txtOf(it) : '' }; });
      colls[k] = rows; order.push([k, 'a']);
    } else { (colls._obj = colls._obj || []).push({ id: k, body: JSON.stringify(v) === undefined ? 'null' : JSON.stringify(v), txt: '' }); order.push([k, 'o']); }
  }
  return { colls, order };
}
const collHash = (rows) => sha(rows.map((r) => r.id + '\u0001' + r.body).join('\u0002'));

/* ============================ الفئة الرئيسية ============================ */
class DataStore {
  constructor(dir, engine, opt = {}) {
    this.dir = dir; this.engine = engine; this.log = opt.log || (() => {});
    this.file = path.join(dir, 'aman.db'); this.snaps = path.join(dir, 'نسخ'); this.setFile = path.join(dir, 'backup-settings.json');
    fs.mkdirSync(this.snaps, { recursive: true });
    this.A = engine.make(this.file); this._schema();
  }
  static async open(dir, opt = {}) {
    const engine = opt.engineObj || await pickEngine(opt.engine || 'auto'); if (!engine) return null;
    fs.mkdirSync(dir, { recursive: true });
    try { return new DataStore(dir, engine, opt); } catch (e) { (opt.log || console.error)('[datastore] open failed: ' + e.message); return null; }
  }
  _schema() {
    this.A.exec('CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT)');
    this.A.exec('CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT)');
    this.A.exec('CREATE TABLE IF NOT EXISTS rec(coll TEXT NOT NULL, id TEXT NOT NULL, pos INTEGER NOT NULL, body TEXT NOT NULL, txt TEXT NOT NULL DEFAULT \'\', PRIMARY KEY(coll,id))');
    this.A.exec('CREATE INDEX IF NOT EXISTS rec_pos ON rec(coll,pos)');
    if (this.getMeta('schema') == null) this.setMeta('schema', '1');
  }
  getMeta(k) { const r = this.A.all('SELECT v FROM meta WHERE k=?', [k]); return r.length ? r[0].v : null; }
  setMeta(k, v) { this.A.run('INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', [k, String(v)]); }
  _tx(fn) { this.A.exec('BEGIN'); try { const r = fn(); this.A.exec('COMMIT'); return r; } catch (e) { try { this.A.exec('ROLLBACK'); } catch (x) { /* لا شيء */ } throw e; } }
  close() { this.A.close(); }
  flush() { this.A.flush(); }

  /* ---- الكتابة: تُحدَّث المجموعات المتغيّرة فقط ---- */
  saveS(mainJson, kv = {}) {
    let S; try { S = JSON.parse(mainJson); } catch (e) { return { ok: false, err: 'بيانات غير صالحة' }; }
    if (!S || typeof S !== 'object' || Array.isArray(S)) return { ok: false, err: 'بيانات غير صالحة' };
    const { colls, order } = split(S), changed = [];
    this._tx(() => {
      const prev = JSON.parse(this.getMeta('skeys') || '[]');
      for (const [k] of prev) if (!order.some((o) => o[0] === k)) { if (this._isObj(prev, k)) this.A.run("DELETE FROM rec WHERE coll='_obj' AND id=?", [k]); else this.A.run('DELETE FROM rec WHERE coll=?', [k]); this.A.run('DELETE FROM meta WHERE k=?', ['h:' + k]); changed.push(k); }
      const groups = {}; order.forEach(([k, t]) => { (groups[t === 'a' ? k : '_obj'] = groups[t === 'a' ? k : '_obj'] || true); });
      for (const g of Object.keys(groups)) {
        const rows = colls[g] || [], h = collHash(rows);
        if (this.getMeta('h:' + g) === h) continue;
        this.A.run('DELETE FROM rec WHERE coll=?', [g]);
        rows.forEach((r, i) => this.A.run('INSERT INTO rec(coll,id,pos,body,txt) VALUES(?,?,?,?,?)', [g, r.id, i, r.body, r.txt]));
        this.setMeta('h:' + g, h); changed.push(g);
      }
      this.setMeta('skeys', JSON.stringify(order)); this.setMeta('savedAt', Date.now());
      for (const [k, v] of Object.entries(kv || {})) { if (SECRET_KV.test(k) || k === MAIN_KEY || v == null) continue; this.A.run('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', [k, String(v)]); }
    });
    return { ok: true, changed };
  }
  _isObj(order, k) { const o = order.find((x) => x[0] === k); return o && o[1] === 'o'; }

  /* ---- القراءة ---- */
  loadS() {
    const order = JSON.parse(this.getMeta('skeys') || 'null'); if (!order) return null;
    const S = {};
    for (const [k, t] of order) {
      if (t === 'a') S[k] = this.A.all('SELECT body FROM rec WHERE coll=? ORDER BY pos', [k]).map((r) => JSON.parse(r.body));
      else { const r = this.A.all("SELECT body FROM rec WHERE coll='_obj' AND id=?", [k]); S[k] = r.length ? JSON.parse(r[0].body) : null; }
    }
    return S;
  }
  loadKv() { const o = {}; this.A.all('SELECT k,v FROM kv').forEach((r) => { o[r.k] = r.v; }); return o; }
  counts() { const o = {}; this.A.all("SELECT coll, COUNT(*) n FROM rec WHERE coll!='_obj' GROUP BY coll").forEach((r) => { o[r.coll] = r.n; }); return o; }
  status() {
    let size = 0; try { this.A.flush(); size = fs.statSync(this.file).size; } catch (e) { /* لا شيء */ }
    let ic = 'ok'; try { ic = (this.A.all('PRAGMA integrity_check')[0] || {}).integrity_check || 'ok'; } catch (e) { ic = String(e.message || e); }
    return { engine: this.engine.name, file: this.file, size, savedAt: +this.getMeta('savedAt') || 0, migratedAt: +this.getMeta('migratedAt') || 0, counts: this.counts(), integrity: ic };
  }

  /* ---- الترحيل الآمن مع مطابقة الأعداد (3) ----
     يكتب كل شيء من الصفر ثم يعيد القراءة ويقارن: عدد كل مجموعة + تطابق نص كل سجل + تطابق البيانات كاملة. لا يعتمد الترحيل إلا بنجاح كل الفحوص. */
  migrate(mainJson, kv = {}) {
    let S; try { S = JSON.parse(mainJson); } catch (e) { return { ok: false, err: 'بيانات البرنامج غير صالحة، لم يُرحَّل شيء' }; }
    if (!S || typeof S !== 'object' || Array.isArray(S)) return { ok: false, err: 'بيانات البرنامج غير صالحة' };
    const bk = this.backup('قبل-الترحيل');
    try {
      this._tx(() => { this.A.run('DELETE FROM rec'); this.A.run("DELETE FROM meta WHERE k LIKE 'h:%'"); });
      this.saveS(mainJson, kv);
    } catch (e) { return { ok: false, err: 'فشل الكتابة: ' + (e.message || e), backup: bk }; }
    const v = this.verify(mainJson);
    if (v.ok) this.setMeta('migratedAt', Date.now());
    return { ...v, backup: bk };
  }
  verify(mainJson) {
    const S = JSON.parse(mainJson), { colls, order } = split(S), report = [], problems = [];
    for (const [k, t] of order) {
      const g = t === 'a' ? k : '_obj', want = t === 'a' ? (colls[k] || []) : (colls._obj || []).filter((r) => r.id === k);
      const got = this.A.all(t === 'a' ? 'SELECT id, body FROM rec WHERE coll=? ORDER BY pos' : "SELECT id, body FROM rec WHERE coll='_obj' AND id=?", [t === 'a' ? k : k]);
      let bad = 0; want.forEach((r, i) => { if (!got[i] || got[i].id !== r.id || got[i].body !== r.body) bad++; });
      report.push({ coll: k, src: want.length, db: got.length, bad });
      if (want.length !== got.length) problems.push(k + ': العدد ' + want.length + ' ≠ ' + got.length);
      if (bad) problems.push(k + ': ' + bad + ' سجل غير مطابق');
      void g;
    }
    let same = false; try { same = JSON.stringify(this.loadS()) === JSON.stringify(S); } catch (e) { same = false; }
    if (!same) problems.push('إعادة بناء البيانات من القاعدة لا تطابق الأصل');
    const ic = (this.A.all('PRAGMA integrity_check')[0] || {}).integrity_check;
    if (ic && ic !== 'ok') problems.push('فحص سلامة القاعدة: ' + ic);
    return { ok: !problems.length, report, problems };
  }

  /* ---- البحث السريع في كل الجداول (6) ---- */
  search(q, { limit = 50, colls = SEARCHABLE } = {}) {
    const toks = norm(q).split(/\s+/).filter(Boolean).slice(0, 6); if (!toks.length) return [];
    const esc = (t) => '%' + t.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    const cs = colls.filter((c) => SEARCHABLE.includes(c)); if (!cs.length) return [];
    const sql = 'SELECT coll,id,body FROM rec WHERE coll IN (' + cs.map(() => '?').join(',') + ')' + toks.map(() => " AND txt LIKE ? ESCAPE '\\'").join('') +
      " ORDER BY CASE coll WHEN 'emps' THEN 0 WHEN 'reqs' THEN 1 WHEN 'companies' THEN 2 WHEN 'cars' THEN 3 ELSE 4 END, pos LIMIT ?";
    return this.A.all(sql, [...cs, ...toks.map(esc), Math.max(1, Math.min(200, limit | 0))]).map((r) => {
      let b = {}; try { b = JSON.parse(r.body) || {}; } catch (e) { /* لا شيء */ }
      return { coll: r.coll, kind: COLL_LABEL[r.coll] || r.coll, id: b.id != null ? String(b.id) : r.id, title: String(b.name || b.title || b.plate || r.id), sub: [b.code, b.job, b.type, b.cname, b.status].filter(Boolean).join(' • ') };
    });
  }

  /* ---- النسخ الاحتياطي المجدول (4) ---- */
  settings() { let s = {}; try { s = JSON.parse(fs.readFileSync(this.setFile, 'utf8')); } catch (e) { /* افتراضي */ } return { auto: s.auto !== false, everyHours: Math.min(168, Math.max(1, +s.everyHours || 12)), keep: Math.min(200, Math.max(3, +s.keep || 20)) }; }
  setSettings(p) { const s = { ...this.settings(), ...p }; atomic(this.setFile, JSON.stringify(s)); return this.settings(); }
  backup(reason = 'تلقائي') {
    this.A.flush();
    const r = String(reason).replace(/[\\/:*?"<>|\s]+/g, '-'), name = `aman-${stamp()}-${r}.db`, f = path.join(this.snaps, name);
    let n = 0, ff = f; while (fs.existsSync(ff)) ff = f.replace(/\.db$/, '-' + (++n) + '.db');
    this.A.snapshotTo(ff); this.setMeta('lastBackupAt', Date.now()); this.prune();
    return path.basename(ff);
  }
  prune() {
    const keep = this.settings().keep;
    const l = this.listBackups().filter((b) => b.reason === 'تلقائي');                       // نحذف التلقائي القديم فقط؛ اليدوي و«قبل-…» لا يُحذفان آليًا
    l.slice(keep).forEach((b) => { try { fs.unlinkSync(path.join(this.snaps, b.name)); } catch (e) { /* لا شيء */ } });
  }
  listBackups() {
    let l = []; try { l = fs.readdirSync(this.snaps).filter((n) => /^aman-.*\.db$/.test(n)); } catch (e) { /* لا شيء */ }
    return l.map((n) => { const st = fs.statSync(path.join(this.snaps, n)), m = /^aman-\d{8}-\d{6}-(.*?)(-\d+)?\.db$/.exec(n); return { name: n, size: st.size, t: st.mtimeMs, reason: m ? m[1] : '' }; }).sort((a, b) => b.t - a.t || (a.name < b.name ? 1 : -1));
  }
  backupDue() { const s = this.settings(); if (!s.auto) return false; const last = +this.getMeta('lastBackupAt') || 0; return Date.now() - last >= s.everyHours * 3600e3 && !!this.getMeta('skeys'); }
  // يقرأ نسخة بعد التحقق منها دون لمس القاعدة الحالية؛ التطبيق يقرر الاسترجاع (والقاعدة الحالية تُنسخ قبله)
  readBackup(name) {
    const f = path.join(this.snaps, path.basename(String(name)));
    if (!fs.existsSync(f)) return { ok: false, err: 'النسخة غير موجودة' };
    const tmp = path.join(this.dir, '_check-' + Date.now() + '.db'); fs.copyFileSync(f, tmp);
    let st = null;
    try {
      st = new DataStore(this.dir.replace(/$/, ''), { name: this.engine.name, make: () => this.engine.make(tmp) }, { log: this.log });
      const ic = (st.A.all('PRAGMA integrity_check')[0] || {}).integrity_check;
      if (ic && ic !== 'ok') return { ok: false, err: 'النسخة تالفة: ' + ic };
      const S = st.loadS(); if (!S) return { ok: false, err: 'النسخة فارغة' };
      const counts = st.counts();
      return { ok: true, main: JSON.stringify(S), kv: st.loadKv(), counts };
    } catch (e) { return { ok: false, err: String(e.message || e) }; }
    finally { try { if (st) st.A.close(); } catch (e) { /* لا شيء */ } try { fs.unlinkSync(tmp); } catch (e) { /* لا شيء */ } }
  }

  /* ---- التصدير والاستيراد (5) ---- */
  _package(mainJson, kv, withUsers) {
    const S = JSON.parse(mainJson), counts = {};
    Object.keys(S).forEach((k) => { if (Array.isArray(S[k])) counts[k] = S[k].length; });
    const k2 = {}; for (const [k, v] of Object.entries(kv || {})) { if (SECRET_KV.test(k) || k === MAIN_KEY || v == null) continue; if (k === 'ins_users' && !withUsers) continue; k2[k] = v; }
    return { S, kv: k2, counts };
  }
  exportJson(file, mainJson, kv, { withUsers = false } = {}) {
    const p = this._package(mainJson, kv, withUsers);
    atomic(file, JSON.stringify({ format: 'aman-export', v: 1, kind: 'json', at: Date.now(), counts: p.counts, S: p.S, kv: p.kv }));
    return { ok: true, counts: p.counts };
  }
  // libDir = مجلد المكتبة؛ withDocs يضيف ملفات المستندات (مجلد «المستندات») كما هي
  exportZip(file, mainJson, kv, { libDir = '', withDocs = true, withUsers = false } = {}) {
    const p = this._package(mainJson, kv, withUsers), tmp = file + '.part', z = new ZipWriter(tmp);
    let docs = 0, bytes = 0;
    try {
      const data = Buffer.from(JSON.stringify({ S: p.S, kv: p.kv }));
      z.addBuffer('data.json', data);
      if (withDocs && libDir) {
        const root = path.join(libDir, 'المستندات');
        const walk = (d, rel) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } for (const e of es) { const a = path.join(d, e.name), r = rel + '/' + e.name; if (e.isDirectory()) walk(a, r); else if (e.isFile()) { z.addFile('docs' + r, a); docs++; bytes += fs.statSync(a).size; } } };
        walk(root, '');
      }
      z.addBuffer('manifest.json', JSON.stringify({ format: 'aman-export', v: 1, kind: 'zip', at: Date.now(), counts: p.counts, docs, dataSha: sha(data.toString('utf8')) }));
      z.finish(); fs.renameSync(tmp, file);
    } catch (e) { z.abort(); throw e; }
    return { ok: true, counts: p.counts, docs, bytes };
  }
  // يقرأ ملف تصدير (zip أو json) ويتحقق من مطابقة الأعداد؛ يعيد البيانات دون تطبيقها
  readPackage(file) {
    let man, S, kv, zipDocs = 0;
    if (/\.zip$/i.test(file)) {
      const z = new ZipReader(file);
      try {
        const m = z.read('manifest.json'), d = z.read('data.json'); if (!m || !d) return { ok: false, err: 'الملف ليس تصديرًا من أمان (ينقصه manifest/data)' };
        man = JSON.parse(m.toString('utf8')); const raw = d.toString('utf8');
        if (man.dataSha && man.dataSha !== sha(raw)) return { ok: false, err: 'فشل التحقق: بيانات الملف لا تطابق بصمتها (الملف تالف أو عُدّل)' };
        const o = JSON.parse(raw); S = o.S; kv = o.kv || {}; zipDocs = z.entries.filter((e) => e.name.startsWith('docs/')).length;
      } catch (e) { return { ok: false, err: 'تعذر قراءة الملف: ' + (e.message || e) }; } finally { z.close(); }
    } else {
      try { const o = JSON.parse(fs.readFileSync(file, 'utf8')); if (o.format !== 'aman-export') return { ok: false, err: 'الملف ليس تصديرًا من أمان' }; man = o; S = o.S; kv = o.kv || {}; } catch (e) { return { ok: false, err: 'تعذر قراءة الملف: ' + (e.message || e) }; }
    }
    if (!S || typeof S !== 'object' || Array.isArray(S) || man.format !== 'aman-export') return { ok: false, err: 'بنية الملف غير صالحة' };
    const counts = {}; Object.keys(S).forEach((k) => { if (Array.isArray(S[k])) counts[k] = S[k].length; });
    const bad = Object.keys(man.counts || {}).filter((k) => (man.counts[k] | 0) !== (counts[k] | 0));
    if (bad.length) return { ok: false, err: 'عدم تطابق الأعداد مع بيان الملف في: ' + bad.join('، ') };
    return { ok: true, main: JSON.stringify(S), kv, counts, docs: zipDocs, at: man.at, kind: man.kind || 'json' };
  }
  // يستخرج المستندات إلى مجلد المكتبة دون استبدال أي ملف موجود ودون الخروج من المجلد
  extractDocs(file, libDir) {
    const z = new ZipReader(file), root = path.resolve(libDir, 'المستندات'); let added = 0, skipped = 0, bad = 0;
    try {
      for (const e of z.entries) {
        if (!e.name.startsWith('docs/') || e.name.endsWith('/')) continue;
        const dest = path.resolve(root, e.name.slice(5));
        if (dest !== root && !dest.startsWith(root + path.sep)) { bad++; continue; }
        if (fs.existsSync(dest)) { skipped++; continue; }
        const buf = z.read(e); fs.mkdirSync(path.dirname(dest), { recursive: true }); atomic(dest, buf); added++;
      }
    } finally { z.close(); }
    return { added, skipped, bad };
  }
}
module.exports = { DataStore, pickEngine, norm, split };
