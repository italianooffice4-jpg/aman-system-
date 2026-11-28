// قارئ/كاتب ZIP بسيط (بدون مكتبات): تخزين بدون ضغط للكتابة، وقراءة stored/deflate. وحدة Node خالصة قابلة للاختبار.
// لا يدعم ZIP64: أي ملف أو أرشيف فوق ~4GB يُرفض بوضوح.
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const LIM = 0xFFFFFFFF - 1024;
const T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crcUpdate(c, buf) { c = ~c >>> 0; for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 255] ^ (c >>> 8); return ~c >>> 0; }
const crc32 = (buf) => crcUpdate(0, buf);
function dosTime(d) { return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }

class ZipWriter {
  constructor(file) { this.file = file; this.fd = fs.openSync(file, 'w'); this.off = 0; this.cd = []; }
  _w(buf) { fs.writeSync(this.fd, buf, 0, buf.length); this.off += buf.length; }
  _entry(name, size, crc, mtime, copy) {
    if (size > LIM || this.off > LIM) throw new Error('الملف أكبر من حد ZIP (4GB)');
    const nm = Buffer.from(String(name).replace(/\\/g, '/'), 'utf8'), dt = dosTime(mtime || new Date());
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8); h.writeUInt16LE(dt.t, 10); h.writeUInt16LE(dt.d, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(size, 18); h.writeUInt32LE(size, 22); h.writeUInt16LE(nm.length, 26); h.writeUInt16LE(0, 28);
    const at = this.off; this._w(h); this._w(nm); copy(); this.cd.push({ nm, crc, size, at, dt });
  }
  addBuffer(name, buf, mtime) { buf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf); this._entry(name, buf.length, crc32(buf), mtime, () => this._w(buf)); }
  addFile(name, src) {
    const st = fs.statSync(src), fd = fs.openSync(src, 'r'), chunk = Buffer.alloc(1 << 20);
    try {
      let crc = 0, n, total = 0;
      while ((n = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) { crc = crcUpdate(crc, chunk.subarray(0, n)); total += n; }
      if (total !== st.size) throw new Error('تغيّر حجم الملف أثناء القراءة: ' + src);
      this._entry(name, total, crc, st.mtime, () => {
        let pos = 0, got;
        while ((got = fs.readSync(fd, chunk, 0, chunk.length, pos)) > 0) { this._w(chunk.subarray(0, got)); pos += got; }
        if (pos !== total) throw new Error('تغيّر الملف أثناء النسخ: ' + src);
      });
    } finally { fs.closeSync(fd); }
  }
  finish() {
    const start = this.off;
    for (const e of this.cd) {
      const h = Buffer.alloc(46); h.writeUInt32LE(0x02014b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6); h.writeUInt16LE(0x0800, 8); h.writeUInt16LE(0, 10); h.writeUInt16LE(e.dt.t, 12); h.writeUInt16LE(e.dt.d, 14);
      h.writeUInt32LE(e.crc, 16); h.writeUInt32LE(e.size, 20); h.writeUInt32LE(e.size, 24); h.writeUInt16LE(e.nm.length, 28); h.writeUInt32LE(e.at, 42);
      this._w(h); this._w(e.nm);
    }
    const size = this.off - start, end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(this.cd.length, 8); end.writeUInt16LE(this.cd.length, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(start, 16);
    if (this.cd.length > 65534) throw new Error('عدد الملفات أكبر من حد ZIP');
    this._w(end); fs.fsyncSync(this.fd); fs.closeSync(this.fd); this.fd = null;
  }
  abort() { try { if (this.fd != null) fs.closeSync(this.fd); } catch (e) { /* لا شيء */ } try { fs.unlinkSync(this.file); } catch (e) { /* لا شيء */ } }
}

class ZipReader {
  constructor(file) {
    this.file = file; this.fd = fs.openSync(file, 'r'); const size = fs.fstatSync(this.fd).size;
    const tail = Buffer.alloc(Math.min(size, 65557)); fs.readSync(this.fd, tail, 0, tail.length, size - tail.length);
    let i = tail.length - 22; while (i >= 0 && tail.readUInt32LE(i) !== 0x06054b50) i--;
    if (i < 0) { this.close(); throw new Error('ليس ملف ZIP صالحًا'); }
    const n = tail.readUInt16LE(i + 10), cdSize = tail.readUInt32LE(i + 12), cdOff = tail.readUInt32LE(i + 16);
    if (cdOff === 0xFFFFFFFF || n === 0xFFFF) { this.close(); throw new Error('ZIP64 غير مدعوم'); }
    const cd = Buffer.alloc(cdSize); fs.readSync(this.fd, cd, 0, cdSize, cdOff);
    this.entries = []; let p = 0;
    for (let k = 0; k < n; k++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) { this.close(); throw new Error('فهرس ZIP تالف'); }
      const flag = cd.readUInt16LE(p + 8), method = cd.readUInt16LE(p + 10), crc = cd.readUInt32LE(p + 16), csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24);
      const nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32), at = cd.readUInt32LE(p + 42);
      this.entries.push({ name: cd.toString('utf8', p + 46, p + 46 + nl), method, crc, csize, usize, at, flag });
      p += 46 + nl + el + cl;
    }
  }
  find(name) { return this.entries.find((e) => e.name === name); }
  _raw(e) {
    const h = Buffer.alloc(30); fs.readSync(this.fd, h, 0, 30, e.at);
    if (h.readUInt32LE(0) !== 0x04034b50) throw new Error('رأس ملف تالف: ' + e.name);
    const start = e.at + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), raw = Buffer.alloc(e.csize); fs.readSync(this.fd, raw, 0, e.csize, start); return raw;
  }
  read(e) {
    if (typeof e === 'string') e = this.find(e); if (!e) return null;
    const raw = this._raw(e), out = e.method === 0 ? raw : e.method === 8 ? zlib.inflateRawSync(raw) : null;
    if (!out) throw new Error('طريقة ضغط غير مدعومة: ' + e.method);
    if (out.length !== e.usize || crc32(out) !== e.crc) throw new Error('فشل التحقق من سلامة: ' + e.name);
    return out;
  }
  close() { try { if (this.fd != null) fs.closeSync(this.fd); } catch (e) { /* لا شيء */ } this.fd = null; }
}
module.exports = { ZipWriter, ZipReader, crc32 };
