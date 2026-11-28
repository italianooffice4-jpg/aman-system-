/* v17 — المرحلة 9: قفل الشاشة بـ PIN بعد الخمول (86) + وضع Kiosk (87) + أزرار القفل/المزامنة السريعة.
   JS عادي بدون بناء (يعمل كتحديث ويب عادي، لا يحتاج مثبّتًا جديدًا).
   تنبيه صريح: هذا قفل للواجهة وليس تشفيرًا للبيانات على القرص؛ من يملك الجهاز والملفات يصل للبيانات بغير البرنامج. */
(function () {
  'use strict';
  const LS = 'ins_lock', TRY = 'ins_lock_try', KS = 'ins_kiosk', SS = 'ins_locked', BOOT = 'ins_lock_boot';
  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* لا شيء */ } };
  const esc2 = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (m, ok) => { try { toast(m, ok ? 1 : 0); } catch (e) { /* لا شيء */ } };
  const digits = (s) => String(s || '').replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632).replace(/[۰-۹]/g, (c) => c.charCodeAt(0) - 1776).replace(/\D/g, '');
  const DEF = { v: 1, on: false, idle: 5, atStart: false, len: 0, salt: '', hash: '', iters: 150000, kiosk: { page: 'dash', pages: ['dash'], rotate: 0, auto: false } };
  const cfg = () => { const c = rd(LS, {}); return { ...DEF, ...c, kiosk: { ...DEF.kiosk, ...(c.kiosk || {}) } }; };
  const saveCfg = (c) => wr(LS, c);
  const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
  const subtle = () => (window.crypto && crypto.subtle) || null;

  async function derive(pin, salt, iters) {
    const s = subtle(); if (!s) throw new Error('المتصفح لا يدعم التشفير المطلوب');
    const enc = new TextEncoder();
    const key = await s.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    return hex(new Uint8Array(await s.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: iters }, key, 256)));
  }
  const rndSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  async function checkPin(pin) { const c = cfg(); if (!c.on || !c.hash) return false; return (await derive(pin, c.salt, c.iters)) === c.hash; }

  /* ---- محاولات خاطئة: تأخير متصاعد (يبقى بعد إعادة التشغيل) ---- */
  const delayFor = (n) => (n >= 10 ? 1800 : n >= 8 ? 600 : n >= 5 ? 120 : n >= 3 ? 30 : 0);
  const tries = () => rd(TRY, { n: 0, until: 0 });
  const wait = () => Math.max(0, Math.ceil((tries().until - Date.now()) / 1000));
  const fail = () => { const t = tries(); t.n++; const d = delayFor(t.n); t.until = d ? Date.now() + d * 1000 : 0; wr(TRY, t); };
  const okTry = () => wr(TRY, { n: 0, until: 0 });

  /* ---- النافذة (قفل / تحقق) ---- */
  let ov = null, locked = false, mo = null, last = Date.now();
  const setInert = (on) => { [...document.body.children].forEach((el) => { if (el !== ov) { try { el.inert = on; } catch (e) { /* لا شيء */ } } }); };
  const accountOk = async (pw) => {
    let us = []; try { us = US(); } catch (e) { us = []; }
    let cands = []; try { if (typeof CU !== 'undefined' && CU) cands = us.filter((u) => u.u === CU.u); } catch (e) { /* لا شيء */ }
    if (!cands.length) cands = us.filter((u) => u.role === 'مدير');
    for (const u of cands) { try { if (await hp(pw, u.salt) === u.hash) return true; } catch (e) { /* لا شيء */ } }
    return false;
  };
  const logoHtml = () => { try { return typeof logo === 'function' ? logo(72) : ''; } catch (e) { return ''; } };

  function prompt(o) {
    return new Promise((resolve) => {
      if (ov) { ov.remove(); ov = null; }
      const c = cfg();
      ov = document.createElement('div'); ov.id = 'aman-lock'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = `<div class="al-box"><div class="al-logo">${logoHtml()}</div><h2>${esc2(o.title)}</h2><div class="al-sub">${esc2(o.sub || '')}</div>
        <div id="al-pin"><div class="al-dots" id="al-dots"></div><input class="al-in" id="al-in" type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="PIN">
        <div class="al-pad" id="al-pad"></div></div>
        <div id="al-pwbox" hidden><input class="al-in al-pw" id="al-pw" type="password" autocomplete="off" placeholder="كلمة سر حسابك"></div>
        <div class="al-msg" id="al-msg" role="alert"></div>
        <div class="al-row"><button class="al-btn" id="al-ok" type="button">فتح</button>${o.cancelable ? '<button class="al-btn" id="al-cancel" type="button" style="background:#555">إلغاء</button>' : ''}</div>
        <div class="al-row"><button class="al-lnk" id="al-forgot" type="button">نسيت الـ PIN؟ ادخل بكلمة سر حسابك</button></div></div>`;
      document.body.appendChild(ov); setInert(true);
      const q = (id) => ov.querySelector('#' + id);
      const pin = q('al-in'), msg = q('al-msg'), dots = q('al-dots'), okb = q('al-ok');
      let mode = 'pin', cd = 0;
      const len = c.len || 0;
      const paintDots = () => { dots.innerHTML = Array.from({ length: Math.max(len, pin.value.length, 4) }, (_, i) => `<i class="${i < pin.value.length ? 'on' : ''}"></i>`).join(''); };
      const countdown = () => { clearInterval(cd); const w = wait(); if (!w) { if (msg.dataset.lock) { msg.textContent = ''; msg.dataset.lock = ''; } okb.disabled = false; return; } okb.disabled = true; msg.dataset.lock = '1'; msg.textContent = 'محاولات كثيرة خاطئة — انتظر ' + w + ' ثانية'; cd = setInterval(() => { const x = wait(); if (!x) { clearInterval(cd); okb.disabled = false; msg.textContent = ''; msg.dataset.lock = ''; } else msg.textContent = 'محاولات كثيرة خاطئة — انتظر ' + x + ' ثانية'; }, 1000); };
      const done = (v) => { clearInterval(cd); if (mo) { mo.disconnect(); mo = null; } if (ov) { ov.remove(); ov = null; } setInert(false); resolve(v); };
      async function submit() {
        if (wait()) return countdown();
        msg.textContent = '';
        try {
          if (mode === 'pin') {
            const p = digits(pin.value); if (!p) return;
            if (await checkPin(p)) { okTry(); return done({ ok: true }); }
            fail(); pin.value = ''; paintDots(); msg.textContent = 'PIN غير صحيح'; countdown();
          } else {
            const pw = q('al-pw').value; if (!pw) return;
            if (await accountOk(pw)) { okTry(); return done({ ok: true, forgot: true }); }
            fail(); q('al-pw').value = ''; msg.textContent = 'كلمة السر غير صحيحة'; countdown();
          }
        } catch (e) { msg.textContent = 'تعذر التحقق: ' + (e.message || e); }
      }
      const pad = q('al-pad');
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '↵'].forEach((k) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = k; b.setAttribute('aria-label', k);
        b.onclick = () => { if (k === '⌫') pin.value = pin.value.slice(0, -1); else if (k === '↵') return submit(); else if (pin.value.length < 8) pin.value += k; paintDots(); if (len && pin.value.length === len && k !== '⌫') submit(); };
        pad.appendChild(b);
      });
      pin.oninput = () => { pin.value = digits(pin.value); paintDots(); if (len && pin.value.length === len) submit(); };
      okb.onclick = submit;
      ov.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape' && o.cancelable) done({ ok: false }); e.stopPropagation(); };
      const cn = q('al-cancel'); if (cn) cn.onclick = () => done({ ok: false });
      q('al-forgot').onclick = () => { mode = mode === 'pin' ? 'pw' : 'pin'; q('al-pin').hidden = mode !== 'pin'; q('al-pwbox').hidden = mode !== 'pw'; q('al-forgot').textContent = mode === 'pw' ? 'العودة لإدخال الـ PIN' : 'نسيت الـ PIN؟ ادخل بكلمة سر حسابك'; msg.textContent = ''; (mode === 'pw' ? q('al-pw') : pin).focus(); };
      mo = new MutationObserver(() => setInert(true)); mo.observe(document.body, { childList: true });
      paintDots(); countdown(); setTimeout(() => { try { pin.focus(); } catch (e) { /* لا شيء */ } }, 30);
    });
  }

  /* ---- القفل ---- */
  async function lock(why) {
    const c = cfg();
    if (!c.on || locked) return false;
    locked = true;
    try { sessionStorage.setItem(SS, '1'); } catch (e) { /* لا شيء */ }
    document.documentElement.setAttribute('data-locked', '1');
    const r = await prompt({ title: 'البرنامج مقفول', sub: (() => { try { return CU ? CU.name : ''; } catch (e) { return ''; } })() + (why === 'idle' ? ' — قُفل لعدم النشاط' : ''), cancelable: false });
    locked = false; last = Date.now();
    try { sessionStorage.removeItem(SS); } catch (e) { /* لا شيء */ }
    document.documentElement.removeAttribute('data-locked');
    if (r.forgot) T('تم الفتح بكلمة سر الحساب. غيّر الـ PIN من الإعدادات ← الأمان والقفل', 1);
    return true;
  }
  const bump = (() => { let t = 0; return () => { const n = Date.now(); if (n - t > 800) { last = n; t = n; } }; })();
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach((e) => window.addEventListener(e, bump, { capture: true, passive: true }));
  const idleCheck = () => {
    const c = cfg();
    if (!c.on || locked || kioskFlag || document.body.classList.contains('lo')) return;
    if (c.idle > 0 && Date.now() - last >= c.idle * 60000) lock('idle');
  };
  setInterval(idleCheck, 3000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) idleCheck(); });
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'l' || e.key === 'L' || e.key === 'ل') && cfg().on && !kioskFlag) { e.preventDefault(); e.stopPropagation(); lock('manual'); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Q' || e.key === 'q') && kioskFlag) { e.preventDefault(); e.stopPropagation(); exitKiosk(); }
  }, true);

  /* ---- إعداد الـ PIN ---- */
  function setupPin() {
    const c = cfg(), has = c.on && c.hash;
    openM(`<h3>${has ? 'تغيير الـ PIN' : 'تعيين PIN للقفل'}</h3><p class=mut>من 4 إلى 8 أرقام. يُحفظ مجزَّأً (PBKDF2) على هذا الجهاز فقط.</p>${has ? '<label class=mut>الـ PIN الحالي</label><input id=lk_old type=password inputmode=numeric maxlength=8 autocomplete=off>' : ''}<label class=mut>الـ PIN الجديد</label><input id=lk_new type=password inputmode=numeric maxlength=8 autocomplete=off><label class=mut>تأكيد الـ PIN</label><input id=lk_new2 type=password inputmode=numeric maxlength=8 autocomplete=off><div id=lk_err class=mut style='color:#ef4444;min-height:18px;margin-top:6px'></div><div style='display:flex;gap:8px;margin-top:10px'><button class=btn id=lk_ok>حفظ</button><button class='btn s' onclick='closeM()'>إلغاء</button></div>`, 420);
    const E = (m) => { document.getElementById('lk_err').textContent = m; };
    document.getElementById('lk_ok').onclick = async () => {
      try {
        if (!subtle()) return E('هذا المتصفح لا يدعم التشفير اللازم للـ PIN');
        const n1 = digits(document.getElementById('lk_new').value), n2 = digits(document.getElementById('lk_new2').value);
        if (has) { if (wait()) return E('محاولات كثيرة — انتظر ' + wait() + ' ثانية'); if (!(await checkPin(digits(document.getElementById('lk_old').value)))) { fail(); return E('الـ PIN الحالي غير صحيح'); } okTry(); }
        if (n1.length < 4 || n1.length > 8) return E('الـ PIN من 4 إلى 8 أرقام');
        if (n1 !== n2) return E('تأكيد الـ PIN غير مطابق');
        if (/^(\d)\1+$/.test(n1) || '0123456789'.includes(n1) || '9876543210'.includes(n1)) return E('اختر PIN أقوى (ليس أرقامًا متكررة أو متسلسلة)');
        const salt = rndSalt(), hash = await derive(n1, salt, c.iters || DEF.iters);
        saveCfg({ ...cfg(), on: true, salt, hash, len: n1.length, iters: c.iters || DEF.iters });
        closeM(); T('تم حفظ الـ PIN وتفعيل القفل', 1); go('set');
      } catch (e) { E('تعذر الحفظ: ' + (e.message || e)); }
    };
  }
  async function disablePin() {
    const r = await prompt({ title: 'إيقاف القفل', sub: 'أدخل الـ PIN للتأكيد', cancelable: true });
    if (!r.ok) return;
    const c = cfg(); saveCfg({ ...c, on: false, salt: '', hash: '', len: 0 }); T('تم إيقاف القفل', 1); go('set');
  }
  function patch(p) { saveCfg({ ...cfg(), ...p }); }
  function patchK(p) { const c = cfg(); saveCfg({ ...c, kiosk: { ...c.kiosk, ...p } }); }

  /* ---- Kiosk ---- */
  let kioskFlag = !!(rd(KS, null) || {}).on, goWrapped = false, rotTimer = 0, tapN = 0, tapT = 0, saved = {};
  const PAGES = { dash: 'الرئيسية', emp: 'الموظفون', comp: 'الشركات', cars: 'السيارات', req: 'طلبات الدخول', fin: 'التقارير المالية', log: 'السجل', rec: 'مطابقة الكشوف' };
  const MUT = ['addAllSug', 'addDocs', 'addSug', 'addU', 'bulkQ', 'clrP', 'clrVals', 'delAll', 'delC', 'delCar', 'delE', 'delP', 'delQ', 'delT', 'delU', 'editC', 'editCar', 'editE', 'editQ', 'editT', 'impP', 'impQ', 'impX', 'newEmpPrep', 'regQ', 'renewCar', 'resetAll', 'rmSc', 'saveApp', 'saveCfg', 'saveNewEmp', 'toggle', 'toggleT', 'scanDoc', 'scanLatest', 'userM'];
  /* حماية التخزين: لا يُكتب شيء على بيانات البرنامج أثناء Kiosk مهما حدث (ثم يُعاد تحميل البرنامج عند الخروج) */
  const _set = Storage.prototype.setItem, _rem = Storage.prototype.removeItem;
  const PROT = ['ins_sys_v1', 'ins_users'];
  Storage.prototype.setItem = function (k, v) { if (kioskFlag && this === window.localStorage && PROT.includes(String(k))) return; return _set.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { if (kioskFlag && this === window.localStorage && PROT.includes(String(k))) return; return _rem.call(this, k); };

  function kioskUi() {
    document.body.classList.add('aman-kiosk');
    if (!document.getElementById('aman-kx')) { const b = document.createElement('button'); b.id = 'aman-kx'; b.type = 'button'; b.setAttribute('aria-label', 'خروج'); b.onclick = () => { const n = Date.now(); tapN = n - tapT < 2500 ? tapN + 1 : 1; tapT = n; if (tapN >= 5) { tapN = 0; exitKiosk(); } }; document.body.appendChild(b); }
    const ks = cfg().kiosk, ok = (p) => (ks.pages || ['dash']).includes(p);
    if (!goWrapped && typeof go === 'function') { goWrapped = true; saved.go = go; go = function (p) { if (kioskFlag && p && typeof p === 'string' && !ok(p) && !(arguments[1] && arguments[1].__k)) { T('غير متاح في وضع العرض'); return; } return saved.go.apply(this, arguments); }; }
    MUT.forEach((n) => { try { if (typeof window[n] === 'function' && !saved[n]) { saved[n] = window[n]; window[n] = function () { T('غير متاح في وضع العرض'); }; } } catch (e) { /* لا شيء */ } });
    window.addEventListener('contextmenu', ctx, true); window.addEventListener('keydown', kkey, true);
    document.addEventListener('fullscreenchange', fsBanner); fsBanner();
    clearInterval(rotTimer);
    const pgs = (ks.pages || []).filter((p) => PAGES[p]);
    if (ks.rotate > 0 && pgs.length > 1) { let i = Math.max(0, pgs.indexOf(ks.page)); rotTimer = setInterval(() => { i = (i + 1) % pgs.length; try { saved.go(pgs[i]); } catch (e) { /* لا شيء */ } }, ks.rotate * 1000); }
  }
  const ctx = (e) => { if (kioskFlag) e.preventDefault(); };
  const kkey = (e) => {
    if (!kioskFlag || ov) return;
    if (e.key === 'Escape' && document.querySelector('#modal.on')) return;            // إغلاق النوافذ المفتوحة مسموح
    if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) return;          // مفتاح الخروج
    if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key) || e.key === 'Escape') { if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) return; e.preventDefault(); e.stopPropagation(); }
  };
  function fsBanner() {
    const b = document.getElementById('aman-kfs');
    if (!kioskFlag || document.fullscreenElement || !document.documentElement.requestFullscreen) { if (b) b.remove(); return; }
    if (b) return;
    const x = document.createElement('button'); x.id = 'aman-kfs'; x.type = 'button'; x.textContent = 'اضغط هنا لملء الشاشة'; x.onclick = () => { document.documentElement.requestFullscreen().catch(() => {}); x.remove(); }; document.body.appendChild(x);
  }
  async function startKiosk() {
    const c = cfg();
    if (!c.on) { T('فعّل الـ PIN أولًا — يلزم للخروج من وضع Kiosk'); return setupPin(); }
    if (!(c.kiosk.pages || []).length) return T('اختر صفحة واحدة على الأقل للعرض');
    wr(KS, { on: 1, since: Date.now() }); kioskFlag = true;
    try { closeM(); } catch (e) { /* لا شيء */ }
    kioskUi();
    try { await document.documentElement.requestFullscreen(); } catch (e) { /* يحتاج لمسة: يظهر زر */ }
    (saved.go || go)(c.kiosk.page || 'dash', { __k: 1 });
    return true;
  }
  async function exitKiosk() {
    if (!kioskFlag) return;
    const c = cfg();
    if (!c.on) { localStorage.removeItem(KS); kioskFlag = false; return location.reload(); }
    if (ov) return;
    const r = await prompt({ title: 'الخروج من وضع Kiosk', sub: 'أدخل الـ PIN', cancelable: true });
    if (!r.ok) return;
    kioskFlag = false; _rem.call(localStorage, KS);
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* لا شيء */ }
    location.reload();                       // يُسقط أي تغييرات في الذاكرة ويعيد قراءة البيانات المحفوظة
  }

  /* ---- بطاقة الإعدادات (تُضاف إلى صفحة الإعدادات) ---- */
  function card() {
    const c = cfg(), k = c.kiosk, on = c.on && c.hash;
    const idleOpts = [0, 1, 2, 5, 10, 15, 30, 60].map((m) => `<option value="${m}" ${+c.idle === m ? 'selected' : ''}>${m ? m + ' دقيقة' : 'بدون قفل تلقائي'}</option>`).join('');
    const pg = Object.keys(PAGES).map((p) => `<label style='display:inline-flex;gap:6px;align-items:center;margin-inline-end:12px'><input type=checkbox style='width:auto' ${(k.pages || []).includes(p) ? 'checked' : ''} onchange="amanLock.kPage('${p}',this.checked)"> ${PAGES[p]}</label>`).join('');
    const first = (k.pages || []).map((p) => `<option value="${p}" ${k.page === p ? 'selected' : ''}>${PAGES[p] || p}</option>`).join('');
    return `<div class=card id=lock_card><h3>🔒 الأمان والقفل</h3>
      <p class=mut>قفل شاشة بـ PIN (4–8 أرقام) يظهر عند الخمول أو بـ <kbd>Ctrl L</kbd>. <b>هذا قفل للواجهة وليس تشفيرًا للبيانات</b>؛ يمنع من يمر بجوار جهازك لا من يملك ملفاته.</p>
      <div>${on ? "<span class='tag a'>القفل مفعّل</span>" : "<span class='tag i'>غير مفعّل</span>"}</div>
      <div style='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px'><button class=btn onclick='amanLock.setupPin()'>${on ? 'تغيير الـ PIN' : 'تعيين PIN وتفعيل القفل'}</button>${on ? "<button class='btn s' onclick='amanLock.lock(\"manual\")'>قفل الآن</button><button class='btn s d' onclick='amanLock.disablePin()'>إيقاف القفل</button>" : ''}</div>
      ${on ? `<label class=mut>القفل التلقائي بعد الخمول</label><select onchange="amanLock.patch({idle:+this.value})">${idleOpts}</select>
      <label style='display:flex;gap:8px;align-items:center;margin-top:10px'><input type=checkbox style='width:auto' ${c.atStart ? 'checked' : ''} onchange="amanLock.patch({atStart:this.checked})"> اقفل البرنامج عند فتحه (بعد تسجيل الدخول)</label>` : ''}
      <h3 style='margin-top:18px'>🖥️ وضع Kiosk (عرض فقط)</h3>
      <p class=mut>ملء الشاشة وإخفاء القوائم وعرض الصفحات المختارة فقط، <b>بدون أي تعديل على البيانات</b>. الخروج بـ <kbd>Ctrl Shift Q</kbd> أو بـ 5 ضغطات سريعة على الزاوية العلوية اليسرى ثم الـ PIN. لا يمنع اختصارات النظام (Alt+Tab ومفتاح Windows)؛ للقفل الكامل على مستوى النظام يلزم تحديث للغلاف.</p>
      <label class=mut>الصفحات المسموح عرضها</label><div>${pg}</div>
      <label class=mut>الصفحة الأولى</label><select onchange="amanLock.patchK({page:this.value})">${first}</select>
      <label class=mut>تبديل تلقائي بين الصفحات (ثوانٍ، 0 = بدون)</label><input type=number min=0 max=600 value="${+k.rotate || 0}" style='max-width:120px' onchange="amanLock.patchK({rotate:Math.max(0,+this.value||0)})">
      <label style='display:flex;gap:8px;align-items:center;margin-top:10px'><input type=checkbox style='width:auto' ${k.auto ? 'checked' : ''} onchange="amanLock.patchK({auto:this.checked})"> يستمر وضع Kiosk بعد إعادة تشغيل البرنامج (يلزم «تذكرني على هذا الجهاز» عند الدخول)</label>
      <div style='margin-top:12px'><button class=btn onclick='amanLock.startKiosk()'>بدء وضع Kiosk</button></div></div>`;
  }
  function kPage(p, on) {
    const k = cfg().kiosk; let pages = (k.pages || []).filter((x) => x !== p); if (on) pages.push(p);
    if (!pages.length) pages = ['dash'];
    patchK({ pages, page: pages.includes(k.page) ? k.page : pages[0] }); go('set');
  }
  try { const _set0 = R.set; R.set = () => { const h = _set0(), i = h.lastIndexOf('</div>'); return h.slice(0, i) + card() + '</div>'; }; } catch (e) { /* لا شيء */ }

  /* ---- أزرار سريعة (قفل / حالة المزامنة) ---- */
  const chips = document.createElement('div'); chips.id = 'aman-chips';
  const bLock = document.createElement('button'); bLock.type = 'button'; bLock.textContent = '🔒 قفل'; bLock.title = 'قفل البرنامج (Ctrl L)'; bLock.onclick = () => lock('manual');
  const bSync = document.createElement('button'); bSync.type = 'button'; bSync.onclick = () => syncModal();
  chips.appendChild(bLock); chips.appendChild(bSync);
  function syncInfo() { try { const c = CL.get(); if (!c || !c.at) return null; return { c, msg: (cs && cs.msg) || '', t: (cs && cs.t) || 0, busy: !!(cs && cs.busy) }; } catch (e) { return null; } }
  function paintChips() {
    bLock.hidden = !cfg().on || document.body.classList.contains('lo');
    const s = syncInfo(); bSync.hidden = !s || document.body.classList.contains('lo');
    if (s) { const bad = /^تعذر/.test(s.msg); bSync.className = bad ? 'bad' : 'ok'; bSync.textContent = s.busy ? '☁ جارٍ المزامنة…' : bad ? '☁ تعذرت المزامنة' : '☁ متزامن' + (s.t ? ' ' + new Date(s.t).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''); }
  }
  async function diagnose() {
    const s = syncInfo(); if (!s) return 'غير متصل بالسحابة';
    const c = s.c, base = c.url.replace(/\/+$/, '');
    try {
      const r = await fetch(base + '/rest/v1/workspace?select=user_id&limit=1', { headers: { apikey: c.key, Authorization: 'Bearer ' + c.at } });
      if (r.ok) return '✔ الاتصال والجدول وصلاحيات الحساب سليمة';
      let j = {}; try { j = await r.json(); } catch (e) { /* لا شيء */ }
      if (r.status === 404 || /workspace|PGRST20[5]|schema cache/i.test(j.message || j.code || '')) return '✘ الجدول workspace غير موجود: شغّل ملف supabase/setup.sql في SQL Editor';
      if (r.status === 401) return '✘ المفتاح أو الجلسة غير صالحة: اقطع الاتصال وسجّل الدخول من جديد (تأكد من استخدام anon public key)';
      if (r.status === 403) return '✘ ممنوع: سياسات RLS غير مضبوطة — أعد تشغيل supabase/setup.sql';
      return '✘ خطأ من الخادم (' + r.status + '): ' + (j.message || '');
    } catch (e) { return '✘ لا يوجد اتصال بالإنترنت أو الرابط غير صحيح (' + (e.message || e) + ')'; }
  }
  function syncModal() {
    const s = syncInfo(); if (!s) return;
    openM(`<h3>☁ المزامنة السحابية</h3><div class=mut>الحساب: ${esc2(s.c.email || '')}</div><div class=mut style='margin-top:6px'>الحالة: ${esc2(s.msg || '—')}${s.t ? ' — ' + new Date(s.t).toLocaleString('ar-EG') : ''}</div><div id=sy_diag style='margin-top:10px;min-height:20px'></div><div style='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px'><button class=btn onclick='cloudSync(true)'>مزامنة الآن</button><button class='btn s' id=sy_t>فحص الإعداد</button><button class='btn s' onclick='closeM();go("set")'>إعدادات المزامنة</button></div><p class=mut style='margin-top:10px'>المستندات المرفوعة لا تُزامَن (البيانات فقط).</p>`, 480);
    document.getElementById('sy_t').onclick = async () => { const d = document.getElementById('sy_diag'); d.textContent = 'جارٍ الفحص…'; d.textContent = await diagnose(); };
  }
  try { const _cs = cloudSync; cloudSync = async function () { try { return await _cs.apply(this, arguments); } finally { paintChips(); } }; } catch (e) { /* لا شيء */ }
  setInterval(paintChips, 3000);

  /* ---- ربط الإقلاع ---- */
  try {
    const _enter = enter;
    enter = function () {
      const r = _enter.apply(this, arguments);
      try {
        if (!sessionStorage.getItem(BOOT)) { sessionStorage.setItem(BOOT, '1'); if (cfg().on && cfg().atStart && !kioskFlag) lock('start'); }
        if (kioskFlag) { if (cfg().kiosk.auto) { kioskUi(); (saved.go || go)(cfg().kiosk.page || 'dash', { __k: 1 }); } else { _rem.call(localStorage, KS); kioskFlag = false; } }
        paintChips();
      } catch (e) { /* لا شيء */ }
      return r;
    };
  } catch (e) { /* لا شيء */ }
  function boot() {
    document.body.appendChild(chips); paintChips();
    try { if (sessionStorage.getItem(SS) === '1' && cfg().on) lock('reload'); else document.documentElement.removeAttribute('data-locked'); } catch (e) { /* لا شيء */ }
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);

  window.amanLock = { lock, setupPin, disablePin, patch, patchK, kPage, startKiosk, exitKiosk, cfg, checkPin, isLocked: () => locked, isKiosk: () => kioskFlag, diagnose, _wait: wait };
})();
