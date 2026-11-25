/* ======================================================================
   v13 (تجربة) — صفحة «الموظفون المؤمن عليهم» بواجهة Vue 3 + PrimeVue
   - لو ملف src/ui/aman-ui.js غير موجود أو حدث خطأ: تظهر الصفحة القديمة تلقائياً.
   - زر «الشكل القديم» / «جرّب الشكل الجديد» للتبديل في أي وقت.
   v14: نفس النمط للشاشة الرئيسية (R.dash) — مفتاح التبديل ins_ui_dash.
   ====================================================================== */
(function () {
  const legacy = R.emp;
  const on = () => { try { return localStorage.getItem('ins_ui_new') !== '0'; } catch (e) { return true; } };
  window.amanSwitchUI = (v) => { try { localStorage.setItem('ins_ui_new', v ? '1' : '0'); } catch (e) {} go('emp'); };

  let failed = 0;
  window.amanUIFail = () => {
    if (failed) return; failed = 1;
    setTimeout(() => {
      try { if (window.AmanUI) AmanUI.unmount(); } catch (e) {}
      const el = document.getElementById('vue-emp');
      if (el) { el.innerHTML = legacy(); }
      toast('تعذر تحميل الشكل الجديد، تم عرض الشكل القديم');
    }, 0);
  };

  const tryBtn = `<div style="text-align:left;margin:0 0 10px"><button class="btn s sm noprint" onclick="amanSwitchUI(true)">جرّب الشكل الجديد (تجريبي)</button></div>`;

  R.emp = function () {
    failed = 0;
    if (!window.AmanUI) return legacy.apply(this, arguments);   // الحزمة غير مبنية: الشكل القديم بدون أي تغيير
    try { AmanUI.unmount(); } catch (e) {}
    if (!on()) return tryBtn + legacy.apply(this, arguments);
    setTimeout(() => {
      const el = document.getElementById('vue-emp'); if (!el) return;
      try { AmanUI.mountEmp(el); } catch (e) { console.error(e); window.amanUIFail(); }
    }, 0);
    return '<div id="vue-emp"></div>';
  };

  // الدوال القديمة تستدعي rows() لإعادة الرسم: نوجّهها للواجهة الجديدة إذا كانت هي المعروضة
  const _rows = rows;
  rows = function () {
    if (window.AmanUI && AmanUI.active() && document.getElementById('vue-emp')) AmanUI.refresh();
    else _rows.apply(this, arguments);
  };
})();

/* ======================================================================
   v14 — الشاشة الرئيسية (لوحة التحكم) بواجهة Vue 3 + PrimeVue
   - نفس شبكة الأمان: لو الحزمة غير موجودة أو حدث خطأ وقت العرض تظهر اللوحة القديمة (v9) تلقائياً.
   - زر «الشكل القديم» / «جرّب الشكل الجديد» (ins_ui_dash).
   ====================================================================== */
(function () {
  const legacy = R.dash;
  const on = () => { try { return localStorage.getItem('ins_ui_dash') !== '0'; } catch (e) { return true; } };
  window.amanSwitchDash = (v) => { try { localStorage.setItem('ins_ui_dash', v ? '1' : '0'); } catch (e) {} go('dash'); };

  let failed = 0;
  window.amanDashFail = () => {
    if (failed) return; failed = 1;
    setTimeout(() => {
      try { if (window.AmanUI) AmanUI.unmount(); } catch (e) {}
      const el = document.getElementById('vue-dash');
      if (el) { el.innerHTML = legacy(); }
      toast('تعذر تحميل الشكل الجديد للشاشة الرئيسية، تم عرض الشكل القديم');
    }, 0);
  };

  const bar = (label, v) => `<div style="text-align:left;margin:0 0 10px"><button class="btn s sm noprint" onclick="amanSwitchDash(${v})">${label}</button></div>`;

  R.dash = function () {
    failed = 0;
    if (!window.AmanUI || !AmanUI.mountDash) return legacy.apply(this, arguments);   // الحزمة غير مبنية: الشكل القديم بدون أي تغيير
    try { AmanUI.unmount(); } catch (e) {}
    if (!on()) return bar('جرّب الشكل الجديد (تجريبي)', true) + legacy.apply(this, arguments);
    setTimeout(() => {
      const el = document.getElementById('vue-dash'); if (!el) return;
      try { AmanUI.mountDash(el); } catch (e) { console.error(e); window.amanDashFail(); }
    }, 0);
    return bar('الشكل القديم', false) + '<div id="vue-dash"></div>';
  };

  // عند مغادرة صفحة معروضة بـ Vue (الرئيسية/الموظفون) نفكّ التركيب حتى لا يبقى تطبيق يتيم في الذاكرة
  const _go = go;
  go = function (v) {
    if (v !== 'dash' && v !== 'emp' && window.AmanUI) { try { AmanUI.unmount(); } catch (e) {} }
    return _go.apply(this, arguments);
  };
})();

/* ======================================================================
   v15 المرحلة 3 — نموذج الموظف (EmpForm.vue) وملف الموظف (EmpFile.vue)
   تغليف editE / regQ / prof: لو الحزمة غير مبنية أو لم يجهز التطبيق العام أو حدث أي خطأ ← الدوال القديمة كما هي.
   المفاتيح: ins_ui_form (النموذج) و ins_ui_file (ملف الموظف) — '0' يعني الشكل القديم.
   ====================================================================== */
(function () {
  const L = window.amanLegacy = Object.assign(window.amanLegacy || {}, { editE: editE, regQ: regQ, prof: prof });
  const on = (k) => { try { return localStorage.getItem(k) !== '0'; } catch (e) { return true; } };
  const ready = (fn) => !!(window.AmanUI && typeof window.AmanUI[fn] === 'function' && window.AmanUI.hostReady && window.AmanUI.hostReady());
  window.amanSwitchEmpUI = (v) => { try { localStorage.setItem('ins_ui_form', v ? '1' : '0'); localStorage.setItem('ins_ui_file', v ? '1' : '0'); } catch (e) {} };

  editE = function (id) {
    if (on('ins_ui_form') && ready('openEmpForm')) {
      if (!S.companies.length) return toast('أضف شركة أولًا قبل إضافة الموظفين');
      try { window.AmanUI.openEmpForm(id || ''); return; } catch (e) { console.error(e); }
    }
    return L.editE.apply(this, arguments);
  };
  regQ = function (id) {
    if (on('ins_ui_form') && ready('openEmpForm')) {
      if (!S.companies.length) return toast('أضف شركة أولًا لتسجيل الموظف تأمينيًا عليها');
      try { window.AmanUI.openEmpForm('', { reqId: id }); return; } catch (e) { console.error(e); }
    }
    return L.regQ.apply(this, arguments);
  };
  prof = function (id) {
    if (on('ins_ui_file') && ready('openEmpFile') && S.emps.some((x) => x.id == id)) {
      try { window.AmanUI.openEmpFile(id); return; } catch (e) { console.error(e); }
    }
    return L.prof.apply(this, arguments);
  };
})();
