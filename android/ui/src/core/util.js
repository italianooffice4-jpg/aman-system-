// أدوات صغيرة مشتركة — بدون أي اعتماد على Vue (حتى يمكن اختبارها مباشرة).
export function createBus() {
  const fns = new Set();
  return {
    on(fn) { fns.add(fn); return () => fns.delete(fn); },
    emit(...a) { fns.forEach(f => { try { f(...a); } catch (e) { console.error('[AmanUI]', e); } }); }
  };
}
export const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
export function debounce(fn, ms) {
  let t = 0;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.cancel = () => clearTimeout(t);
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}
export const typing = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.isContentEditable);
export const isHex = (s) => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);
