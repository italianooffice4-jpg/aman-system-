// المرحلة 5 — منطق معرض المستندات (62–65) بلا Vue. نفس التخزين القديم: e.docs[] (بيانات وصفية) + IndexedDB ins_docs (المحتوى) عبر dbx/addDocs القديمتين.
// لا حقول جديدة على المستند؛ الترتيب = ترتيب المصفوفة e.docs نفسها (64)، والأحدث = الأبعد في المصفوفة (65).
export const MAX = 8e6;                                   // نفس حد addDocs القديمة (8MB)
export const KINDS = ['التحاق', 'استقالة', 'بطاقة الرقم القومي', 'أخرى'];
export const okType = (f) => /^image\//.test(f.type || '') || f.type === 'application/pdf' || /\.(jpe?g|png|gif|bmp|webp|pdf)$/i.test(f.name || '');
export const isImg = (d) => /^image\//.test(d.type || '') || /\.(jpe?g|png|gif|bmp|webp)$/i.test(d.name || '');
export const isPdf = (d) => d.type === 'application/pdf' || /\.pdf$/i.test(d.name || '');

const emp = (id) => S.emps.find((x) => x.id == id) || null;
export const listOf = (id) => { const e = emp(id); return e ? (e.docs || []).slice() : []; };

/* (62) رفع ملفات من السحب/الاختيار: يصفّي النوع والحجم ويُرجع ما قُبل وما رُفض مع السبب */
export function screen(files) {
  const ok = [], bad = [];
  [...files].forEach((f) => {
    if (!okType(f)) bad.push({ name: f.name, why: 'نوع غير مدعوم (صور أو PDF فقط)' });
    else if (f.size > MAX) bad.push({ name: f.name, why: 'أكبر من 8MB' });
    else if (!f.size) bad.push({ name: f.name, why: 'ملف فارغ' });
    else ok.push(f);
  });
  return { ok, bad };
}
export async function upload(id, files, kind) {
  const e = emp(id); if (!e) return { added: 0, bad: [{ name: '', why: 'الموظف غير موجود' }] };
  const { ok, bad } = screen(files);
  if (!ok.length) return { added: 0, bad };
  const before = (e.docs || []).length;
  await addDocs(e, ok, kind || 'أخرى');
  const added = (e.docs || []).length - before;
  if (added) { lg('رفع مستندات', e.name + ' (' + added + ')', e.id); save(); }
  return { added, bad };
}

/* (64) إعادة الترتيب: ينقل fromId إلى موضع toId داخل e.docs. يعيد true لو تغيّر الترتيب */
export function reorder(id, fromId, toId) {
  const e = emp(id); if (!e || !e.docs || fromId === toId) return false;
  const a = e.docs.findIndex((d) => d.id == fromId), b = e.docs.findIndex((d) => d.id == toId);
  if (a < 0 || b < 0) return false;
  const [m] = e.docs.splice(a, 1); e.docs.splice(b, 0, m);
  lg('ترتيب المستندات', e.name, e.id); save();
  return true;
}
export function setKind(id, docId, kind) {
  const e = emp(id), d = e && (e.docs || []).find((x) => x.id == docId);
  if (!d || d.kind === kind) return false;
  d.kind = kind; lg('تغيير نوع مستند', e.name + ': ' + d.name + ' ← ' + kind, e.id); save(); return true;
}
export async function remove(id, docId) {
  const e = emp(id); if (!e) return false;
  const d = (e.docs || []).find((x) => x.id == docId); if (!d) return false;
  e.docs = e.docs.filter((x) => x.id != docId);
  try { await dbx('delete', docId); } catch (x) { /* المحتوى قد يكون غير موجود أصلًا */ }
  lg('حذف مستند', e.name + ': ' + d.name, e.id); save(); return true;
}

/* محتوى المستند: {name,type,data(dataURL)} — null لو غير موجود */
export async function blobOf(docId) { try { return (await dbx('get', docId)) || null; } catch (e) { return null; } }
export function objectUrl(rec) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(rec.data || ''); if (!m) return rec.data || '';
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([u], { type: m[1] || rec.type || 'application/octet-stream' }));
}

/* مصغّرات الصور (تُنشأ عند الحاجة وتُخزَّن في الذاكرة فقط) */
const TH = new Map();
export async function thumbOf(d, w = 240) {
  if (TH.has(d.id)) return TH.get(d.id);
  if (!isImg(d)) { TH.set(d.id, ''); return ''; }
  const rec = await blobOf(d.id); if (!rec) return '';
  const t = await new Promise((res) => {
    const im = new Image();
    im.onload = () => { const k = Math.min(1, w / im.width), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72)); };
    im.onerror = () => res(''); im.src = rec.data;
  });
  TH.set(d.id, t); return t;
}
export const dropThumb = (id) => TH.delete(id);

/* (65) المقارنة: المرشحون = مستندات من نفس النوع (الأحدث = الأبعد في المصفوفة). يعيد أحدث زوج قابل للمقارنة أو null */
export function comparablePairs(id) {
  const g = {};
  listOf(id).forEach((d) => { (g[d.kind || 'أخرى'] = g[d.kind || 'أخرى'] || []).push(d); });
  return Object.keys(g).filter((k) => g[k].length >= 2).map((k) => ({ kind: k, older: g[k][g[k].length - 2], newer: g[k][g[k].length - 1] }));
}
export const fmtSize = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');
