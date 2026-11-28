// أندرويد: ملفات التنزيل (نسخة احتياطية / Excel / تقارير) لا تعمل في WebView،
// فنحفظها مؤقتاً ثم نفتح قائمة المشاركة/الحفظ.
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};
  var orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var a = this;
    if (a.hasAttribute('download') && /^(blob:|data:)/.test(a.href) && P.Filesystem && P.Share) {
      saveShare(a.href, a.getAttribute('download') || 'file');
      return;
    }
    return orig.apply(this, arguments);
  };
  async function saveShare(href, name) {
    try {
      var blob = await (await fetch(href)).blob();
      var b64 = await new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function () { res(String(r.result).split(',')[1]); };
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      name = name.replace(/[\\\/:*?"<>|]/g, '_');
      var w = await P.Filesystem.writeFile({ path: name, data: b64, directory: 'CACHE' });
      await P.Share.share({ title: name, url: w.uri, dialogTitle: 'حفظ / مشاركة الملف' });
    } catch (e) {
      if (e && /cancel/i.test(String(e.message || e))) return;
      alert('تعذر حفظ الملف: ' + (e && e.message || e));
    }
  }
})();

// ===== زرار الرجوع في الهاتف =====
// بدل ما يخرج من البرنامج: (1) يقفل أي نافذة/درج/قائمة جانبية مفتوحة، (2) يرجع للشاشة السابقة،
// (3) من الرئيسية يطلب ضغطتين متتاليتين للخروج. على شاشة الدخول/القفل يصغّر البرنامج فقط.
(function () {
  var C = window.Capacitor, A = C && C.Plugins && C.Plugins.App;
  if (!A || !A.addListener) return;
  var stack = [], going = false, lastExit = 0;
  function vis(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetWidth > 0 || el.offsetHeight > 0 || cs.position === 'fixed');
  }
  function curPage() { try { return typeof cur !== 'undefined' ? cur : null; } catch (e) { return null; } }
  function install() {
    if (typeof window.go !== 'function' || window.go.__amanBack) return;
    var orig = window.go;
    var w = function (v) {
      var prev = curPage();
      if (!going && prev && v !== prev) { stack.push(prev); if (stack.length > 30) stack.shift(); }
      return orig.apply(this, arguments);
    };
    w.__amanBack = true;
    window.go = w;
  }
  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  var OVERLAYS = '.dv-modal, .ef-ov, .at-bell, .p-dialog-mask, [role="dialog"]';
  function shown(el) { return !!el && getComputedStyle(el).display !== 'none'; }
  function openOverlay() {
    var m = document.querySelector('#modal.on, #drawer.on');
    if (m) return m;
    var list = document.querySelectorAll(OVERLAYS);
    for (var i = list.length - 1; i >= 0; i--) if (list[i].id !== 'aman-lock' && vis(list[i])) return list[i];
    return null;
  }
  function esc() {
    var ev = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
    (document.activeElement || document).dispatchEvent(new KeyboardEvent('keydown', ev));
    document.dispatchEvent(new KeyboardEvent('keydown', ev));
  }
  function onBack() {
    install();
    // شاشة الدخول أو القفل: لا نرجع للخلف ولا نخرج، نصغّر فقط
    var lock = document.getElementById('aman-lock') || document.documentElement.getAttribute('data-locked') === '1', login = document.getElementById('login');
    if (lock || shown(login)) { if (A.minimizeApp) A.minimizeApp(); else if (A.exitApp) A.exitApp(); return; }
    // نافذة / درج مفتوح
    var ov = openOverlay();
    if (ov) {
      esc();
      setTimeout(function () {
        var still = openOverlay();
        if (still) { var b = still.querySelector('.p-dialog-close-button, [aria-label="Close"], [aria-label="إغلاق"], .x, .close'); if (b) b.click(); }
      }, 120);
      return;
    }
    // قائمة جانبية (موبايل)
    var side = document.getElementById('side');
    if (side && side.classList.contains('show')) { side.classList.remove('show'); document.body.classList.remove('sbo'); return; }
    // الرجوع للشاشة السابقة
    var page = curPage();
    if (typeof window.go === 'function') {
      if (stack.length) { var p = stack.pop(); going = true; try { window.go(p); } finally { going = false; } return; }
      if (page && page !== 'dash') { going = true; try { window.go('dash'); } finally { going = false; } return; }
    }
    // الرئيسية: ضغطتان للخروج
    var now = Date.now();
    if (now - lastExit < 2000) { if (A.exitApp) A.exitApp(); return; }
    lastExit = now;
    if (typeof window.toast === 'function') window.toast('اضغط رجوع مرة أخرى للخروج');
  }
  window.__amanBack = onBack;
  A.addListener('backButton', onBack);
})();
