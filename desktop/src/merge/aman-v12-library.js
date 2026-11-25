/* ======================================================================
   v12 — مكتبة مستندات الموظفين على القرص + حماية البيانات (سطح المكتب فقط)
   - addDocs: يحفظ الملف في مجلد المكتبة (شركة / موظف / نوع المستند) بدل IndexedDB
   - dbx: القراءة من المكتبة أولاً ثم IndexedDB (للمستندات القديمة)، والحذف ينقل لـ _المحذوفات
   - نسخة احتياطية تلقائية لبيانات البرنامج (ملف + نسخة يومية)
   ====================================================================== */
(function () {
  const D = window.desk;
  if (!D || !D.libInfo) return; // المتصفح/الموبايل: لا تغيير في السلوك
  const MIRROR = ['ins_sys_v1', 'ins_users', 'ins_theme', 'ins_scandir', 'ins_ai_prov', 'ins_ai_url', 'ins_ai_model_openai', 'ins_ai_model_claude', 'ins_ai_model_ollama'];
  const MAIN = 'ins_sys_v1';
  let L = { on: false, dir: '' };
  const ready = D.libInfo().then(i => { L = i; }).catch(() => {});

  /* ---------- 1) حفظ المستندات في المكتبة ---------- */
  const ctxOf = (o) => (o && o.plate && !o.nid)
    ? { company: 'السيارات', who: o.plate }
    : { company: (typeof cn === 'function' ? cn(o.cid) : '') || '_عام', who: (o.name || '_عام') + (o.nid ? ' - ' + o.nid : '') };

  const _addDocs = addDocs, _dbx = dbx;
  addDocs = async function (e, fl, kind) {
    await ready;
    if (!L.on) return _addDocs.apply(this, arguments);
    e.docs = e.docs || [];
    const c = ctxOf(e);
    for (const f of fl) {
      if (f.size > 40e6) { toast('الملف ' + f.name + ' أكبر من 40MB وتم تجاهله'); continue; }
      const id = uid();
      try {
        const data = await rd(f);
        const r = await D.libSave({ id, name: f.name, type: f.type, data, company: c.company, who: c.who, kind });
        if (!r || !r.ok) throw new Error((r && r.err) || 'فشل الحفظ');
        e.docs.push({ id, name: f.name, kind, type: f.type, size: f.size, lib: 1 });
      } catch (x) {
        // احتياط: لا نفقد الملف لو فشلت المكتبة، نحفظه داخل البرنامج
        try { await _dbx('put', { id, name: f.name, type: f.type, data: await rd(f) }); e.docs.push({ id, name: f.name, kind, type: f.type, size: f.size }); toast('تعذر الحفظ في المكتبة، حُفظ داخل البرنامج: ' + f.name); }
        catch (y) { toast('تعذر حفظ المستند ' + f.name); }
      }
    }
  };

  dbx = async function (m, a) {
    if (typeof a === 'string' && a !== 'cloud_base') {
      await ready;
      if (L.on) {
        if (m === 'get') { try { const r = await D.libGet(a); if (r) return r; } catch (e) {} }
        if (m === 'delete') { try { await D.libDelete(a); } catch (e) {} }
      }
    }
    return _dbx.apply(this, arguments);
  };

  /* ---------- 2) نقل المستندات القديمة (IndexedDB) إلى المكتبة ---------- */
  const allOwners = () => [...(S.emps || []), ...((typeof CS === 'function' ? CS() : []) || [])];
  const oldCount = () => allOwners().reduce((n, o) => n + (o.docs || []).filter(d => !d.lib).length, 0);

  async function migrate() {
    await ready;
    const items = [];
    allOwners().forEach(o => (o.docs || []).forEach(d => { if (!d.lib) items.push({ o, d }); }));
    if (!items.length) return toast('لا توجد مستندات قديمة للنقل', 1);
    let ok = 0, bad = 0;
    for (let i = 0; i < items.length; i++) {
      const { o, d } = items[i];
      try {
        const rec = await _dbx('get', d.id);
        if (!rec || !rec.data) { bad++; continue; }
        const c = ctxOf(o);
        const r = await D.libSave({ id: d.id, name: rec.name || d.name, type: rec.type || d.type, data: rec.data, company: c.company, who: c.who, kind: d.kind });
        if (r && r.ok) { d.lib = 1; await _dbx('delete', d.id).catch(() => {}); ok++; } else bad++;
      } catch (e) { bad++; }
      if (i % 5 === 0) toast('جارٍ النقل… ' + (i + 1) + ' / ' + items.length, 1);
    }
    save();
    toast('تم نقل ' + ok + ' مستند إلى المكتبة' + (bad ? ' — تعذر ' + bad + ' (بقيت في مكانها)' : ''), 1);
    refreshCard();
  }

  /* ---------- 3) نسخة احتياطية تلقائية للبيانات ---------- */
  const collect = (extra) => {
    const ls = {};
    MIRROR.forEach(k => { try { const v = localStorage.getItem(k); if (v != null) ls[k] = v; } catch (e) {} });
    if (extra) Object.assign(ls, extra);
    return JSON.stringify({ v: 2, t: Date.now(), ls });
  };
  let tm = 0, warned = 0;
  const schedule = (extra) => { clearTimeout(tm); tm = setTimeout(() => { D.libSaveData(collect(extra)).catch(() => {}); }, 1500); };
  const _si = Storage.prototype.setItem, _ri = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    const w = this === localStorage && MIRROR.includes(k);
    try { _si.apply(this, arguments); }
    catch (e) {
      if (w) {
        schedule({ [k]: String(v) });
        if (!warned && k === MAIN) { warned = 1; setTimeout(() => toast('تنبيه: مساحة التخزين المحلية ممتلئة. بياناتك محفوظة في ملف المكتبة (_البيانات) — خذ نسخة احتياطية وتواصل لتحسين التخزين.'), 100); }
      }
      throw e;
    }
    if (w) schedule();
  };
  Storage.prototype.removeItem = function (k) { const r = _ri.apply(this, arguments); if (this === localStorage && MIRROR.includes(k)) schedule(); return r; };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') D.libSaveData(collect()).catch(() => {}); });
  setTimeout(() => schedule(), 4000); // نسخة فور التشغيل

  async function restoreData() {
    const raw = await D.libLoadData();
    if (!raw) return toast('لا توجد نسخة بيانات في المكتبة');
    let o; try { o = JSON.parse(raw); if (!o.ls || !o.ls[MAIN]) throw 0; } catch (e) { return toast('ملف النسخة في المكتبة غير صالح'); }
    const when = o.t ? new Date(o.t).toLocaleString('ar-EG') : '—';
    ask('سيتم استبدال بيانات البرنامج الحالية بآخر نسخة في المكتبة (' + when + '). متأكد؟', () => {
      Object.keys(o.ls).forEach(k => { try { _si.call(localStorage, k, o.ls[k]); } catch (e) {} });
      location.reload();
    });
  }
  async function backupNow() {
    await D.libSaveData(collect());
    const r = await D.libSnapshot();
    toast(r && r.ok ? 'تم حفظ نسخة في: ' + r.path : 'تعذر حفظ النسخة', 1);
    refreshCard();
  }
  async function choose() {
    const r = await D.libChoose();
    if (r.cancel) return;
    if (r.err) return toast('تعذر تغيير المجلد: ' + r.err);
    L = { on: true, dir: r.dir };
    schedule();
    toast('تم تعيين مجلد المكتبة' + (r.copied ? ' ونسخ الملفات إليه' : ''), 1);
    refreshCard();
  }

  /* ---------- 4) بطاقة في الإعدادات ---------- */
  const fmt = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
  const card = () => `<div class=card id=libcard style='margin-top:16px'><h3>${ic('down', 18)} مكتبة المستندات والنسخ التلقائي</h3>
    <p class=mut>مستندات الموظفين تُحفظ كملفات حقيقية داخل المجلد: <b>شركة ← موظف ← نوع المستند</b>. وبيانات البرنامج تُنسخ تلقائياً (نسخة حالية + نسخة يومية آخر 30 يوم).</p>
    <p id=lib_info class=mut>جارٍ القراءة…</p>
    <div style='display:flex;gap:8px;flex-wrap:wrap'>
      <button class='btn s' onclick=A12.choose()>تغيير مكان المكتبة</button>
      <button class='btn s' onclick=A12.open()>فتح المجلد</button>
      <button class='btn s' id=lib_mig onclick=A12.migrate() style='display:none'></button>
      <button class='btn s' onclick=A12.backup()>نسخة احتياطية الآن</button>
      <button class='btn s d' onclick=A12.restore()>استرجاع البيانات من المكتبة</button>
    </div></div>`;
  async function refreshCard() {
    const el = document.getElementById('lib_info'); if (!el) return;
    const s = await D.libStats();
    if (!s || !s.ok) { el.textContent = 'تعذر قراءة المكتبة' + (s && s.err ? ': ' + s.err : ''); return; }
    el.innerHTML = `المجلد: <b dir=ltr>${esc(s.dir)}</b><br>المستندات: <b>${s.count}</b> ملف (${fmt(s.bytes)}) · آخر نسخة للبيانات: <b>${s.dataTime ? new Date(s.dataTime).toLocaleString('ar-EG') : '—'}</b> · نسخ يومية: <b>${s.snaps}</b>`;
    const n = oldCount(), b = document.getElementById('lib_mig');
    if (b) { b.style.display = n ? '' : 'none'; b.textContent = 'نقل ' + n + ' مستند قديم للمكتبة'; }
  }

  /* ---------- 5) إعدادات الطباعة والمسح (تُحفظ مرة واحدة) ---------- */
  const opt = (v, t, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(t)}</option>`;
  const sel = (id, label, html) => `<div><label class=mut>${label}</label><select id=${id} onchange=A12.pcSave()>${html}</select></div>`;
  const pcCard = () => `<div class=card id=pccard style='margin-top:16px'><h3>${ic('sliders', 18)} إعدادات الطباعة والمسح</h3>
    <p class=mut>اختر مرة واحدة والبرنامج يتذكر: الطباعة تتم مباشرة على الطابعة المحفوظة بدون شاشة اختيار، والمسح يتم مباشرة على الماسح المحفوظ.</p>
    <div id=pc_body class=mut>جارٍ تحميل الطابعات والماسحات…</div></div>`;
  async function refreshPc() {
    const el = document.getElementById('pc_body'); if (!el) return;
    const [cfg, prs] = await Promise.all([D.cfgGet(), D.printers()]);
    const p = cfg.print || {}, sc = cfg.scan || {};
    const defP = (prs.find(x => x.isDefault) || {}).name;
    el.className = '';
    el.innerHTML = `<div class='grid k3' style='gap:10px'>
      ${sel('pc_printer', 'الطابعة', prs.length ? prs.map(x => opt(x.name, x.label + (x.isDefault ? ' (الافتراضية)' : ''), p.printer || defP)).join('') : '<option value="">لا توجد طابعات</option>')}
      ${sel('pc_paper', 'مقاس الورق', ['A4', 'A3', 'A5', 'Letter', 'Legal'].map(v => opt(v, v, p.paper || 'A4')).join(''))}
      ${sel('pc_duplex', 'الطباعة على وجهين', opt('auto', 'تلقائي (حسب الاستمارة)', p.duplex || 'auto') + opt('always', 'دائماً', p.duplex) + opt('never', 'أبداً', p.duplex))}
      ${sel('pc_color', 'ألوان الطباعة', opt('color', 'ألوان', p.color || 'color') + opt('bw', 'أبيض وأسود', p.color))}
      ${sel('pc_ask', 'شاشة الطباعة', opt('0', 'مباشرة بدون سؤال', p.ask ? 1 : 0) + opt('1', 'اسألني قبل كل طباعة (شاشة النظام)', p.ask ? 1 : 0))}
      <div></div>
      <div><label class=mut>الماسح الضوئي</label><select id=pc_scanner onchange=A12.pcSave()><option value="${esc(sc.deviceId || '')}">${esc(sc.deviceName || 'يُختار تلقائياً عند أول مسح')}</option></select></div>
      ${sel('pc_dpi', 'دقة المسح (DPI)', [150, 200, 300, 600].map(v => opt(v, v, sc.dpi || 200)).join(''))}
      ${sel('pc_scol', 'ألوان المسح', opt('color', 'ألوان', sc.color || 'color') + opt('gray', 'رمادي', sc.color) + opt('bw', 'أبيض وأسود', sc.color))}
    </div>
    <div style='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px'><button class='btn s' onclick=A12.pcScanners()>تحديث قائمة الماسحات</button></div>
    <p class=mut style='margin-top:8px'>نوع الورق الخاص (لامع/ثقيل…) وجودة الطباعة تُضبط مرة واحدة من «تفضيلات الطباعة» للطابعة في Windows، وتُطبَّق تلقائياً.</p>`;
  }
  async function pcSave() {
    const v = id => { const e = document.getElementById(id); return e ? e.value : undefined; };
    const scSel = document.getElementById('pc_scanner');
    await D.cfgSet({
      print: { printer: v('pc_printer') || undefined, paper: v('pc_paper'), duplex: v('pc_duplex'), color: v('pc_color'), ask: v('pc_ask') === '1' },
      scan: { deviceId: v('pc_scanner') || undefined, deviceName: scSel && scSel.selectedOptions[0] ? scSel.selectedOptions[0].text : undefined, dpi: +v('pc_dpi') || 200, color: v('pc_scol') }
    });
    toast('تم حفظ الإعدادات', 1);
  }
  async function pcScanners() {
    const s = document.getElementById('pc_scanner'); if (!s) return;
    toast('جارٍ البحث عن الماسحات…', 1);
    const l = await D.scanners(), cur = s.value;
    s.innerHTML = l.length ? l.map(x => opt(x.id, x.name, cur)).join('') : '<option value="">لم يتم العثور على ماسح</option>';
    if (l.length) toast('تم العثور على ' + l.length + ' ماسح — اختر واحداً', 1);
  }

  const _set = R.set;
  R.set = function () { setTimeout(refreshCard, 60); setTimeout(refreshPc, 80); return _set.apply(this, arguments) + pcCard() + card(); };

  window.A12 = { pcSave, pcScanners, choose, migrate, backup: backupNow, restore: restoreData, open: () => D.libOpenFolder() };
})();
