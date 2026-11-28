// يختبر محوّل sql.js في datastore.js مقابل «ظل» يحاكي واجهة sql.js (Database/run/exec/prepare/export) فوق node:sqlite.
// هذا لا يثبت عمل مكتبة sql.js الحقيقية؛ يثبت فقط أن منطق المحوّل (التخزين المؤقت، الحفظ الذري، إعادة الفتح) سليم عند مطابقة الواجهة.
import { createRequire } from 'module'; import fs from 'fs'; import os from 'os'; import path from 'path';
const require = createRequire(import.meta.url); const { DatabaseSync } = require('node:sqlite'); const { DataStore } = require('../../datastore.js');
class Database { constructor(buf) { this.f = path.join(os.tmpdir(), 'shim-' + Math.random().toString(36).slice(2) + '.db'); if (buf) fs.writeFileSync(this.f, Buffer.from(buf)); this.db = new DatabaseSync(this.f); }
  run(s, p = []) { this.db.prepare(s).run(...p); } exec(s) { this.db.exec(s); }
  prepare(s) { const st = this.db.prepare(s); let rows = [], i = 0; return { bind: (p) => { rows = st.all(...(p || [])); i = 0; return true; }, step: () => i < rows.length, getAsObject: () => ({ ...rows[i++] }), free: () => {} }; }
  export() { this.db.close(); const b = fs.readFileSync(this.f); this.db = new DatabaseSync(this.f); return new Uint8Array(b); } close() { this.db.close(); } }
let ok = 0, bad = 0; const chk = (n, c, x) => { if (c) { ok++; console.log('✔', n); } else { bad++; console.log('✘', n, x === undefined ? '' : JSON.stringify(x)); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aman7s-')); const dir = path.join(tmp, 'm');
const engine = { name: 'sql.js', make: (file) => { const sqljs = require('../../datastore.js'); return null; } };
// نستورد المحوّل عبر pickEngine مع حقن SQL مزيف
const mod = require('../../datastore.js'); const Module = require('module'); const orig = Module._load;
Module._load = function (req, ...a) { if (req === 'sql.js') return async () => ({ Database }); return orig.call(this, req, ...a); };
const _rr = require.resolve; require.resolve = (r, ...a) => (r === 'sql.js' ? path.join(tmp, 'sql-wasm.js') : _rr(r, ...a));
const ds = await DataStore.open(dir, { engine: 'sqljs' });
chk('اختيار محرك sql.js (المحوَّل)', !!ds && ds.engine.name === 'sql.js');
const S = { cfg: { a: 1 }, companies: [{ id: 'c1', name: 'ش' }], emps: Array.from({ length: 50 }, (_, i) => ({ id: 'e' + i, cid: 'c1', name: 'موظف ' + i, nid: '29' + i })), reqs: [], log: [] };
const r = ds.migrate(JSON.stringify(S), { ins_theme: 'x' }); chk('الترحيل والتحقق عبر محوّل sql.js', r.ok, r.problems || r.err);
chk('البحث عبر المحوّل', ds.search('موظف 7').some((x) => x.id === 'e7'));
const b = ds.backup('يدوي'); chk('نسخة احتياطية عبر export()', fs.statSync(path.join(ds.snaps, b)).size > 1000);
await new Promise((r) => setTimeout(r, 600)); chk('الحفظ المؤجل كتب ملف القاعدة على القرص', fs.existsSync(ds.file) && fs.statSync(ds.file).size > 1000);
ds.close(); const ds2 = await DataStore.open(dir, { engine: 'sqljs' });
chk('إعادة الفتح من الملف المحفوظ: نفس البيانات', JSON.stringify(ds2.loadS()) === JSON.stringify(S) && ds2.status().migratedAt > 0, ds2.status());
const rb = ds2.readBackup(b); chk('قراءة نسخة عبر المحوّل', rb.ok && JSON.parse(rb.main).emps.length === 50, rb.err);
ds2.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(`\n${ok} نجح • ${bad} فشل`); process.exit(bad ? 1 : 0);
