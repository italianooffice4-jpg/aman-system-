// نقطة الدخول: تُعرّف window.AmanUI التي يستخدمها src/merge/aman-v13-ui.js
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import EmpPage from './EmpPage.vue';
import DashPage from './DashPage.vue';
import SettingsExtra from './SettingsExtra.vue';
import CompPage from './CompPage.vue';
import ReqPage from './ReqPage.vue';
import FinPage from './FinPage.vue';
import LogPage from './LogPage.vue';
import GlobalHost from './GlobalHost.vue';
import { installAll } from './core/install.js';
import { host } from './core/host.js';
import * as store from './core/store.js';
import * as prefs from './core/prefs.js';
import * as notify from './core/notify.js';
import * as search from './core/search.js';
import * as shortcuts from './core/shortcuts.js';
import './style.css';

// لون الواجهة الأساسي = البنفسجي الحالي للبرنامج (#714b67)
const Plum = definePreset(Aura, { semantic: { primary: {"50": "#f4f1f3", "100": "#e5dfe4", "200": "#cfc2cb", "300": "#b5a1b0", "400": "#967a8f", "500": "#714b67", "600": "#63425b", "700": "#51364a", "800": "#3f2a3a", "900": "#2f202b", "950": "#20151d"} } });

const ar = {
  emptyMessage: 'لا توجد نتائج',
  emptyFilterMessage: 'لا توجد نتائج',
  search: 'بحث', clear: 'مسح', apply: 'تطبيق', cancel: 'إلغاء',
  aria: { navigation: 'التنقل', previousPageLabel: 'الصفحة السابقة', nextPageLabel: 'الصفحة التالية', firstPageLabel: 'الصفحة الأولى', lastPageLabel: 'الصفحة الأخيرة', rowsPerPageLabel: 'عدد الصفوف' }
};

let app = null, vm = null;

function unmount() {
  if (app) { try { app.unmount(); } catch (e) {} }
  app = null; vm = null;
}

// تركيب صفحة واحدة في الوقت نفسه؛ عند أي خطأ وقت العرض يُستدعى معالج الرجوع للشكل القديم الخاص بها
function mount(comp, el, failName) {
  unmount();
  app = createApp(comp);
  app.config.errorHandler = (err) => { console.error('[AmanUI]', err); if (typeof window[failName] === 'function') window[failName](); };
  app.use(PrimeVue, { theme: { preset: Plum, options: { darkModeSelector: '[data-theme="dark"]' } }, locale: ar });
  vm = app.mount(el);
}
const mountEmp = (el) => mount(EmpPage, el, 'amanUIFail');
const mountDash = (el) => mount(DashPage, el, 'amanDashFail');
const mountSettings = (el) => mount(SettingsExtra, el, 'amanSetFail');
// المرحلة 4 (13): الشركات، طلبات الدخول، التقارير المالية، السجل. معالج الفشل لكل صفحة يعيد الشكل القديم (انظر aman-v13-ui.js)
const mountComp = (el) => mount(CompPage, el, 'amanCompFail');
const mountReq = (el) => mount(ReqPage, el, 'amanReqFail');
const mountFin = (el) => mount(FinPage, el, 'amanFinFail');
const mountLog = (el) => mount(LogPage, el, 'amanLogFail');
// لو فشلت بطاقات الإعدادات الجديدة تُترك الإعدادات القديمة كما هي
window.amanSetFail = () => { unmount(); const el = document.getElementById('vue-set'); if (el) el.innerHTML = ''; };

// تطبيق Vue عام ودائم (إشعارات، جرس، بحث سريع، اختصارات) خارج #view
let gapp = null;
function mountGlobal() {
  if (gapp) return;
  let el = document.getElementById('aman-global');
  if (!el) { el = document.createElement('div'); el.id = 'aman-global'; document.body.appendChild(el); }
  try {
    gapp = createApp(GlobalHost);
    gapp.config.errorHandler = (err) => { console.error('[AmanUI] global', err); host.ready = false; };
    gapp.mount(el);
  } catch (e) { console.error('[AmanUI] global mount', e); gapp = null; host.ready = false; }
}

window.AmanUI = {
  mountEmp, mountDash, mountSettings, mountComp, mountReq, mountFin, mountLog, mountGlobal, unmount,
  hostReady: () => !!host.ready,
  openEmpForm: (id, o) => { if (!host.openEmpForm) throw new Error('empform host not ready'); host.openEmpForm(id, o); },
  openEmpFile: (id, tab) => { if (!host.openEmpFile) throw new Error('empfile host not ready'); host.openEmpFile(id, tab); },
  refresh: () => { if (vm && vm.refresh) vm.refresh(); },
  active: () => !!app
};
window.AmanCore = { store, prefs, notify, search, shortcuts, host };   // للفحص والاختبار من وحدة التحكم

installAll();    // تغليف الدوال القديمة (toast، الجرس، البحث، EL، الدخول…) — كل جزء معزول ويعود للأصل عند الفشل
// تركيب التطبيق العام (إشعارات/جرس/بحث) يُؤجَّل لما بعد أول رسم لشاشة الدخول: بناء ثيم PrimeVue ثقيل ويجمّد الشعار.
// حتى يجهز تعمل الدوال القديمة (toast…) تلقائيًا لأن host.ready يكون false.
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
const startGlobal = () => { try { mountGlobal(); } catch (e) { console.error(e); } };
if (document.readyState === 'complete') idle(startGlobal, { timeout: 1500 });
else window.addEventListener('load', () => idle(startGlobal, { timeout: 1500 }), { once: true });
