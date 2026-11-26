/* ======================================================================
   v15 (85) — تحميل كسول للاستمارات الحكومية
   بيانات الاستمارات (FSPEC/FIMG ≈ 490KB من أصل ≈ 700KB في index.html) لم تعد تُحمَّل عند بدء البرنامج؛
   تُجلب عند أول فتح لصفحة «استمارات التأمينات»، وتُجهَّز بهدوء بعد الدخول بوقت الخمول حتى تفتح أول مرة فورًا.
   لا علاقة لهذا الملف بحزمة Vue: يعمل حتى لو لم تُبنَ الحزمة.
   ====================================================================== */
(function () {
  const _frm = R.frm;
  R.frm = function () {
    if (typeof FSPEC !== 'undefined' && FSPEC) return _frm.apply(this, arguments);
    formsLoad()
      .then(() => { if (cur === 'frm') go('frm'); })
      .catch(() => toast('تعذر تحميل ملف الاستمارات (src/forms/forms-data.js)'));
    return "<div class=card><p class=mut>جارٍ تحميل الاستمارات…</p></div>";
  };

  const warm = () => { if (typeof FSPEC === 'undefined' || !FSPEC) formsLoad().catch(() => {}); };
  window.addEventListener('load', () => {
    const run = () => (window.requestIdleCallback ? requestIdleCallback(warm, { timeout: 10000 }) : setTimeout(warm, 4000));
    setTimeout(run, 3000);
  });
})();
