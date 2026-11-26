// (84) اختصارات لوحة المفاتيح. نستخدم e.code (موضع المفتاح الفعلي) فتعمل مع لوحة المفاتيح العربية.
// لا تعمل أثناء الكتابة داخل حقل، ولا على شاشة الدخول.
import { createBus, typing } from './util.js';
import { navItems, curPage } from './legacy.js';
import { host } from './host.js';

export const GO_KEYS = { KeyD: 'dash', KeyE: 'emp', KeyC: 'comp', KeyQ: 'req', KeyM: 'rec', KeyF: 'fin', KeyL: 'log', KeyS: 'set', KeyT: 'asst', KeyA: 'cars', KeyP: 'frm' };
export const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'البحث السريع (موظفون، شركات، صفحات)' },
  { keys: ['/'], desc: 'التركيز على خانة البحث في الصفحة الحالية' },
  { keys: ['N'], desc: 'إضافة جديد في الصفحة الحالية (موظف / شركة / طلب / مهمة / سيارة)' },
  { keys: ['G', 'ثم D'], desc: 'الذهاب إلى لوحة التحكم' },
  { keys: ['G', 'ثم E'], desc: 'الذهاب إلى الموظفين المؤمن عليهم' },
  { keys: ['G', 'ثم C'], desc: 'الذهاب إلى الشركات' },
  { keys: ['G', 'ثم Q'], desc: 'الذهاب إلى طلبات الدخول' },
  { keys: ['G', 'ثم M'], desc: 'الذهاب إلى مطابقة كشوف المرتبات' },
  { keys: ['G', 'ثم F'], desc: 'الذهاب إلى التقارير المالية' },
  { keys: ['G', 'ثم P'], desc: 'الذهاب إلى استمارات التأمينات' },
  { keys: ['G', 'ثم T'], desc: 'الذهاب إلى المهام' },
  { keys: ['G', 'ثم A'], desc: 'الذهاب إلى السيارات' },
  { keys: ['G', 'ثم L'], desc: 'الذهاب إلى سجل العمليات' },
  { keys: ['G', 'ثم S'], desc: 'الذهاب إلى الإعدادات' },
  { keys: ['Ctrl', 'S'], desc: 'حفظ النافذة المفتوحة (زر «حفظ»)' },
  { keys: ['Alt', 'T'], desc: 'تبديل الوضع الفاتح / الداكن' },
  { keys: ['Alt', 'B'], desc: 'فتح التنبيهات والإشعارات' },
  { keys: ['Esc'], desc: 'إغلاق النافذة أو اللوحة المفتوحة' },
  { keys: ['?'], desc: 'عرض هذه القائمة' }
];

/* زر «جديد» لكل صفحة: دوال البرنامج القديم نفسها التي تستدعيها أزرار الشريط العلوي */
function newItem() {
  const p = curPage();
  const map = { emp: () => editE(), comp: () => editC(), req: () => editQ(), asst: () => editT(), cars: () => editCar() };
  const fn = map[p];
  if (!fn) return false;
  try { fn(); return true; } catch (e) { return false; }
}
function focusSearch() {
  const root = document.getElementById('view');
  if (!root) return false;
  const q = [...root.querySelectorAll('input')].find(i => !i.disabled && i.type !== 'file' && i.type !== 'checkbox' && i.type !== 'hidden' && i.offsetParent !== null && /بحث|search/i.test(i.placeholder || ''));
  if (!q) return false;
  q.focus(); q.select && q.select();
  return true;
}

const bus = createBus();
export const onSeq = (fn) => bus.on(fn);
let seqTimer = 0, seqOn = false;
const endSeq = () => { clearTimeout(seqTimer); if (seqOn) { seqOn = false; bus.emit(false); } };

const blocked = () => document.body.classList.contains('lo');
const modalOpen = () => { const m = document.getElementById('modal'); return !!(m && m.classList.contains('on')) || !!document.querySelector('.ef-ov'); };
let installed = false;

export function onKey(e) {
  if (e.defaultPrevented || blocked()) return;
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.code === 'KeyS' && modalOpen()) {              // يعمل حتى داخل الحقول
    const ok = document.querySelector('.ef-ov [data-ef-save]') || document.getElementById('ok');
    if (ok) { e.preventDefault(); ok.click(); }
    return;
  }
  if (e.altKey && !ctrl && e.code === 'KeyT') { e.preventDefault(); if (typeof th === 'function') th(); return; }
  if (e.altKey && !ctrl && e.code === 'KeyB') { e.preventDefault(); host.toggleBell(); return; }
  if (ctrl || e.altKey) return;
  if (typing(e.target) || typing(document.activeElement)) return;

  if (seqOn) {                                                  // الحرف الثاني بعد G
    const id = GO_KEYS[e.code];
    endSeq();
    if (id && navItems().some(x => x.id === id)) { e.preventDefault(); if (typeof nv === 'function') nv(id); }
    return;
  }
  if (e.code === 'KeyG' && !e.shiftKey) {
    e.preventDefault(); seqOn = true; bus.emit(true);
    seqTimer = setTimeout(endSeq, 1500);
    return;
  }
  if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) { e.preventDefault(); host.openHelp(); return; }
  if (e.code === 'Slash' && !e.shiftKey) { if (focusSearch()) e.preventDefault(); return; }
  if (e.code === 'KeyN' && !e.shiftKey && !modalOpen()) { if (newItem()) e.preventDefault(); return; }
}

export function installShortcuts() {
  if (installed) return; installed = true;
  document.addEventListener('keydown', onKey);
}
