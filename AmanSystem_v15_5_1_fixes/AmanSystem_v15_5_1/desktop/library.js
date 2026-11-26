// مكتبة مستندات الموظفين على القرص + نسخة احتياطية للبيانات. وحدة Node خالصة (قابلة للاختبار بدون Electron).
const fs = require('fs');
const path = require('path');

const MIMES = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.txt': 'text/plain' };
const EXT = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };

const san = (s, max = 80) => String(s == null ? '' : s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, max) || '_';
const day = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

class Library {
  constructor(dir) {
    this.dir = dir;
    this.docs = path.join(dir, 'المستندات');
    this.trash = path.join(dir, '_المحذوفات');
    this.meta = path.join(dir, '_البيانات');
    this.snaps = path.join(this.meta, 'نسخ');
    for (const d of [this.docs, this.trash, this.snaps]) fs.mkdirSync(d, { recursive: true });
    this.idxFile = path.join(this.meta, 'index.json');
    this.dataFile = path.join(this.meta, 'aman-data.json');
    this.idx = null;
  }

  _atomic(file, content) {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, file);
  }

  _load() {
    if (this.idx) return this.idx;
    try { this.idx = JSON.parse(fs.readFileSync(this.idxFile, 'utf8')); } catch (e) { this.idx = null; }
    if (!this.idx || typeof this.idx !== 'object') this.rebuild();
    return this.idx;
  }
  _saveIdx() { this._atomic(this.idxFile, JSON.stringify(this.idx)); }

  // إعادة بناء الفهرس بمسح المجلد: الرقم المعرّف داخل اسم الملف بين [ ]
  rebuild() {
    this.idx = {};
    const walk = (d) => {
      let es = [];
      try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
      for (const e of es) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else {
          const m = /^(.*) \[([a-z0-9]+)\](\.[^.]*)?$/i.exec(e.name);
          if (m) this.idx[m[2]] = { p: path.relative(this.dir, p), name: m[1] + (m[3] || ''), type: MIMES[(m[3] || '').toLowerCase()] || 'application/octet-stream' };
        }
      }
    };
    walk(this.docs);
    try { this._saveIdx(); } catch (e) {}
    return this.idx;
  }

  save({ id, name, type, data, company, who, kind }) {
    if (!id || !data) return { ok: false, err: 'بيانات ناقصة' };
    const buf = Buffer.from(String(data).split(',')[1] || '', 'base64');
    let ext = path.extname(name || '').toLowerCase();
    if (!ext) ext = EXT[type] || '';
    const base = san(path.basename(name || 'ملف', path.extname(name || '')), 60);
    const folder = path.join(this.docs, san(company || '_عام'), san(who || '_عام'), san(kind || 'مستندات'));
    fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, `${base} [${id}]${ext}`);
    this._atomic(file, buf);
    if (fs.statSync(file).size !== buf.length) return { ok: false, err: 'فشل التحقق من الحجم بعد الكتابة' };
    this._load()[id] = { p: path.relative(this.dir, file), name: (name || base + ext), type: type || MIMES[ext] || 'application/octet-stream' };
    this._saveIdx();
    return { ok: true, path: file };
  }

  get(id) {
    const e = this._load()[id];
    if (!e) return null;
    const file = path.join(this.dir, e.p);
    if (!fs.existsSync(file)) return null;
    const buf = fs.readFileSync(file);
    return { id, name: e.name, type: e.type, data: `data:${e.type};base64,${buf.toString('base64')}` };
  }

  has(id) { const e = this._load()[id]; return !!(e && fs.existsSync(path.join(this.dir, e.p))); }

  // الحذف = نقل إلى _المحذوفات (لا يضيع شيء نهائياً)
  remove(id) {
    const e = this._load()[id];
    if (!e) return { ok: true };
    const file = path.join(this.dir, e.p);
    try {
      if (fs.existsSync(file)) fs.renameSync(file, path.join(this.trash, Date.now() + '-' + path.basename(file)));
    } catch (err) { return { ok: false, err: String(err.message || err) }; }
    delete this.idx[id];
    this._saveIdx();
    return { ok: true };
  }

  stats() {
    const idx = this._load();
    let bytes = 0, count = 0;
    for (const id of Object.keys(idx)) { try { bytes += fs.statSync(path.join(this.dir, idx[id].p)).size; count++; } catch (e) {} }
    let t = 0; try { t = fs.statSync(this.dataFile).mtimeMs; } catch (e) {}
    let snaps = 0; try { snaps = fs.readdirSync(this.snaps).length; } catch (e) {}
    return { count, bytes, dataTime: t, snaps };
  }

  // ----- نسخة احتياطية للبيانات -----
  writeData(json) {
    let old = null;
    try { old = fs.readFileSync(this.dataFile, 'utf8'); } catch (e) {}
    // حماية: لو الجديد أصغر بكثير من القديم (مسح/تلف محتمل) احفظ القديم أولاً
    if (old && json.length < old.length * 0.5) {
      this._atomic(path.join(this.snaps, `aman-قبل-النقص-${Date.now()}.json`), old);
      this._prune(/^aman-قبل-النقص-/, 10);
    }
    this._atomic(this.dataFile, json);
    const today = path.join(this.snaps, `aman-${day()}.json`);
    if (!fs.existsSync(today)) { this._atomic(today, json); this._prune(/^aman-\d{4}-\d\d-\d\d\.json$/, 30); }
    return { ok: true, t: Date.now() };
  }
  snapshotNow() {
    const f = path.join(this.snaps, `aman-يدوي-${day()}-${Date.now()}.json`);
    fs.copyFileSync(this.dataFile, f);
    return f;
  }
  readData() { try { return fs.readFileSync(this.dataFile, 'utf8'); } catch (e) { return null; } }
  _prune(re, keep) {
    try {
      const l = fs.readdirSync(this.snaps).filter(n => re.test(n)).sort();
      l.slice(0, Math.max(0, l.length - keep)).forEach(n => { try { fs.unlinkSync(path.join(this.snaps, n)); } catch (e) {} });
    } catch (e) {}
  }
}
module.exports = { Library, san };
