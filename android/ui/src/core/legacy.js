// واجهة موحّدة لمتغيرات ودوال البرنامج القديم (index.html). تُقرأ وقت الاستدعاء دائمًا لأن S قد يُستبدل (استرجاع/مزامنة).
// كل دالة تتحمل غياب المتغير (تعيد قيمة آمنة) حتى لا ينهار شيء لو تغيّر الأصل.
export const getS = () => (typeof S !== 'undefined' ? S : null);
export const emps = () => { const s = getS(); return s && Array.isArray(s.emps) ? s.emps : []; };
export const companies = () => { const s = getS(); return s && Array.isArray(s.companies) ? s.companies : []; };
export const norm = (x) => (typeof nz === 'function' ? nz(x) : String(x == null ? '' : x).toLowerCase().replace(/\s+/g, ' ').trim());
export const curPage = () => (typeof cur !== 'undefined' ? cur : '');
export const navGroups = () => (typeof NAV !== 'undefined' && Array.isArray(NAV) ? NAV : []);
export const navItems = () => { const o = []; navGroups().forEach(g => (g[1] || []).forEach(x => o.push({ id: x[0], icon: x[1], title: x[2], group: g[0] }))); return o; };
export const icon = (n, s) => (typeof ic === 'function' ? ic(n, s || 16) : '');
export const gotoPage = (id) => { if (typeof nv === 'function') nv(id); };
export const el = (id) => document.getElementById(id);
