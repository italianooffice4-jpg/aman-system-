// (66) مراقبة مجلد الماسح: يرصد الملفات الجديدة (صور/PDF) التي تصل بعد بدء المراقبة، وينتظر استقرار حجمها (حتى يكتمل الكتابة) ثم يبلّغ مرة واحدة.
// لا يقرأ المحتوى ولا يعدّل شيئًا في المجلد، ولا يتتبع الروابط الرمزية، ولا ينزل للمجلدات الفرعية. وحدة نقية قابلة للاختبار بـ Node.
const fs = require('fs');
const path = require('path');

const EXT = /\.(jpe?g|png|bmp|webp|pdf)$/i;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.bmp': 'image/bmp', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const MAX_BYTES = 25 * 1024 * 1024;

const mimeOf = (name) => MIME[path.extname(name).toLowerCase()] || 'application/octet-stream';
// اسم ملف آمن داخل المجلد: بلا فواصل مسار ولا نقاط بادئة، وبامتداد مسموح
const safeName = (n) => typeof n === 'string' && n === path.basename(n) && !n.startsWith('.') && EXT.test(n) && !/[\0<>:"|?*]/.test(n);

function startWatch(dir, onFile, opt = {}) {
  const stableMs = opt.stableMs || 1200, maxWaitMs = opt.maxWaitMs || 30000, fsx = opt.fs || fs;
  const seen = new Set(), pending = new Map();
  let closed = false, w = null;
  const key = (n, st) => n + '|' + st.size + '|' + Math.round(st.mtimeMs);
  try { fsx.readdirSync(dir).forEach((n) => { try { seen.add(key(n, fsx.lstatSync(path.join(dir, n)))); } catch (e) { /* يتجاهل */ } }); } catch (e) { return { close() {}, error: e.message }; }

  const check = (n, t0, last) => {
    if (closed) return;
    let st; try { st = fsx.lstatSync(path.join(dir, n)); } catch (e) { pending.delete(n); return; }
    if (!st.isFile() || st.isSymbolicLink()) { pending.delete(n); return; }
    if (st.size <= 0 || st.size > MAX_BYTES) { if (Date.now() - t0 < maxWaitMs && st.size === 0) return retry(n, t0, last); pending.delete(n); return; }
    if (last && last.size === st.size && last.mtimeMs === st.mtimeMs) {
      pending.delete(n); const k = key(n, st); if (seen.has(k)) return; seen.add(k);
      try { onFile({ name: n, size: st.size, mtime: st.mtimeMs, type: mimeOf(n) }); } catch (e) { /* لا يوقف المراقبة */ }
      return;
    }
    if (Date.now() - t0 > maxWaitMs) { pending.delete(n); return; }
    retry(n, t0, st);
  };
  const retry = (n, t0, st) => { const id = setTimeout(() => check(n, t0, st), stableMs); if (id.unref) id.unref(); pending.set(n, id); };
  const onEvt = (_ev, name) => {
    if (closed || !name) return; name = String(name);
    if (!safeName(name) || pending.has(name)) return;
    retry(name, Date.now(), null);
  };
  try { w = fsx.watch(dir, { persistent: false }, onEvt); w.on('error', () => {}); } catch (e) { return { close() {}, error: e.message }; }
  return { close() { closed = true; try { w && w.close(); } catch (e) { /* لا شيء */ } pending.forEach((id) => clearTimeout(id)); pending.clear(); } };
}

/* قراءة ملف وارد بأمان: الاسم يجب أن يكون ملفًا مباشرًا في المجلد المراقب */
function readIncoming(dir, name) {
  if (!dir || !safeName(name)) return { err: 'اسم ملف غير مقبول' };
  const p = path.join(dir, name);
  let st; try { st = fs.lstatSync(p); } catch (e) { return { err: 'الملف لم يعد موجودًا' }; }
  if (!st.isFile() || st.isSymbolicLink()) return { err: 'ليس ملفًا عاديًا' };
  if (st.size > MAX_BYTES) return { err: 'الملف أكبر من 25MB' };
  return { name, type: mimeOf(name), size: st.size, data: 'data:' + mimeOf(name) + ';base64,' + fs.readFileSync(p).toString('base64') };
}
module.exports = { startWatch, readIncoming, safeName, mimeOf, MAX_BYTES };
