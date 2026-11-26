// (51) Toast بدل الرسالة الواحدة/alert، و(52) سجل الإشعارات الذي يعرضه الجرس.
// الحالة في الذاكرة فقط (لا تخزين). الواجهة (ToastStack.vue / BellPanel.vue) تشترك بالأحداث.
import { createBus } from './util.js';

const DUR = { success: 3500, info: 4500, warn: 6500, error: 9000 };
const MAX_ACTIVE = 4, MAX_HISTORY = 40;

const toastBus = createBus(), histBus = createBus();
let seq = 0;
let active = [];       // { id, msg, type, count, sticky, action, t, dur, left, timer, since }
let history = [];      // { id, msg, type, at, count, read }

const snapshot = () => active.map(({ timer, ...r }) => r);

/* تصنيف الرسائل القديمة toast(msg, ok): ok ⇒ نجاح؛ وإلا خطأ لو الصياغة فشل/تعذّر، وإلا تنبيه */
export function classify(msg, ok) {
  if (ok) return 'success';
  const s = String(msg || '');
  if (/^(لم يتم|تعذر|تعذّر|فشل|خطأ|حدث خطأ)|فشل|خطأ/.test(s)) return 'error';
  return 'warn';
}

function arm(t) {
  clearTimeout(t.timer);
  if (t.sticky) return;
  t.since = Date.now();
  t.timer = setTimeout(() => dismiss(t.id), t.left);
}

export function notify(msg, type, opts) {
  opts = opts || {};
  type = DUR[type] ? type : 'info';
  msg = String(msg == null ? '' : msg);
  if (!msg) return 0;
  const now = Date.now();

  // نفس الرسالة تتكرر خلال لحظات (ضغط متكرر مثلًا): نزيد العدّاد بدل ما نكدّس نسخًا
  const dup = active.find(t => t.msg === msg && t.type === type);
  if (dup && !opts.action) {
    dup.count++; dup.t = now; dup.left = dup.dur; arm(dup);
    const h = history.find(x => x.id === dup.hid); if (h) { h.count = dup.count; h.at = now; }
    toastBus.emit(snapshot()); histBus.emit(getHistory());
    return dup.id;
  }

  const id = ++seq;
  const dur = opts.duration || DUR[type];
  const t = { id, hid: id, msg, type, count: 1, sticky: !!opts.sticky, action: opts.action || null, t: now, dur, left: dur, timer: 0, since: 0 };
  active.push(t);
  while (active.length > MAX_ACTIVE) { const o = active.shift(); clearTimeout(o.timer); }
  arm(t);
  history.unshift({ id, msg, type, at: now, count: 1, read: false });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  toastBus.emit(snapshot()); histBus.emit(getHistory());
  return id;
}

export function dismiss(id) {
  const i = active.findIndex(t => t.id === id); if (i < 0) return;
  clearTimeout(active[i].timer); active.splice(i, 1);
  toastBus.emit(snapshot());
}
export function pause(id) {                 // الماوس فوق الرسالة: نوقف العدّ
  const t = active.find(x => x.id === id); if (!t || t.sticky || !t.timer) return;
  clearTimeout(t.timer); t.timer = 0; t.left = Math.max(1200, t.left - (Date.now() - t.since));
}
export function resume(id) { const t = active.find(x => x.id === id); if (t && !t.sticky && !t.timer) arm(t); }
export function runAction(id) {
  const t = active.find(x => x.id === id); if (!t || !t.action) return;
  try { t.action.fn(); } catch (e) { console.error('[AmanUI]', e); }
  dismiss(id);
}

export const getToasts = () => snapshot();
export const onToasts = (fn) => toastBus.on(fn);
export const getHistory = () => history.map(h => ({ ...h }));
export const onHistory = (fn) => histBus.on(fn);
export const unreadCount = () => history.filter(h => !h.read).length;
export function markAllRead() { if (!history.some(h => !h.read)) return; history.forEach(h => { h.read = true; }); histBus.emit(getHistory()); }
export function clearHistory() { history = []; histBus.emit(getHistory()); }

/* للاختبار فقط */
export function _reset() { active.forEach(t => clearTimeout(t.timer)); active = []; history = []; seq = 0; }
