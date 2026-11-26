// ربط الوحدات بالبرنامج القديم: تغليف (وليس تعديل) دوال index.html العامة. كل جزء معزول بـ try/catch،
// وأي دالة قديمة تعود لسلوكها الأصلي لو مكوّنات Vue العامة لم تُركَّب (host.ready=false).
import { installStore, onData } from './store.js';
import { applyPrefs, resolveStart, rememberPage, getViewMode, setViewMode } from './prefs.js';
import { notify, classify } from './notify.js';
import { advCount, advPredicate } from './search.js';
import { installShortcuts } from './shortcuts.js';
import { navItems, curPage } from './legacy.js';
import { host } from './host.js';
import { debounce } from './util.js';
import { install as installAlerts } from './alerts.js';
import { install as installAssist } from './assist.js';
import { install as installIncoming } from './incoming.js';

const safe = (name, fn) => { try { fn(); } catch (e) { console.error('[AmanUI] install:' + name, e); } };

/* شارة الجرس: كانت تتحدث عند التنقل فقط؛ الآن تتحدث أيضًا عند أي تغيّر في البيانات */
export function refreshBadge() {
  const b = document.getElementById('bell');
  if (!b || typeof alerts !== 'function' || typeof ic !== 'function') return;
  const n = alerts().length;
  b.innerHTML = ic('bell', 18) + (n ? `<span class=dot>${n}</span>` : '');
}

/* المجموعات الفارغة في القائمة الجانبية (كل عناصرها مخفية) تُخفى بعنوانها */
function tidyNav() {
  const nav = document.getElementById('nav'); if (!nav) return;
  const kids = [...nav.children];
  kids.forEach((h, i) => {
    if (h.tagName !== 'H6') return;
    let any = false;
    for (let j = i + 1; j < kids.length && kids[j].tagName !== 'H6'; j++) if (getComputedStyle(kids[j]).display !== 'none') { any = true; break; }
    h.style.display = any ? '' : 'none';
  });
}

/* لا نفقد التركيز في خانة بحث تُعاد رسم صفحتها كاملة عند كل تغيير (طلبات الدخول، المهام) */
const captureFocus = () => {
  const a = document.activeElement, v = document.getElementById('view');
  if (!a || a.tagName !== 'INPUT' || !v || !v.contains(a) || a.closest('#vue-emp,#vue-dash,#vue-set')) return null;
  return { ph: a.placeholder, id: a.id, s: a.selectionStart, e: a.selectionEnd };
};
const restoreFocus = (f) => {
  if (!f) return;
  const v = document.getElementById('view'); if (!v) return;
  const n = (f.id && v.querySelector('#' + CSS.escape(f.id))) || (f.ph ? [...v.querySelectorAll('input')].find(x => x.placeholder === f.ph) : null);
  if (n) { n.focus(); try { n.setSelectionRange(f.s, f.e); } catch (e) { /* أنواع لا تدعم التحديد */ } }
};

