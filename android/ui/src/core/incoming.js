// (66) ملفات تصل من مجلد الماسح (يراقبه الغلاف عبر scanwatch.js). تبقى في الذاكرة فقط حتى يضيفها المستخدم لموظف أو يتجاهلها.
import { ref } from 'vue';
export const incoming = ref([]);          // [{ name, size, type, at }]

export function onFile(f) {
  if (!f || !f.name) return;
  if (incoming.value.some((x) => x.name === f.name && x.size === f.size)) return;
  incoming.value = [...incoming.value, { name: f.name, size: f.size, type: f.type, at: Date.now() }].slice(-30);
  try { toast('وصل ملف جديد من الماسح: ' + f.name + ' — افتح «مستندات» موظف لإضافته'); } catch (e) { /* لا شيء */ }
}
export const dismiss = (name) => { incoming.value = incoming.value.filter((x) => x.name !== name); };

/* قراءة الملف من الغلاف وتحويله إلى File جاهز لـ addDocs */
export async function fileOf(name) {
  if (!(window.desk && desk.scanWatchRead)) throw new Error('غير متاح');
  const r = await desk.scanWatchRead(name);
  if (!r || r.err) throw new Error((r && r.err) || 'تعذر قراءة الملف');
  const blob = await (await fetch(r.data)).blob();
  return new File([blob], r.name, { type: r.type });
}
export function install() {
  if (window.desk && typeof desk.onScanFile === 'function') desk.onScanFile(onFile);
}
