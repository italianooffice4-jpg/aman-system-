'use strict';
// نظام التحديث من الداخل (OTA) لطبقة الواجهة: index.html + src/** + version.json
// الفكرة: كل مرحلة تُنشَر كـ Release على GitHub (بناها GitHub Actions)، والبرنامج يفحصها وينزّلها ويتحقق من sha256 ثم يستخدمها
// من مجلد بيانات المستخدم بدل ملفاته المثبّتة، بدون إعادة تثبيت ولا بناء. بيانات الموظفين (localStorage + المكتبة) لا تُمس أبدًا.
// ملف الغلاف (main.js, preload.js, library.js, updater.js) لا يتحدث بهذه الطريقة: لو احتاج إصدار نسخة جديدة منه يظهر للمستخدم
// إشعار «يحتاج تنصيب نسخة جديدة» (shellApi في update.json أعلى من shellApi المثبّت).
// الوحدة بلا أي اعتماد على Electron حتى تُختبر مباشرة بـ Node.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

/* ---------------- إصدارات ---------------- */
const parseVer = (v) => String(v || '').replace(/^v/i, '').split(/[-+]/)[0].split('.').map(n => parseInt(n, 10) || 0).concat([0, 0, 0]).slice(0, 3);
const cmpVer = (a, b) => { const x = parseVer(a), y = parseVer(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1; return 0; };
const isVer = (v) => /^v?\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(String(v || ''));

/* ---------------- مسموح تحديثه فقط ---------------- */
const allowed = (rel) => rel === 'index.html' || rel === 'version.json' || rel.startsWith('src/');
const safeRel = (name) => {
  if (typeof name !== 'string' || !name || name.includes('\0') || name.includes('\\')) return null;
  const n = path.posix.normalize(name.replace(/^\.\//, ''));
  if (n.startsWith('/') || n === '..' || n.startsWith('../') || /^[A-Za-z]:/.test(n) || n.endsWith('/')) return null;
  return n;
};
const LIMITS = { files: 5000, bytes: 300 * 1024 * 1024 };

/* ---------------- قراءة tar.gz (ustar) بدون مكتبات ---------------- */
const oct = (b) => parseInt(b.toString('ascii').replace(/\0.*$/, '').trim() || '0', 8);
const cstr = (b) => b.toString('utf8').replace(/\0.*$/s, '');
function untar(buf) {
  const out = []; let off = 0, longName = null, total = 0;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every(x => x === 0)) break;
    let sum = 0; for (let i = 0; i < 512; i++) sum += (i >= 148 && i < 156) ? 32 : h[i];
    if (sum !== oct(h.subarray(148, 156))) throw new Error('ملف التحديث تالف (tar checksum)');
    const size = oct(h.subarray(124, 136)), type = String.fromCharCode(h[156] || 48);
    let name = cstr(h.subarray(0, 100));
    if (h.subarray(257, 262).toString('ascii') === 'ustar') { const pre = cstr(h.subarray(345, 500)); if (pre) name = pre + '/' + name; }
    const data = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x' || type === 'g') continue;
    if (type === 'L') { longName = cstr(data); continue; }
    if (longName) { name = longName; longName = null; }
    if (type === '5') continue;
    if (type !== '0' && type !== '\0') throw new Error('ملف التحديث يحتوي نوع عنصر غير مسموح (' + type + ')');
    total += size;
    if (out.length >= LIMITS.files || total > LIMITS.bytes) throw new Error('ملف التحديث أكبر من الحد المسموح');
    out.push({ name, data });
  }
  return out;
}
/* يفك الأرشيف إلى dest بعد التحقق من كل المسارات؛ أي مسار خارج المسموح يُلغي العملية كلها قبل كتابة أي شيء */
function extractTarGz(gz, dest) {
  const files = untar(zlib.gunzipSync(gz));
  const plan = files.map((f) => {
    const rel = safeRel(f.name);
    if (!rel) throw new Error('مسار غير آمن داخل التحديث: ' + f.name);
    if (!allowed(rel)) throw new Error('ملف غير مسموح تحديثه: ' + rel);
    return { rel, data: f.data };
  });
  for (const p of plan) {
    const f = path.join(dest, p.rel);
    if (!path.resolve(f).startsWith(path.resolve(dest) + path.sep)) throw new Error('مسار غير آمن: ' + p.rel);
  }
  for (const p of plan) { const f = path.join(dest, p.rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, p.data); }
  return plan.map(p => p.rel);
}

/* ---------------- أدوات ملفات ---------------- */
const rmrf = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) { /* لا شيء */ } };
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const writeJsonAtomic = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(o)); fs.renameSync(t, f); };

