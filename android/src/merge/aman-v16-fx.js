/* ==========================================================================
   Aman v16 — تأثيرات الواجهة
   1) شاشة الدخول المتحركة   2) شريط الإجراءات السريعة (Dock) في الشاشة الرئيسية
   3) زر الرفع               4) زر الحذف
   - ملف مستقل (لا يحتاج إعادة بناء Vue): يغلّف showLogin ويراقب الـ DOM.
   - لا يغيّر أي منطق في البرنامج: الدخول/التسجيل/الحذف/الرفع تعمل بنفس الدوال القديمة.
   - للإيقاف الكامل: localStorage.setItem('ins_ui_fx','0') ثم إعادة تحميل (Ctrl+R).
   ========================================================================== */
(function () {
  'use strict';
  try { if (localStorage.getItem('ins_ui_fx') === '0') return; } catch (e) {}

  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (id) => document.getElementById(id);
  const safe = (f, d) => { try { return f(); } catch (e) { return d; } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ======================================================================
     1) تسجيل الدخول
     ====================================================================== */
  (function loginFx() {
    const orig = window.showLogin;
    if (typeof orig !== 'function') return;
    let busy = false, cur = null;
    const LOCK = "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 8 0v4'/></svg>";
    const effMode = (m) => (safe(() => US().length, 1) ? m : 'reg');

    function decorate(mode) {
      const L = $('login'); const box = L && L.querySelector('.lbox'); if (!box) return null;
      const side = box.querySelector('.lside'), form = box.querySelector('.lform');
      if (!side || !form) return null;
      box.classList.add('fx'); box.dataset.mode = mode;
      const lg = safe(() => logo(66), '');
      side.innerHTML = '<div class="fxw">' + lg + '<h2>' + (mode === 'in' ? 'مرحبًا بعودتك!' : 'أهلًا بك!') + '</h2><p>' +
        (mode === 'in' ? 'سجّل دخولك لمتابعة العمل على نظام أمان.' : 'أنشئ حسابك وابدأ إدارة التأمينات في دقائق.') + '</p></div>';
      [...form.querySelectorAll(':scope > label')].forEach((lb) => {
        const inp = lb.nextElementSibling;
        if (!inp || inp.tagName !== 'INPUT' || inp.type === 'checkbox' || lb.querySelector('input')) return;
        const w = document.createElement('div'); w.className = 'fxf';
        const ico = document.createElement('span'); ico.className = 'fxi';
        ico.innerHTML = (inp.type === 'password') ? LOCK : safe(() => ic('user', 18), '');
        lb.parentNode.insertBefore(w, lb);
        inp.placeholder = ' ';
        w.append(inp, lb, ico);
      });
      [...form.children].forEach((c, i) => c.style.setProperty('--i', i));
      return box;
    }

    window.showLogin = function (mode) {
      if (busy) return;
      const m = effMode(mode), L = $('login'), had = L && L.querySelector('.lbox.fx');
      if (RM || !had || cur === m) {
        orig.call(this, mode);
        const box = decorate(m);
        if (box) { cur = m; if (!RM) box.classList.add('fx-first', 'fx-in'); setTimeout(() => { const i = box.querySelector('.lform input'); if (i && document.body.classList.contains('lo')) i.focus(); }, RM ? 0 : 700); }
        return;
      }
      busy = true;
      had.classList.remove('fx-in'); had.classList.add('fx-out');
      const self = this;
      setTimeout(() => {
        orig.call(self, mode);
        const box = decorate(m); cur = m;
        if (!box) { busy = false; return; }
        box.classList.add('fx-cover'); void box.offsetWidth;
        requestAnimationFrame(() => { box.classList.remove('fx-cover'); box.classList.add('fx-in'); });
        setTimeout(() => { busy = false; const i = box.querySelector('.lform input'); if (i) i.focus(); }, 1000);
      }, 520);
    };
  })();

  /* ======================================================================
     2) شريط الإجراءات السريعة (Dock)
     ====================================================================== */
  const ACT = [
    { l: 'موظف جديد', i: 'uplus', c: '#6ee7ff', f: () => editE() },
    { l: 'طلب دخول', i: 'clip', c: '#a78bfa', f: () => editQ() },
    { l: 'رفع كشوف مرتبات', i: 'up', c: '#f472b6', f: () => impP() },
    { l: 'تقرير سريع', i: 'sheet', c: '#fbbf24', f: () => nv('fin') }
  ];

  function buildDock() {
    const wrap = document.createElement('div');
    wrap.className = 'fxdock-wrap noprint';
    wrap.innerHTML = '<nav class="fxdock" role="tablist" aria-label="إجراءات سريعة"><span class="fxd-line"></span><span class="fxd-refl"></span>' +
      ACT.map((a, i) => '<button type="button" role="tab" class="fxd-it" data-i="' + i + '" style="--acc:' + a.c + '"><span class="fxd-ic">' + safe(() => ic(a.i, 22), '') + '</span><span class="fxd-lb">' + a.l + '</span></button>').join('') +
      '<span class="fxd-light"><i class="fxd-ring"></i></span></nav><p class="fxd-hint">اضغط على أي زر — أو <b>اسحب الضوء</b> على الشريط</p>';
    wireDock(wrap);
    return wrap;
  }

  function wireDock(wrap) {
    const bar = wrap.querySelector('.fxdock'), items = [...bar.querySelectorAll('.fxd-it')];
    const light = bar.querySelector('.fxd-light'), ring = light.firstElementChild;
    const line = bar.querySelector('.fxd-line'), refl = bar.querySelector('.fxd-refl');
    let active = clamp(window.__fxDockIdx || 0, 0, items.length - 1);
    let H = 0, T = 0, hv = 0, tv = 0, to = 0, from = 0, raf = 0, last = 0, dragging = false, moved = false, sx = 0, hover = -1, ready = false;

    const D = () => light.offsetHeight || 46;
    const cx = (i) => { const b = bar.getBoundingClientRect(), r = items[i].getBoundingClientRect(); return r.left + r.width / 2 - b.left; };
    const xs = () => items.map((_, i) => cx(i));
    const nearest = (x) => { const a = xs(); let k = 0; a.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(a[k] - x)) k = i; }); return k; };

    function paint() {
      const d = D(), st = Math.abs(H - T), l = Math.min(H, T) - d / 2, w = st + d, f = Math.min(1, st / 170);
      light.style.transform = 'translateX(' + l + 'px)'; light.style.width = w + 'px';
      ring.style.borderWidth = Math.max(1.1, 2 - 0.9 * f) + 'px'; ring.style.opacity = String(1 - 0.35 * f);
      const mid = (H + T) / 2; line.style.left = (mid - w * 0.9) + 'px'; line.style.width = (w * 1.8) + 'px';
      refl.style.left = l + 'px'; refl.style.width = w + 'px';
    }
    function step(t) {
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
      const trip = Math.max(1, Math.abs(to - from)), home = 1 - Math.min(1, Math.abs(T - to) / trip);
      const KB = 62 + 155 * home, CB = 2 * Math.sqrt(KB) * 0.9;           /* رأس سريع/مرتد، وذيل ناعم يلحق به */
      hv += (-235 * (H - to) - 22 * hv) * dt; H += hv * dt;
      tv += (-KB * (T - to) - CB * tv) * dt; T += tv * dt;
      paint();
      if (Math.abs(H - to) < 0.25 && Math.abs(T - to) < 0.25 && Math.abs(hv) < 4 && Math.abs(tv) < 4) { H = T = to; hv = tv = 0; paint(); raf = 0; return; }
      raf = requestAnimationFrame(step);
    }
    function moveTo(x) {
      from = H; to = x;
      if (RM) { H = T = x; paint(); return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    }
    function setActive(i) {
      active = i; hover = -1; window.__fxDockIdx = i;
      items.forEach((it, k) => { it.classList.toggle('on', k === i); it.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      bar.style.setProperty('--acc', ACT[i].c);
    }
    function select(i) {
      setActive(i); moveTo(cx(i));
      setTimeout(() => { try { ACT[i].f(); } catch (e) { console.error('[AmanFX]', e); } }, RM ? 0 : 380);
    }
    items.forEach((it, i) => it.addEventListener('click', () => select(i)));

    /* سحب الضوء */
    light.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return; dragging = true; moved = false; sx = e.clientX; light.classList.add('drag');
      try { light.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
    });
    light.addEventListener('pointermove', (e) => {
      if (!dragging) return; if (Math.abs(e.clientX - sx) > 4) moved = true; if (!moved) return;
      const a = xs(), b = bar.getBoundingClientRect(); const x = clamp(e.clientX - b.left, Math.min(...a), Math.max(...a));
      from = H; to = x; if (RM) { H = T = x; paint(); } else if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
      const n = nearest(x);
      if (n !== hover) { hover = n; bar.style.setProperty('--acc', ACT[n].c); items.forEach((it, k) => it.classList.toggle('on', k === n)); }
    });
    const end = (e) => {
      if (!dragging) return; dragging = false; light.classList.remove('drag');
      try { light.releasePointerCapture(e.pointerId); } catch (x) {}
      select(moved ? nearest(to) : active);
    };
    light.addEventListener('pointerup', end); light.addEventListener('pointercancel', end);

    /* القياس والتموضع الأولي */
    const place = () => { if (!bar.offsetWidth) return false; H = T = to = from = cx(active); hv = tv = 0; paint(); ready = true; return true; };
    setActive(active);
    if (window.ResizeObserver) new ResizeObserver(() => { if (!dragging && !raf) place(); }).observe(bar);
    let tries = 0; const init = () => { if (!place() && tries++ < 40) requestAnimationFrame(init); }; requestAnimationFrame(init);
    wrap.__fx = { select };
  }

  function mountDock(root) {
    const sel = '.dq-grid,.hq,.dv-quick', list = [];
    if (root.matches && root.matches(sel)) list.push(root);
    if (root.querySelectorAll) list.push(...root.querySelectorAll(sel));
    list.forEach((g) => {
      if (g.dataset.fxd) return;
      if (!g.parentNode || g.closest('#login,#modal,#drawer')) return;
      g.dataset.fxd = '1';
      g.parentNode.insertBefore(buildDock(), g);
    });
  }

  /* ======================================================================
     3) زر الرفع
     ====================================================================== */
  const UP_SIG = 'M17 8l-5-5-5 5M12 3v12';
  const FXU = '<span class="fxu" aria-hidden="true"><span class="fxu-lb"><span class="t t-up">جارٍ الرفع</span><span class="t t-ok">تم الرفع</span></span>' +
    '<span class="fxu-seg"><span class="fxu-liq"></span><svg class="fxu-ck" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></span><span class="fxu-sub" aria-hidden="true"></span>';
  let lastUp = null, lastUpT = 0;
  const recentUp = () => (lastUp && lastUp.isConnected && Date.now() - lastUpT < 30000 ? lastUp : null);
  const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

  function isUp(el) {
    if (el.classList.contains('fx-up') || el.classList.contains('fx-del')) return false;
    if (!el.matches('button,label.btn,a.btn')) return false;
    if (el.closest('.fxdock,#login,[data-fxd]')) return false;
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length >= 3 && t.length <= 26 && el.innerHTML.indexOf(UP_SIG) >= 0;
  }
  function decUp(el) {
    el.classList.add('fx-up');
    const ico = [...el.children].find((c) => c.tagName === 'svg' || (c.querySelector && c.querySelector(':scope > svg')));
    if (ico) ico.classList.add('fxu-icon');
    if (!el.querySelector(':scope > .fxu')) el.insertAdjacentHTML('beforeend', FXU);
    el.addEventListener('click', () => { lastUp = el; lastUpT = Date.now(); }, true);
  }
  function startUpload(btn, files) {
    if (!btn || !btn.isConnected || btn.classList.contains('run')) return;
    const list = [...(files || [])]; if (!list.length) return;
    const total = Math.max(1, list.reduce((s, f) => s + (f.size || 0), 0));
    const attach = btn.dataset.fxu === 'attach';
    const up = btn.querySelector('.t-up'), ok = btn.querySelector('.t-ok'), sub = btn.querySelector(':scope > .fxu-sub');
    if (up) up.textContent = attach ? 'جارٍ الإضافة' : 'جارٍ الرفع';
    if (ok) ok.textContent = attach ? 'تمت الإضافة' : 'تم الرفع';
    clearTimeout(btn.__fxT); btn.classList.remove('done'); btn.classList.add('run'); btn.style.setProperty('--p', '0');
    if (sub) sub.textContent = 'جارٍ البدء…';
    const dur = RM ? 60 : Math.min(2600, 900 + total / 1500), t0 = performance.now() + (RM ? 0 : 260);
    const tick = (now) => {
      if (!btn.isConnected) return;
      const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 2);
      btn.style.setProperty('--p', String(e));
      if (now > t0 && sub) sub.textContent = fmtSize(total * e) + ' / ' + fmtSize(total);
      if (p < 1) return requestAnimationFrame(tick);
      btn.classList.remove('run'); btn.classList.add('done');
      if (sub) sub.textContent = fmtSize(total) + (attach ? ' · جاهز' : ' · تم');
      btn.__fxT = setTimeout(() => { btn.classList.remove('done'); if (sub) sub.textContent = ''; }, 2600);
    };
    requestAnimationFrame(tick);
  }
  function wrapFile(inp) {
    if (inp.__fxw || !inp.closest('#modal')) return; inp.__fxw = 1;
    const w = document.createElement('span'); w.className = 'fxu-wrap';
    w.innerHTML = '<button type="button" class="btn fx-up sm" data-fxu="attach">' + safe(() => ic('up', 15), '') + ' ' + (inp.multiple ? 'اختيار ملفات' : 'اختيار ملف') + '</button><span class="fxu-names"></span>';
    inp.parentNode.insertBefore(w, inp); inp.classList.add('fxu-hid');
    const b = w.firstChild, names = w.lastChild; decUp(b);
    b.addEventListener('click', () => inp.click());
    inp.__fxBtn = b;
    inp.addEventListener('change', () => {
      const f = [...inp.files]; names.textContent = f.length > 2 ? f.length + ' ملفات' : f.map((x) => x.name).join('، ');
      startUpload(b, f);
    });
  }
  /* ملفات تُختار من زر يفتح اختيارًا برمجيًا (input غير مُلحق بالصفحة) */
  (function () {
    const oc = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file' && !this.__fxL && !this.__fxBtn) {
        this.__fxL = 1;
        this.addEventListener('change', () => { if (this.files && this.files.length) startUpload(recentUp(), this.files); });
      }
      return oc.apply(this, arguments);
    };
  })();
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'INPUT' || t.type !== 'file' || t.__fxBtn || !t.files || !t.files.length) return;
    startUpload((t.closest && t.closest('.fx-up')) || recentUp(), t.files);
  }, true);

  /* ======================================================================
     4) زر الحذف
     ====================================================================== */
  const TRASH_SIG = 'M3 6h18M19 6v14';
  const PART = [[-18, -20], [8, -25], [22, -12], [24, 7], [-23, 3], [-6, -27], [15, -22]];
  const FXD = '<span class="fxdl" aria-hidden="true"><svg class="fxdl-can" viewBox="0 0 24 24"><g class="fxdl-lid"><path d="M3 6h18"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></g>' +
    '<path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/><path d="M10 11v6M14 11v6"/></svg>' +
    PART.map((p, n) => '<i class="fxdl-p" style="--x:' + p[0] + 'px;--y:' + p[1] + 'px;--n:' + n + '"></i>').join('') +
    '<svg class="fxdl-ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" pathLength="100"/></svg></span>';
  const delText = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const looksDel = (el) => el.innerHTML.indexOf(TRASH_SIG) >= 0 || (/^(حذف|مسح|إزالة)/.test(delText(el)) && delText(el).length <= 24);

  function isDel(el) {
    if (el.classList.contains('fx-del') || el.classList.contains('fx-up')) return false;
    if (!el.matches('button,.p-button,a.btn')) return false;
    if (el.closest('.fxdock,#login,[data-fxd]')) return false;
    if (el.matches('.ef-lnk,.at-link,.at-chx,.at-sgx,.dp-b,.dpx')) return false;
    return looksDel(el);
  }
  function decDel(el) {
    el.classList.add('fx-del');
    if (!el.querySelector(':scope > .fxdl')) el.insertAdjacentHTML('beforeend', FXD);
  }
  function runDelete(b) {
    const w = b.offsetWidth, h = b.offsetHeight, shrink = w - h > 10;
    b.classList.add('fxdl-run', 'fxdl-open');
    if (shrink) { b.style.width = w + 'px'; b.style.minWidth = '0'; void b.offsetWidth; }
    setTimeout(() => { b.classList.remove('fxdl-open'); if (shrink) { b.classList.add('fxdl-shrink'); b.style.width = h + 'px'; } }, 420);
    setTimeout(() => {
      b.classList.add('fxdl-ring-on');
      if (b.isConnected) { b.__fxGo = 1; try { b.click(); } finally { b.__fxGo = 0; } }   /* الإجراء الأصلي (تأكيد الحذف…) */
    }, 820);
    setTimeout(() => {
      b.classList.remove('fxdl-ring-on', 'fxdl-shrink'); if (shrink) b.style.width = w + 'px';
      setTimeout(() => { b.classList.remove('fxdl-run'); b.style.width = ''; b.style.minWidth = ''; }, 420);
    }, 1560);
  }
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('.fx-del');
    if (!b || b.__fxGo || b.disabled) return;
    if (b.classList.contains('fxdl-run')) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (RM || !looksDel(b)) return;                  /* زر تغيّر نصه (مثل «تراجع») يمرّ كما هو */
    e.stopImmediatePropagation(); e.preventDefault();
    runDelete(b);
  }, true);

  /* ======================================================================
     مراقبة الصفحة وتطبيق التأثيرات على العناصر الجديدة
     ====================================================================== */
  const queue = new Set(); let sched = false;
  function scanNode(n) {
    if (n.nodeType !== 1 || !n.isConnected) return;
    if (n.closest && n.closest('#login')) return;
    mountDock(n);
    const files = n.matches('input[type=file]') ? [n] : [...n.querySelectorAll('input[type=file]')];
    files.forEach(wrapFile);
    const els = n.matches('button,label,a,.p-button') ? [n] : []; els.push(...n.querySelectorAll('button,label.btn,a.btn,.p-button'));
    els.forEach((el) => { try { if (isUp(el)) decUp(el); else if (isDel(el)) decDel(el); } catch (e) { console.error('[AmanFX]', e); } });
  }
  function flush() { sched = false; const a = [...queue]; queue.clear(); a.forEach(scanNode); }
  function boot() {
    new MutationObserver((ms) => {
      for (const m of ms) m.addedNodes.forEach((n) => { if (n.nodeType === 1 && !(n.classList && (n.classList.contains('fxdl') || n.classList.contains('fxu') || n.classList.contains('fxdock-wrap')))) queue.add(n); });
      if (queue.size && !sched) { sched = true; requestAnimationFrame(flush); }
    }).observe(document.body, { childList: true, subtree: true });
    scanNode(document.body);
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);

  window.AmanFX = { version: '16.0', off() { try { localStorage.setItem('ins_ui_fx', '0'); } catch (e) {} location.reload(); } };
})();