export function installAll() {
  safe('store', installStore);
  safe('prefs', applyPrefs);
  safe('shortcuts', installShortcuts);

  /* (51) Toast */
  safe('toast', () => {
    const _toast = window.toast;
    window.toast = function (m, ok) { if (host.ready) { notify(m, classify(m, ok)); return; } return _toast.apply(this, arguments); };
    window.alert = function (m) { if (host.ready) notify(m, 'warn', { duration: 8000 }); else console.warn('[alert]', m); };
  });

  /* (52) الجرس، و(46/48) البحث السريع: نفس الأزرار والاختصارات القديمة تفتح الواجهة الجديدة */
  safe('bell+search', () => {
    const _bell = window.bellM, _gs = window.gs;
    window.bellM = function () { if (host.ready) return host.toggleBell(); return _bell.apply(this, arguments); };
    window.gs = function () { if (host.ready) return host.openSearch(); return _gs.apply(this, arguments); };
  });

  /* (47) الفلاتر المركبة: EL() هي مصدر قائمة الموظفين للجدول والطباعة والتعيين الجماعي */
  safe('adv-filter', () => {
    const _EL = window.EL;
    window.EL = function () { const l = _EL.apply(this, arguments); return advCount() ? l.filter(advPredicate) : l; };
  });

  /* (21) شاشة البداية: أول go('dash') بعد الدخول يتحول للصفحة المختارة بدون وميض */
  safe('start-page', () => {
    const _enter = window.enter;
    window.enter = function () {
      const want = resolveStart(navItems().map(x => x.id));
      if (want !== 'dash') {
        const g0 = window.go;
        const tmp = function (v) { window.go = g0; return g0.apply(this, [v === 'dash' ? want : v].concat([].slice.call(arguments, 1))); };
        window.go = tmp;
        setTimeout(() => { if (window.go === tmp) window.go = g0; }, 0);
      }
      return _enter.apply(this, arguments);
    };
  });

  /* (29) مرشح «بدون تاريخ التحاق» لقائمة الملفات التي تحتاج مراجعة (EL() تقرأ XF2[flt.x]) */
  safe('review-filters', () => {
    if (typeof XF2 !== 'undefined' && !XF2.nostart) XF2.nostart = (e) => !e.start;
    if (typeof XL !== 'undefined' && !XL.nostart) XL.nostart = 'بدون تاريخ التحاق';
  });

  /* (33) الملخص اليومي: بعد الدخول (أو استعادة الجلسة) مرة واحدة في اليوم */
  safe('daily-summary', () => {
    const _enter = window.enter;
    window.enter = function () {
      const r = _enter.apply(this, arguments);
      setTimeout(() => { try { if (host.ready) host.maybeSummary(); } catch (e) { console.error('[AmanUI]', e); } }, 900);
      return r;
    };
  });

  /* (20) طرق العرض المفضلة: نطبّق المحفوظ عند البدء ونسجّل أي تغيير بعد كل تنقل */
  safe('view-modes', () => {
    if (typeof qm !== 'undefined') { const v = getViewMode('req'); if (v) qm = v; }
    if (typeof cm !== 'undefined') { const v = getViewMode('cars'); if (v) cm = v; }
  });

  /* go(): تنظيف القائمة، تذكّر الصفحة، تسجيل طرق العرض، استعادة التركيز */
  safe('go', () => {
    const _go = window.go;
    window.go = function (v) {
      const f = v === curPage() ? captureFocus() : null;
      const r = _go.apply(this, arguments);
      safe('go-post', () => {
        rememberPage(v);
        if (v === 'req' && typeof qm !== 'undefined') setViewMode('req', qm);
        if (v === 'cars' && typeof cm !== 'undefined') setViewMode('cars', cm);
        tidyNav(); restoreFocus(f);
      });
      return r;
    };
  });

  /* (14/15/16/17/21) بطاقات الإعدادات الجديدة تُركَّب داخل صفحة الإعدادات القديمة */
  safe('settings', () => {
    const _set = R.set;
    R.set = function () {
      const h = _set.apply(this, arguments);
      if (!window.AmanUI || !window.AmanUI.mountSettings) return h;
      setTimeout(() => { const el = document.getElementById('vue-set'); if (el) { try { window.AmanUI.mountSettings(el); } catch (e) { console.error('[AmanUI]', e); } } }, 0);
      const i = h.lastIndexOf('</div>');
      return i < 0 ? h : h.slice(0, i) + '<div id="vue-set" style="grid-column:1/-1"></div>' + h.slice(i);
    };
  });

  /* (46) بحث فوري في الصفحات التي كانت تنتظر Enter/الخروج من الحقل (طلبات الدخول، المهام) */
  safe('instant-search', () => {
    const fire = debounce((t) => { if (document.body.contains(t)) t.dispatchEvent(new Event('change', { bubbles: true })); }, 280);
    document.addEventListener('input', (e) => {
      const t = e.target;
      if (!t || t.tagName !== 'INPUT' || !t.closest || !t.closest('#view')) return;
      const oc = t.getAttribute('onchange') || '';
      if (/^(sq|tfq)\(/.test(oc)) fire(t);
    });
  });

  /* (53–61) محرك التنبيهات الجديد: يغلّف alerts() وaGo() ويضيف مرشحات صفحة الموظفين */
  safe('alerts', installAlerts);
  safe('incoming', installIncoming);    // (66) ملفات مجلد الماسح
  safe('assist', installAssist);        // (68/69) أسئلة مركبة + تدقيق التناقضات

  /* (1) S تفاعلية: أي حفظ يحدّث الصفحة المعروضة (Vue) والشارة تلقائيًا */
  safe('reactive', () => {
    onData(() => {
      if (window.AmanUI && window.AmanUI.active && window.AmanUI.active()) window.AmanUI.refresh();
      refreshBadge();
    });
  });
}