class Updater {
  /* o: { root, dataDir, shellApi, repo, token, api, fetch, log, onProgress } */
  constructor(o) {
    this.root = path.resolve(o.root);
    this.dir = path.resolve(o.dataDir);
    this.shellApi = o.shellApi || 1;
    this.repo = o.repo || '';
    this.token = o.token || '';
    this.api = (o.api || 'https://api.github.com').replace(/\/+$/, '');
    this.fetch = o.fetch || globalThis.fetch;
    this.log = o.log || (() => {});
    this.onProgress = o.onProgress || (() => {});
    this.cur = path.join(this.dir, 'current');
    this.staged = path.join(this.dir, 'staged');
    this.prev = path.join(this.dir, 'prev');
    this.stateFile = path.join(this.dir, 'state.json');
    this.last = null;               // آخر نتيجة check (لاستخدامها في install)
  }

  /* ---------- حالة ---------- */
  state() { return readJson(this.stateFile) || {}; }
  save(patch) { const s = { ...this.state(), ...patch }; writeJsonAtomic(this.stateFile, s); return s; }
  bundledVersion() { const j = readJson(path.join(this.root, 'version.json')); return (j && j.version) || '0.0.0'; }
  overrideVersion() { const j = readJson(path.join(this.cur, 'version.json')); return j && j.version && fs.existsSync(path.join(this.cur, 'index.html')) ? j.version : null; }
  version() { const o = this.overrideVersion(), b = this.bundledVersion(); return o && cmpVer(o, b) > 0 ? o : b; }
  usingOverride() { const o = this.overrideVersion(); return !!o && cmpVer(o, this.bundledVersion()) > 0; }
  info() {
    const s = this.state();
    return { version: this.version(), bundled: this.bundledVersion(), shellApi: this.shellApi, repo: this.repo, override: this.usingOverride(),
      auto: s.auto !== false, skip: s.skip || '', bad: s.bad || [], staged: s.staged || '', justUpdated: s.justUpdated || '', justNotes: s.justNotes || '', rolledBack: s.rolledBack || null, lastCheck: s.lastCheck || 0 };
  }

  /* ---------- عند بدء البرنامج (قبل فتح النافذة) ---------- */
  boot() {
    fs.mkdirSync(this.dir, { recursive: true });
    let s = this.state();
    // 1) تحديث سابق لم يتأكد نجاحه ثم أُعيد تشغيل البرنامج = فشل → رجوع للنسخة السابقة
    if (s.pending) { this.rollback('لم تنجح النسخة ' + (s.version || '') + ' في العمل فتم الرجوع للنسخة السابقة'); s = this.state(); }
    // 2) نسخة منزَّلة بانتظار التشغيل القادم
    if (this.staged && fs.existsSync(path.join(this.staged, 'index.html'))) {
      try { this.activate(); } catch (e) { this.log('activate staged failed: ' + e.message); rmrf(this.staged); }
    }
    // 3) المثبَّت أحدث من (أو يساوي) المنزَّل سابقًا (مثلاً بعد تثبيت نسخة جديدة) ← احذف المنزَّل القديم
    if (fs.existsSync(this.cur) && !this.usingOverride()) { rmrf(this.cur); rmrf(this.prev); }
    return this.info();
  }

