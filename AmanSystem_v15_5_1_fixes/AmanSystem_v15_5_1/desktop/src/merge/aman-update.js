/* واجهة التحديث من GitHub (JS عادي بدون بناء — حتى لو تعطلت واجهة Vue يبقى التحديث متاحًا).
   تعمل فقط داخل تطبيق سطح المكتب (window.desk.updInfo). المنطق الفعلي في updater.js بجانب main.js. */
(function () {
  'use strict';
  const D = window.desk;
  if (!D || typeof D.updInfo !== 'function') return;

  let errs = 0;
  window.addEventListener('error', () => { errs++; });
  // الواجهة اشتغلت 4 ثوانٍ بلا أخطاء غير ملتقطة = نجاح التحديث (وإلا يُرجَع للنسخة السابقة عند التشغيل القادم)
  setTimeout(() => { if (!errs) D.updOk().catch(() => {}); }, 4000);

  const css = document.createElement('style');
  css.textContent = `
  #au-chip{position:fixed;left:12px;bottom:12px;z-index:1090;border:1px solid var(--bd,#3333);background:var(--card,#222);color:var(--mut,#999);border-radius:20px;padding:4px 11px;font:inherit;font-size:11.5px;cursor:pointer;opacity:.8}
  #au-chip:hover{opacity:1}#au-chip.has{background:var(--pri,#6d28d9);color:#fff;opacity:1;animation:au-p 2s infinite}
  @keyframes au-p{50%{box-shadow:0 0 0 6px rgba(109,40,217,.25)}}
  #au-bn{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:1100;width:min(560px,94vw);background:var(--card,#222);color:var(--tx,#eee);border:1px solid var(--pri2,#8b5cf6);border-radius:14px;box-shadow:0 12px 34px rgba(0,0,0,.4);padding:12px 14px;font-size:13.5px}
  #au-bn.ok{border-color:#16a34a}#au-bn b{display:block;margin-bottom:4px}
  .au-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}.au-sp{flex:1}
  .au-notes{white-space:pre-wrap;max-height:160px;overflow:auto;font-size:12.5px;color:var(--mut,#aaa);margin-top:6px}
  .au-bar{height:8px;border-radius:6px;background:var(--bd,#3335);overflow:hidden;margin-top:10px}.au-bar i{display:block;height:100%;width:0;background:var(--pri2,#8b5cf6);transition:width .2s}
  #au-ov{position:fixed;inset:0;z-index:1100;background:rgba(8,6,16,.55);display:grid;place-items:center;padding:14px}
  #au-md{width:min(520px,100%);background:var(--card,#222);color:var(--tx,#eee);border:1px solid var(--bd,#333);border-radius:16px;padding:18px;max-height:92vh;overflow:auto}
  #au-md h3{margin:0 0 10px;font-size:16px}.au-kv{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--bd,#3333);font-size:13px}.au-kv span:first-child{color:var(--mut,#999)}
  .au-msg{margin-top:10px;font-size:13px}.au-msg.bad{color:var(--bad,#ef4444)}.au-msg.warn{color:var(--warn,#f59e0b)}
  #au-ov .btn,#au-bn .btn{cursor:pointer}`;
  document.head.appendChild(css);

  const $e = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; };
  const btn = (txt, fn, cls) => { const b = $e('button', 'btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.onclick = fn; return b; };
  const mb = (n) => (n ? (n / 1048576).toFixed(1) + ' MB' : '');

  let info = null, last = null, busy = false, bn = null, ov = null;
  const chip = $e('button', '', ''); chip.id = 'au-chip'; chip.type = 'button'; chip.title = 'التحديثات';
  chip.onclick = () => openModal();
  const paintChip = () => { chip.textContent = '🔄 v' + (info ? info.version : '') + (last && last.status === 'available' ? ' · تحديث متاح' : ''); chip.classList.toggle('has', !!(last && last.status === 'available')); };

  function closeBanner() { if (bn) { bn.remove(); bn = null; } }
  function banner(r, kind) {
    closeBanner();
    bn = $e('div', kind === 'ok' ? 'ok' : ''); bn.id = 'au-bn';
    if (kind === 'ok') {
      bn.appendChild($e('b', '', '✔ تم تحديث البرنامج إلى الإصدار ' + r.version));
      if (r.notes) bn.appendChild($e('div', 'au-notes', r.notes));
      const row = $e('div', 'au-row'); row.appendChild($e('span', 'au-sp')); row.appendChild(btn('حسنًا', () => { closeBanner(); D.updAck().catch(() => {}); })); bn.appendChild(row);
    } else if (r.status === 'needs-shell') {
      bn.appendChild($e('b', '', 'إصدار جديد ' + r.latest + ' يحتاج تنصيب نسخة جديدة من البرنامج'));
      bn.appendChild($e('div', 'au-notes', r.notes || ''));
      const row = $e('div', 'au-row'); row.appendChild(btn('فتح صفحة الإصدار', () => window.open(r.releaseUrl, '_blank'))); row.appendChild($e('span', 'au-sp')); row.appendChild(btn('إغلاق', closeBanner, 's')); bn.appendChild(row);
    } else {
      bn.appendChild($e('b', '', '🔔 تحديث جديد للبرنامج: الإصدار ' + r.latest + (r.size ? ' (' + mb(r.size) + ')' : '')));
      bn.appendChild($e('div', 'au-notes', r.notes || 'لا توجد ملاحظات لهذا الإصدار.'));
      const row = $e('div', 'au-row');
      row.appendChild(btn('تحديث الآن', () => install('now')));
      row.appendChild(btn('عند التشغيل القادم', () => install('next'), 's'));
      row.appendChild($e('span', 'au-sp'));
      row.appendChild(btn('تخطي هذا الإصدار', () => { D.updSkip(r.latest).catch(() => {}); closeBanner(); }, 's'));
      row.appendChild(btn('لاحقًا', closeBanner, 's'));
      bn.appendChild(row);
      bn.appendChild($e('div', 'au-notes', 'التحديث لا يمس بياناتك. سيُعاد تحميل البرنامج — احفظ ما تعمل عليه أولًا.'));
    }
    document.body.appendChild(bn);
  }

  async function install(when) {
    if (busy) return; busy = true;
    const bar = $e('div', 'au-bar'); const fill = $e('i'); bar.appendChild(fill);
    const host = (ov && ov.querySelector('#au-md')) || bn; if (host) host.appendChild(bar);
    const msg = $e('div', 'au-msg', 'جارٍ تنزيل التحديث والتحقق منه…'); if (host) host.appendChild(msg);
    window.__auProg = (p) => { fill.style.width = (p.pct || 0) + '%'; };
    const r = await D.updInstall({ when }).catch((e) => ({ ok: false, err: String(e) }));
    busy = false; bar.remove();
    if (!r.ok) { msg.className = 'au-msg bad'; msg.textContent = 'تعذر التحديث: ' + r.err + ' (لم يتغير شيء في البرنامج)'; return; }
    if (r.when === 'next') { msg.className = 'au-msg'; msg.textContent = '✔ تم تنزيل التحديث وسيُطبَّق تلقائيًا عند فتح البرنامج المرة القادمة.'; last = null; paintChip(); return; }
    msg.className = 'au-msg'; msg.textContent = '✔ تم — جارٍ إعادة تحميل البرنامج…';
  }
  if (typeof D.onUpdProgress === 'function') D.onUpdProgress((p) => { if (window.__auProg) window.__auProg(p); });
  if (typeof D.onUpdAvail === 'function') D.onUpdAvail((r) => { last = r; paintChip(); banner(r); });

  function openModal() {
    if (ov) return;
    ov = $e('div'); ov.id = 'au-ov'; ov.onmousedown = (e) => { if (e.target === ov) closeModal(); };
    const md = $e('div'); md.id = 'au-md'; ov.appendChild(md); document.body.appendChild(ov);
    const onEsc = (e) => { if (e.key === 'Escape' && ov) { e.stopPropagation(); closeModal(); } };
    window.addEventListener('keydown', onEsc, true); ov._esc = onEsc;
    paintModal();
  }
  function closeModal() { if (!ov) return; window.removeEventListener('keydown', ov._esc, true); ov.remove(); ov = null; }
  async function paintModal(checking) {
    if (!ov) return;
    info = await D.updInfo().catch(() => info);
    const md = ov.querySelector('#au-md'); md.textContent = '';
    md.appendChild($e('h3', '', 'تحديثات البرنامج'));
    const kv = (k, v) => { const r = $e('div', 'au-kv'); r.appendChild($e('span', '', k)); r.appendChild($e('span', '', v)); md.appendChild(r); };
    kv('الإصدار الحالي', info ? info.version : '—');
    kv('مصدر التحديثات', info && info.repo && !/OWNER\//.test(info.repo) ? 'GitHub: ' + info.repo : 'غير مضبوط');
    if (info && info.lastCheck) kv('آخر فحص', new Date(info.lastCheck).toLocaleString('ar-EG'));
    if (info && info.override) kv('نسخة الواجهة', 'محدَّثة من GitHub (الأصلية ' + info.bundled + ')');
    if (info && info.rolledBack) { const m = $e('div', 'au-msg warn', 'تم الرجوع تلقائيًا للنسخة السابقة لأن الإصدار ' + info.rolledBack.from + ' لم يعمل بشكل سليم. لن يُنزَّل تلقائيًا مرة أخرى.'); md.appendChild(m); }
    if (checking) md.appendChild($e('div', 'au-msg', 'جارٍ الفحص…'));
    else if (last) {
      if (last.status === 'available') {
        md.appendChild($e('div', 'au-msg', '🔔 يتوفر الإصدار ' + last.latest + (last.size ? ' (' + mb(last.size) + ')' : '')));
        if (last.bad) md.appendChild($e('div', 'au-msg warn', 'تنبيه: هذا الإصدار فشل على هذا الجهاز من قبل.'));
        md.appendChild($e('div', 'au-notes', last.notes || ''));
        const row = $e('div', 'au-row'); row.appendChild(btn('تحديث الآن', () => install('now'))); row.appendChild(btn('عند التشغيل القادم', () => install('next'), 's')); md.appendChild(row);
      } else md.appendChild($e('div', 'au-msg' + (last.status === 'error' || last.status === 'norepo' ? ' bad' : ''), last.status === 'uptodate' ? '✔ أنت على أحدث إصدار' : (last.message || (last.status === 'needs-shell' ? 'يحتاج تنصيب نسخة جديدة' : ''))));
      if (last.status === 'needs-shell') { const row = $e('div', 'au-row'); row.appendChild(btn('فتح صفحة الإصدار', () => window.open(last.releaseUrl, '_blank'))); md.appendChild(row); }
    }
    const lab = $e('label', 'au-row'); const cb = $e('input'); cb.type = 'checkbox'; cb.checked = !info || info.auto !== false; cb.onchange = () => D.updAuto(cb.checked).catch(() => {});
    lab.appendChild(cb); lab.appendChild($e('span', '', 'فحص التحديثات تلقائيًا (عند التشغيل ثم كل 6 ساعات)')); md.appendChild(lab);
    const row = $e('div', 'au-row'); row.appendChild(btn('فحص الآن', async () => { await paintModal(true); last = await D.updCheck().catch((e) => ({ status: 'error', message: String(e) })); paintChip(); paintModal(); }));
    row.appendChild($e('span', 'au-sp')); row.appendChild(btn('إغلاق', closeModal, 's')); md.appendChild(row);
  }

  function start() {
    document.body.appendChild(chip);
    D.updInfo().then((i) => {
      info = i; paintChip();
      if (i && i.justUpdated) banner({ version: i.justUpdated, notes: i.justNotes || '' }, 'ok');
    }).catch(() => {});
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.amanUpdate = { open: openModal, check: async () => { last = await D.updCheck(); paintChip(); return last; } };
})();