  /* مسار فعلي لملف الواجهة المطلوب (يفضّل المنزَّل ثم المثبَّت) — أو null */
  resolve(rel) {
    rel = safeRel(String(rel || '').replace(/^\/+/, '') || 'index.html');
    if (!rel) return null;
    const tryRoot = (base) => { const f = path.join(base, rel); if (!path.resolve(f).startsWith(path.resolve(base) + path.sep)) return null; try { return fs.statSync(f).isFile() ? f : null; } catch (e) { return null; } };
    if (allowed(rel) && this.usingOverride()) { const f = tryRoot(this.cur); if (f) return f; }
    return tryRoot(this.root);
  }

  /* ---------- فحص GitHub ---------- */
  async _get(url, asJson) {
    const h = { 'User-Agent': 'AmanSystem-Updater', Accept: asJson ? 'application/vnd.github+json' : 'application/octet-stream' };
    if (this.token) h.Authorization = 'Bearer ' + this.token;
    const r = await this.fetch(url, { headers: h, redirect: 'follow' });
    return r;
  }
  async check(opts) {
    opts = opts || {};
    const cur = this.version();
    const base = { current: cur, shellApi: this.shellApi };
    if (!this.repo || /OWNER\//i.test(this.repo) || !/^[\w.-]+\/[\w.-]+$/.test(this.repo)) return { ...base, status: 'norepo', message: 'لم يُضبط مستودع GitHub للتحديثات بعد (ملف update-config.json)' };
    try {
      const r = await this._get(this.api + '/repos/' + this.repo + '/releases/latest', true);
      if (r.status === 404) { this.save({ lastCheck: Date.now() }); return { ...base, status: 'none', message: 'لا توجد إصدارات منشورة بعد' }; }
      if (r.status === 403 || r.status === 429) return { ...base, status: 'error', message: 'تعذر الفحص الآن (حدّ طلبات GitHub) — حاول لاحقًا' };
      if (!r.ok) return { ...base, status: 'error', message: 'خطأ من GitHub (' + r.status + ')' };
      const rel = await r.json();
      const ma = (rel.assets || []).find(a => a.name === 'update.json');
      if (!ma) return { ...base, status: 'error', message: 'الإصدار ' + rel.tag_name + ' لا يحتوي update.json' };
      const mr = await this._get(ma.browser_download_url, false);
      if (!mr.ok) return { ...base, status: 'error', message: 'تعذر قراءة update.json (' + mr.status + ')' };
      const m = await mr.json();
      if (!isVer(m.version) || !m.asset || !/^[0-9a-f]{64}$/i.test(m.sha256 || '')) return { ...base, status: 'error', message: 'ملف update.json غير صالح' };
      const aa = (rel.assets || []).find(a => a.name === m.asset);
      if (!aa) return { ...base, status: 'error', message: 'ملف التحديث ' + m.asset + ' غير موجود في الإصدار' };
      this.save({ lastCheck: Date.now() });
      const s = this.state();
      const res = { ...base, latest: m.version, notes: String(m.notes || rel.body || '').slice(0, 4000), date: m.date || rel.published_at || '', size: m.size || aa.size || 0,
        releaseUrl: rel.html_url || '', skipped: s.skip === m.version, bad: (s.bad || []).includes(m.version) };
      if (cmpVer(m.version, cur) <= 0) { this.last = null; return { ...res, status: 'uptodate' }; }
      if ((m.shellApi || 1) > this.shellApi) { this.last = null; return { ...res, status: 'needs-shell', message: 'هذا التحديث يحتاج تنصيب نسخة جديدة من البرنامج (ملف التثبيت من صفحة الإصدار)' }; }
      this.last = { manifest: m, url: aa.browser_download_url };
      return { ...res, status: 'available' };
    } catch (e) {
      return { ...base, status: 'error', message: 'تعذر الاتصال بـ GitHub: ' + (e && e.message || e) };
    }
  }

  /* ---------- تنزيل + تحقق + فك إلى staged ---------- */
  async stage() {
    if (!this.last) { const c = await this.check(); if (c.status !== 'available') throw new Error(c.message || 'لا يوجد تحديث متاح'); }
    const { manifest: m, url } = this.last;
    const r = await this._get(url, false);
    if (!r.ok) throw new Error('فشل تنزيل التحديث (' + r.status + ')');
    const total = +r.headers.get('content-length') || m.size || 0;
    const chunks = []; let got = 0;
    if (r.body && r.body.getReader) {
      const rd = r.body.getReader();
      for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(Buffer.from(value)); got += value.length; this.onProgress({ got, total, pct: total ? Math.min(99, Math.round(got * 100 / total)) : 0 }); }
    } else { const b = Buffer.from(await r.arrayBuffer()); chunks.push(b); got = b.length; }
    const buf = Buffer.concat(chunks);
    if (m.size && buf.length !== m.size) throw new Error('حجم الملف المنزَّل لا يطابق المتوقع');
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    if (sha !== String(m.sha256).toLowerCase()) throw new Error('فشل التحقق من سلامة الملف (sha256) — لم يُطبَّق التحديث');
    const tmp = this.staged + '.tmp';
    rmrf(tmp); rmrf(this.staged);
    try {
      extractTarGz(buf, tmp);
      const vj = readJson(path.join(tmp, 'version.json'));
      if (!fs.existsSync(path.join(tmp, 'index.html')) || !vj || vj.version !== m.version) throw new Error('محتوى التحديث غير مكتمل أو لا يطابق الإصدار');
      fs.renameSync(tmp, this.staged);
    } catch (e) { rmrf(tmp); throw e; }
    this.save({ staged: m.version, stagedNotes: String(m.notes || '').slice(0, 4000) });
    this.onProgress({ got, total, pct: 100 });
    return { version: m.version };
  }

  /* ---------- تفعيل المنزَّل ---------- */
  activate() {
    if (!fs.existsSync(path.join(this.staged, 'index.html'))) throw new Error('لا يوجد تحديث منزَّل');
    const vj = readJson(path.join(this.staged, 'version.json')) || {};
    rmrf(this.prev);
    const had = fs.existsSync(this.cur);
    if (had) fs.renameSync(this.cur, this.prev);
    try { fs.renameSync(this.staged, this.cur); }
    catch (e) { if (had) { try { fs.renameSync(this.prev, this.cur); } catch (x) { /* لا شيء */ } } throw e; }
    this.save({ version: vj.version, pending: true, staged: '', justUpdated: '', rolledBack: null, activeNotes: this.state().stagedNotes || '' });
    return vj.version;
  }
  /* ← رجوع للنسخة السابقة (أو للمثبَّتة لو لا توجد) */
  rollback(reason) {
    const s = this.state();
    rmrf(this.cur);
    if (fs.existsSync(this.prev)) { try { fs.renameSync(this.prev, this.cur); } catch (e) { rmrf(this.prev); } }
    const bad = Array.from(new Set([...(s.bad || []), s.version].filter(Boolean)));
    this.save({ pending: false, bad, rolledBack: { from: s.version || '', at: Date.now(), reason: reason || '' }, version: this.overrideVersion() || '' });
  }
  /* الواجهة اشتغلت بسلام */
  markOk() {
    const s = this.state();
    if (!s.pending) return false;
    rmrf(this.prev);
    this.save({ pending: false, justUpdated: s.version || '', justNotes: s.activeNotes || '' });
    return true;
  }
  ackJustUpdated() { if (this.state().justUpdated) this.save({ justUpdated: '', justNotes: '' }); }
  skip(v) { this.save({ skip: v || '' }); }
  setAuto(on) { this.save({ auto: !!on }); }
}

module.exports = { Updater, parseVer, cmpVer, isVer, extractTarGz, untar, safeRel, allowed };
