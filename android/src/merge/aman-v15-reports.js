/* ======================================================================
   v15.6 — المرحلة 6: التقارير والطباعة (البنود 70–78)
   جافاسكربت عادي (بدون Vue وبدون بناء) على نمط ملفات merge السابقة. يضيف صفحة «التقارير والطباعة» ولا يغيّر أي مفتاح تخزين
   موجود؛ التقارير المحفوظة في مفتاح جديد منفصل ins_reports. لو فشل أي جزء تبقى بقية الصفحات كما هي.
   70 منشئ تقارير مرن + حفظ باسمه • 71 تصدير Excel/PDF/طباعة • 72 تقرير شهري بضغطة • 73 توقع زيادات يناير
   74 ملف الموظف الكامل PDF • 75 معاينة الطباعة داخل الصفحة • 76 PDF مباشر • 77 قوالب (حافظة/كشف مرتبات/إداري) • 78 الوجهان
   ====================================================================== */
(function () {
  'use strict';
  if (typeof R === 'undefined' || typeof S === 'undefined' || typeof NAV === 'undefined') return;

  const KEY = 'ins_reports', FCKEY = 'ins_rpt_fc';
  const E = (s) => esc(s);
  const q$ = (s, r) => (r || document).querySelector(s);
  const num = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
  const mm = (n) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dd = (s) => (s ? (typeof dmy === 'function' ? dmy(s) : s) : '');
  const clamp = (w, lo, hi) => Math.min(Math.max(+w || 0, lo), hi);
  const isAct = (e) => e.status == 'active';
  const cnm = (id) => (typeof cn === 'function' ? cn(id) : '—');
  const safeName = (s) => String(s || 'تقرير').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
  const toastX = (m, ok) => { try { toast(m, ok ? 1 : undefined); } catch (e) { /* لا شيء */ } };
  const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toastX('تعذر الحفظ (مساحة التخزين ممتلئة؟)'); return false; } };
  const uid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* الشعار كـ data URL (حتى يظهر في المعاينة وفي ملفات الطباعة المؤقتة) */
  let LOGO64 = '';
  try { fetch('new-logo-mark-transparent.png').then((r) => r.blob()).then((b) => { const fr = new FileReader(); fr.onload = () => { LOGO64 = String(fr.result || ''); }; fr.readAsDataURL(b); }).catch(() => {}); } catch (e) { /* لا شيء */ }
  const logoImg = () => (LOGO64 ? '<img src="' + LOGO64 + '" alt="">' : '');

  /* ============================ مصادر البيانات والأعمدة (70) ============================ */
  // عمود: [مفتاح, عنوان, نوع (t نص/d تاريخ/m مبلغ/n عدد), دالة القيمة, قابل للتجميع]
  const shares = (e) => (isAct(e) ? calc(e) : { w: 0, a: 0, b: 0 });
  const EMP_COLS = [
    ['name', 'الاسم', 't', (e) => e.name],
    ['code', 'الكود', 't', (e) => e.code],
    ['co', 'الشركة', 't', (e) => cnm(e.cid), 1],
    ['job', 'الوظيفة', 't', (e) => e.job, 1],
    ['insno', 'الرقم التأميني', 't', (e) => e.insno],
    ['nid', 'الرقم القومي', 't', (e) => e.nid],
    ['start', 'تاريخ الالتحاق', 'd', (e) => e.start],
    ['end', 'تاريخ الاستقالة', 'd', (e) => (isAct(e) ? '' : e.end)],
    ['status', 'الحالة', 't', (e) => (isAct(e) ? 'مؤمن عليه' : (e.rtype || 'مستقيل')), 1],
    ['wage', 'الأجر', 'm', (e) => +e.wage || 0],
    ['insw', 'الأجر التأميني', 'm', (e) => shares(e).w],
    ['ded', 'حصة العامل', 'm', (e) => shares(e).a],
    ['erp', 'حصة صاحب العمل', 'm', (e) => shares(e).b],
    ['tot', 'الإجمالي المستحق', 'm', (e) => shares(e).a + shares(e).b],
    ['reqIn', 'طلب الالتحاق', 't', (e) => e.reqIn],
    ['reqOut', 'طلب الاستقالة', 't', (e) => e.reqOut],
    ['ndocs', 'عدد المستندات', 'n', (e) => (e.docs || []).length]
  ];
  const REQ_COLS = [
    ['name', 'الاسم', 't', (r) => r.name], ['code', 'الكود', 't', (r) => r.code], ['nid', 'الرقم القومي', 't', (r) => r.nid],
    ['job', 'الوظيفة', 't', (r) => r.job, 1], ['cname', 'الشركة', 't', (r) => r.cname || (r.cid ? cnm(r.cid) : ''), 1],
    ['hdate', 'موعد التعيين', 'd', (r) => r.hdate], ['status', 'الحالة', 't', (r) => r.status, 1], ['wage', 'الأجر', 'm', (r) => +r.wage || 0]
  ];
  const COMP_COLS = [
    ['name', 'الشركة', 't', (c) => c.name], ['n', 'إجمالي الموظفين', 'n', (c) => c.s.n], ['act', 'مؤمن عليهم', 'n', (c) => c.s.act], ['res', 'مستقيلون', 'n', (c) => c.s.res],
    ['w', 'الأجور التأمينية', 'm', (c) => c.s.w], ['a', 'حصة العاملين', 'm', (c) => c.s.a], ['b', 'حصة أصحاب العمل', 'm', (c) => c.s.b],
    ['t', 'الإجمالي الشهري', 'm', (c) => c.s.t], ['y', 'الإجمالي السنوي', 'm', (c) => c.s.t * 12]
  ];
  const CAR_COLS = [
    ['plate', 'اللوحة', 't', (c) => c.plate], ['type', 'النوع', 't', (c) => c.type, 1], ['licExp', 'انتهاء الترخيص', 'd', (c) => c.licExp],
    ['insExp', 'انتهاء التأمين', 'd', (c) => c.insExp], ['inspExp', 'انتهاء الفحص', 'd', (c) => c.inspExp]
  ];
  const SRC = {
    emp: { label: 'الموظفون المؤمن عليهم', cols: EMP_COLS, rows: () => S.emps || [], flt: ['co', 'status', 'q'], def: ['name', 'code', 'co', 'job', 'start', 'status', 'wage'] },
    req: { label: 'طلبات الدخول', cols: REQ_COLS, rows: () => (typeof Q === 'function' ? Q() : S.reqs || []), flt: ['co', 'status', 'q'], def: ['name', 'job', 'cname', 'hdate', 'status'] },
    comp: { label: 'الشركات (ملخص مالي)', cols: COMP_COLS, rows: () => (S.companies || []).map((c) => ({ id: c.id, name: c.name, s: stats(c.id) })), flt: [], def: ['name', 'act', 'res', 'w', 'a', 'b', 't', 'y'] },
    cars: { label: 'السيارات والتراخيص', cols: CAR_COLS, rows: () => (typeof CS === 'function' ? CS() : S.cars || []), flt: ['q'], def: ['plate', 'type', 'licExp', 'insExp', 'inspExp'] }
  };
  const colOf = (src, k) => SRC[src].cols.find((c) => c[0] == k);
  const newSpec = (src) => { src = src || 'emp'; return { id: '', name: '', src, cols: SRC[src].def.slice(), co: '', status: '', q: '', sort: '', dir: 1, group: '' }; };

  function applyFilter(src, rows, sp) {
    const F = SRC[src].flt, term = String(sp.q || '').trim().toLowerCase();
    return rows.filter((r) => {
      if (F.includes('co') && sp.co) { if (src == 'emp' ? r.cid != sp.co : (r.cid ? r.cid != sp.co : (r.cname || '') != cnm(sp.co))) return false; }
      if (F.includes('status') && sp.status) { const st = src == 'emp' ? (isAct(r) ? 'active' : 'resigned') : r.status; if (st != sp.status) return false; }
      if (F.includes('q') && term) { const hay = SRC[src].cols.map((c) => String(c[3](r) == null ? '' : c[3](r))).join(' ').toLowerCase(); if (!hay.includes(term)) return false; }
      return true;
    });
  }
  const showV = (t, v) => (t == 'm' ? mm(v) : t == 'n' ? num(v) : t == 'd' ? dd(v) : (v == null ? '' : String(v)));

  /* يشغّل مواصفة تقرير ويعيد جدولًا جاهزًا للعرض والتصدير */
  function runSpec(sp) {
    const def = SRC[sp.src] || SRC.emp;
    const cols = sp.cols.map((k) => colOf(sp.src, k)).filter(Boolean);
    let rows = applyFilter(sp.src, def.rows(), sp);
    const sk = sp.sort && colOf(sp.src, sp.sort), gk = sp.group && colOf(sp.src, sp.group);
    const cmp = (c) => (a, b) => { const x = c[3](a), y = c[3](b); const r = (c[2] == 'm' || c[2] == 'n') ? (+x || 0) - (+y || 0) : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'ar'); return r * (sp.dir < 0 ? -1 : 1); };
    rows = rows.slice();
    if (sk) rows.sort(cmp(sk));
    if (gk) { const keep = new Map(rows.map((r, i) => [r, i])); rows.sort((a, b) => String(gk[3](a) || '').localeCompare(String(gk[3](b) || ''), 'ar') || keep.get(a) - keep.get(b)); }
    const sums = (list) => cols.map((c) => (c[2] == 'm' || c[2] == 'n') ? list.reduce((s, r) => s + (+c[3](r) || 0), 0) : null);
    const out = [];
    const line = (kind, list, label) => { const s = sums(list); out.push({ k: kind, raw: cols.map((c, i) => (i == 0 && s[i] == null ? label : s[i])), cells: cols.map((c, i) => (i == 0 && s[i] == null ? label : s[i] == null ? '' : showV(c[2], s[i]))) }); };
    const body = (r) => out.push({ k: 'row', raw: cols.map((c) => { const v = c[3](r); return (c[2] == 'm' || c[2] == 'n') ? (+v || 0) : (c[2] == 'd' ? dd(v) : (v == null ? '' : String(v))); }), cells: cols.map((c) => showV(c[2], c[3](r))) });
    if (gk) {
      let cur = null, buf = [];
      const flush = () => { if (buf.length) line('sub', buf, 'مجموع ' + (cur || '—') + ' (' + num(buf.length) + ')'); buf = []; };
      rows.forEach((r) => { const g = String(gk[3](r) || ''); if (cur !== null && g !== cur) flush(); cur = g; body(r); buf.push(r); });
      flush();
    } else rows.forEach(body);
    if (rows.length && cols.some((c) => c[2] == 'm' || c[2] == 'n')) line('tot', rows, 'الإجمالي (' + num(rows.length) + ')');
    const co = sp.co ? cnm(sp.co) : '';
    return { title: sp.name || (def.label + (co ? ' — ' + co : '')), sub: [co, sp.status && (sp.status == 'active' ? 'مؤمن عليهم' : sp.status == 'resigned' ? 'مستقيلون' : sp.status), sp.q && ('بحث: ' + sp.q)].filter(Boolean).join(' • '), cols: cols.map((c) => ({ k: c[0], l: c[1], t: c[2] })), rows: out, n: rows.length };
  }
  const tableHtml = (ds) => '<table><thead><tr><th>م</th>' + ds.cols.map((c) => '<th>' + E(c.l) + '</th>').join('') + '</tr></thead><tbody>' +
    (() => { let i = 0; return ds.rows.map((r) => '<tr class="' + r.k + '"><td>' + (r.k == 'row' ? ++i : '') + '</td>' + r.cells.map((v, j) => '<td' + ((ds.cols[j].t == 'm' || ds.cols[j].t == 'n') ? ' class=n' : '') + '>' + E(v) + '</td>').join('') + '</tr>').join('') || '<tr><td colspan="' + (ds.cols.length + 1) + '" style="text-align:center">لا توجد بيانات مطابقة</td></tr>'; })() + '</tbody></table>';

  /* ============================ بناء المستند (75/77) ============================ */
  const CSS = "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Cairo,'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;color:#111;margin:0;font-size:12px;line-height:1.55}" +
    "h1{font-size:20px;margin:0}h2{font-size:15px;margin:16px 0 6px;color:#51364a;border-bottom:2px solid #714b67;padding-bottom:3px}" +
    ".hd{display:flex;align-items:center;gap:12px;border-bottom:3px solid #714b67;padding-bottom:8px;margin-bottom:12px}.hd img{height:46px}.hd .t{flex:1}.hd small{color:#555;display:block}" +
    "table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #999;padding:4px 6px;text-align:right;vertical-align:top}th{background:#eee3ea;font-weight:700}thead{display:table-header-group}tr{break-inside:avoid}" +
    "td.n{text-align:left;direction:ltr;white-space:nowrap}tr.sub td{background:#f5f0f4;font-weight:700}tr.tot td{background:#e5dfe4;font-weight:800}" +
    ".kp{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.kp div{flex:1;min-width:120px;border:1px solid #bbb;border-radius:8px;padding:8px 10px}.kp b{display:block;font-size:17px;color:#714b67}.kp span{color:#555;font-size:11px}" +
    ".sig{display:flex;gap:24px;margin-top:34px}.sig div{flex:1;text-align:center;border-top:1px solid #333;padding-top:4px}.note{color:#555;font-size:11px;margin:6px 0}" +
    ".kv{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.kv div{display:flex;gap:8px;border-bottom:1px dotted #aaa;padding:4px 0}.kv span{color:#555;min-width:110px}.kv b{flex:1}" +
    ".sheet{position:relative;overflow:hidden;page-break-after:always;break-after:page}.sheet:last-child{page-break-after:auto;break-after:auto}html.p .sheet{height:276mm}html.l .sheet{height:189mm}" +
    ".cv{height:100%;border:3px double #714b67;border-radius:14px;padding:14mm 12mm;display:flex;flex-direction:column;align-items:center;text-align:center}.cv img{height:90px;margin-bottom:6px}.cv h1{font-size:30px;margin:18px 0 4px;color:#51364a}.cv .k{font-size:15px;color:#555}.cv table{margin-top:22px;font-size:14px}.cv th{width:34%}" +
    ".ck{display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px dotted #aaa;font-size:14px}.bx{width:16px;height:16px;border:2px solid #333;display:inline-block;text-align:center;line-height:12px;font-weight:900}.ln{border-bottom:1px solid #777;height:26px}";
  const PVCSS = "html{background:#6b6b6b}body{padding:14px 0}.np{display:none!important}.page,.sheet{background:#fff;margin:0 auto 18px;box-shadow:0 2px 14px #0008;padding:10mm}html.p .page,html.p .sheet{width:210mm}html.l .page,html.l .sheet{width:297mm}html.p .page{min-height:297mm}html.l .page{min-height:210mm}html.p .sheet{height:297mm}html.l .sheet{height:210mm}.sheet::before{content:attr(data-label);position:absolute;top:2mm;left:4mm;font-size:10px;background:#714b67;color:#fff;border-radius:10px;padding:0 8px}";
  // o: { title, sub, body } أو { sheets:[{label, html}] }
  function docHtml(o, orient, pv) {
    const L = orient == 'landscape';
    const head = '<div class="hd">' + logoImg() + '<div class="t"><h1>' + E(o.title) + '</h1>' + (o.sub ? '<small>' + E(o.sub) + '</small>' : '') + '</div><div style="text-align:left"><small>Aman System — نظام إدارة التأمينات</small><small>تاريخ الإصدار: ' + E(new Date().toLocaleDateString('ar-EG')) + '</small></div></div>';
    const body = o.sheets ? o.sheets.map((s) => '<section class="sheet" data-label="' + E(s.label || '') + '">' + s.html + '</section>').join('') : '<div class="page">' + head + o.body + '</div>';
    return '<!DOCTYPE html><html lang="ar" dir="rtl" class="' + (L ? 'l' : 'p') + '"><head><meta charset="utf-8"><title>' + E(o.title) + '</title><style>' + CSS + '@page{size:A4 ' + (L ? 'landscape' : 'portrait') + ';margin:10mm}' + (pv ? PVCSS : '') + '</style></head><body>' + body + '</body></html>';
  }

  /* ============================ الطباعة وPDF (71/75/76/78) ============================ */
  function printViaFrame(html) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-99px'; document.body.appendChild(f);
    const d = f.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (x) { toastX('الطباعة غير متاحة في هذا العرض'); } setTimeout(() => f.remove(), 60000); }, 500);
  }
  async function doPrint(html, duplex) {
    if (window.desk && desk.printHtml) {
      try { const r = await desk.printHtml(html, { duplex: !!duplex }); if (r && !r.ok && r.err && !/cancel/i.test(r.err)) toastX('تعذرت الطباعة: ' + r.err); } catch (e) { toastX('تعذرت الطباعة'); }
    } else printViaFrame(html);
  }
  async function doPdf(html, filename) {
    if (window.desk && typeof desk.pdf === 'function') {
      try {
        const r = await desk.pdf(html, { filename: safeName(filename) });
        if (r && r.ok) toastX('تم حفظ ملف PDF', 1); else if (r && !r.cancel) toastX('تعذر إنشاء PDF: ' + (r.err || ''));
      } catch (e) { toastX('تعذر إنشاء PDF'); }
      return;
    }
    toastX('في نافذة الطباعة اختر الطابعة «حفظ كـ PDF» (Save as PDF). التصدير المباشر يحتاج مثبّتًا مبنيًا من الإصدار 15.6', 1);
    printViaFrame(html);
  }
  async function saveXlsx(sheets, filename) {
    if (!window.XLSX) return toastX('تعذر تحميل مكتبة Excel');
    const wb = XLSX.utils.book_new();
    sheets.forEach((s, i) => {
      const aoa = [s.cols.map((c) => c.l)].concat(s.rows.map((r) => r.raw));
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = s.cols.map((c, j) => ({ wch: Math.min(38, Math.max(c.l.length + 2, ...s.rows.slice(0, 200).map((r) => String(r.raw[j] == null ? '' : r.raw[j]).length + 2))) }));
      XLSX.utils.book_append_sheet(wb, ws, String(s.name || ('ورقة' + (i + 1))).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || ('ورقة' + (i + 1)));
    });
    wb.Workbook = { Views: [{ RTL: true }] };
    try { const dl = await getDL(); await dl.save({ filename: safeName(filename) + '.xlsx', data: XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) }); toastX('تم حفظ ملف Excel', 1); } catch (e) { if (!e || e.code != 'declined') toastX('تعذر الحفظ'); }
  }

  /* معاينة داخل الصفحة: o = { title, build(orient, pv)->html, orient, sides, xlsx() } */
  function closePreview() { const o = q$('#rpv'); if (o) { document.removeEventListener('keydown', escKey, true); o.remove(); } }
  const escKey = (e) => { if (e.key == 'Escape') { e.stopPropagation(); closePreview(); } };
  function preview(o) {
    closePreview();
    let orient = o.orient || 'portrait', zoom = 1;
    const ov = document.createElement('div'); ov.id = 'rpv'; ov.className = 'rpv'; ov.setAttribute('dir', 'rtl');
    ov.innerHTML = '<div class="rpv-bar"><b class="rpv-t">' + E(o.title) + '</b><span class="rpv-sp"></span>' +
      '<label class="rpv-l">الاتجاه <select id="rpv-or"><option value="portrait">عمودي</option><option value="landscape">أفقي</option></select></label>' +
      (o.sides ? '<label class="rpv-l"><input type="checkbox" id="rpv-dx" checked> طباعة الوجهين</label>' : '') +
      '<span class="rpv-z"><button type="button" id="rpv-zm" aria-label="تصغير">−</button><span id="rpv-zl">١٠٠٪</span><button type="button" id="rpv-zp" aria-label="تكبير">+</button></span>' +
      (o.xlsx ? '<button type="button" class="btn s sm" id="rpv-x">Excel</button>' : '') +
      '<button type="button" class="btn s sm" id="rpv-pdf">PDF</button><button type="button" class="btn sm" id="rpv-pr">طباعة</button><button type="button" class="rpv-c" id="rpv-cl" aria-label="إغلاق">×</button></div>' +
      '<iframe id="rpv-f" title="معاينة الطباعة"></iframe>';
    document.body.appendChild(ov);
    const fr = q$('#rpv-f', ov), sel = q$('#rpv-or', ov); sel.value = orient;
    const paint = () => { fr.onload = () => { try { fr.contentDocument.body.style.zoom = zoom; } catch (e) { /* لا شيء */ } }; fr.srcdoc = o.build(orient, true); };
    const dx = () => { const c = q$('#rpv-dx', ov); return c ? c.checked : false; };
    sel.onchange = () => { orient = sel.value; paint(); };
    q$('#rpv-zm', ov).onclick = () => { zoom = Math.max(.4, +(zoom - .1).toFixed(2)); q$('#rpv-zl', ov).textContent = num(Math.round(zoom * 100)) + '٪'; try { fr.contentDocument.body.style.zoom = zoom; } catch (e) { /* لا شيء */ } };
    q$('#rpv-zp', ov).onclick = () => { zoom = Math.min(2, +(zoom + .1).toFixed(2)); q$('#rpv-zl', ov).textContent = num(Math.round(zoom * 100)) + '٪'; try { fr.contentDocument.body.style.zoom = zoom; } catch (e) { /* لا شيء */ } };
    q$('#rpv-pr', ov).onclick = () => doPrint(o.build(orient, false), o.sides && dx());
    q$('#rpv-pdf', ov).onclick = () => doPdf(o.build(orient, false), o.title);
    if (o.xlsx) q$('#rpv-x', ov).onclick = () => o.xlsx();
    q$('#rpv-cl', ov).onclick = closePreview;
    document.addEventListener('keydown', escKey, true);
    paint();
    q$('#rpv-pr', ov).focus();
  }
  const previewDoc = (o, orient) => preview({ title: o.title, orient, sides: !!o.sheets && o.sheets.length > 1 && o.sides, xlsx: o.xlsx, build: (or, pv) => docHtml(o, or, pv) });

  /* ============================ التقرير الشهري (72) ============================ */
  const mo0 = () => new Date().toISOString().slice(0, 7);
  const prevMo = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  function monthDoc(mo, co) {
    const EE = (S.emps || []).filter((e) => !co || e.cid == co);
    const ins = EE.filter((e) => insIn(e, mo));
    const hires = EE.filter((e) => String(e.start || '').slice(0, 7) == mo);
    const leaves = EE.filter((e) => !isAct(e) && String(e.end || '').slice(0, 7) == mo);
    const tot = ins.reduce((o, e) => { const c = calc(e); o.w += c.w; o.a += c.a; o.b += c.b; return o; }, { w: 0, a: 0, b: 0 });
    const pend = (typeof Q === 'function' ? Q() : []).filter((r) => r.status == QS[0] && (!co || (r.cid ? r.cid == co : r.cname == cnm(co)))).length;
    const comps = (S.companies || []).filter((c) => !co || c.id == co).map((c) => { const l = ins.filter((e) => e.cid == c.id); const t = l.reduce((o, e) => { const k = calc(e); o.w += k.w; o.a += k.a; o.b += k.b; return o; }, { w: 0, a: 0, b: 0 }); return { c, n: l.length, h: hires.filter((e) => e.cid == c.id).length, l: leaves.filter((e) => e.cid == c.id).length, ...t }; });
    const mk = (cols, rows) => { const ds = { cols: cols.map(([k, l, t]) => ({ k, l, t })), rows: [], n: rows.length }; rows.forEach((r) => ds.rows.push({ k: 'row', raw: cols.map((c, i) => (c[2] == 'm' || c[2] == 'n') ? +r[i] || 0 : (r[i] == null ? '' : String(r[i]))), cells: cols.map((c, i) => showV(c[2], r[i])) })); return ds; };
    const dsC = mk([['c', 'الشركة', 't'], ['n', 'المؤمن عليهم خلال الشهر', 'n'], ['h', 'التحاقات', 'n'], ['l', 'استقالات', 'n'], ['w', 'الأجور التأمينية', 'm'], ['a', 'حصة العاملين', 'm'], ['b', 'حصة أصحاب العمل', 'm'], ['t', 'الإجمالي المستحق', 'm']], comps.map((x) => [x.c.name, x.n, x.h, x.l, x.w, x.a, x.b, x.a + x.b]));
    const dsH = mk([['n', 'الاسم', 't'], ['c', 'الشركة', 't'], ['j', 'الوظيفة', 't'], ['d', 'تاريخ الالتحاق', 'd'], ['w', 'الأجر', 'm']], hires.map((e) => [e.name, cnm(e.cid), e.job, e.start, +e.wage || 0]));
    const dsL = mk([['n', 'الاسم', 't'], ['c', 'الشركة', 't'], ['j', 'الوظيفة', 't'], ['d', 'تاريخ الاستقالة', 'd'], ['t', 'السبب', 't']], leaves.map((e) => [e.name, cnm(e.cid), e.job, e.end, e.rtype || 'استقالة']));
    const dsR = mk([['n', 'الاسم', 't'], ['c', 'الشركة', 't'], ['j', 'الوظيفة', 't'], ['w', 'الأجر', 'm'], ['i', 'الأجر التأميني', 'm'], ['a', 'حصة العامل', 'm'], ['b', 'حصة صاحب العمل', 'm']], ins.map((e) => { const k = calc(e); return [e.name, cnm(e.cid), e.job, +e.wage || 0, k.w, k.a, k.b]; }));
    const title = 'التقرير الشهري — ' + (typeof my === 'function' ? my(mo) : mo) + (co ? ' — ' + cnm(co) : '');
    const kp = [['المؤمن عليهم خلال الشهر', num(ins.length)], ['التحاقات جديدة', num(hires.length)], ['استقالات', num(leaves.length)], ['طلبات دخول بانتظار الاعتماد', num(pend)], ['الأجور التأمينية', mny(tot.w)], ['المستحق للتأمينات', mny(tot.a + tot.b)]];
    const body = '<div class="kp">' + kp.map(([l, v]) => '<div><b>' + v + '</b><span>' + E(l) + '</span></div>').join('') + '</div>' +
      '<p class="note">المحتسب: كل من كان مؤمنًا عليه في أي يوم من الشهر، بالأجر الحالي المسجّل بالبرنامج (البرنامج لا يحتفظ بأجور الشهور السابقة).</p>' +
      '<h2>ملخص الشركات</h2>' + tableHtml(dsC) + '<h2>الالتحاقات الجديدة (' + num(hires.length) + ')</h2>' + tableHtml(dsH) + '<h2>الاستقالات (' + num(leaves.length) + ')</h2>' + tableHtml(dsL);
    return { title, sub: 'تقرير شهري', body, xlsx: () => saveXlsx([{ name: 'ملخص الشركات', ...dsC }, { name: 'الالتحاقات', ...dsH }, { name: 'الاستقالات', ...dsL }, { name: 'كشف الشهر', ...dsR }], 'تقرير-شهري-' + mo + (co ? '-' + cnm(co) : '')) };
  }

  /* ============================ توقع زيادات يناير (73) ============================ */
  const fcDefaults = () => ({ min: 3200, max: 19300, emp: +((+S.cfg.emp || 0) + 0.5).toFixed(2), er: +S.cfg.er || 0, raise: 0, co: '' });
  const fcGet = () => Object.assign(fcDefaults(), ld(FCKEY, {}));
  function forecast(fc) {
    const cur = { min: +S.cfg.min, max: +S.cfg.max, emp: +S.cfg.emp, er: +S.cfg.er };
    const rows = (S.emps || []).filter((e) => isAct(e) && (!fc.co || e.cid == fc.co)).map((e) => {
      const w0 = clamp(e.wage, cur.min, cur.max), wg1 = (+e.wage || 0) * (1 + (+fc.raise || 0) / 100), w1 = clamp(wg1, +fc.min, +fc.max);
      const a0 = w0 * cur.emp / 100, b0 = w0 * cur.er / 100, a1 = w1 * fc.emp / 100, b1 = w1 * fc.er / 100;
      return { e, w0, w1, a0, b0, a1, b1, t0: a0 + b0, t1: a1 + b1, d: a1 + b1 - a0 - b0 };
    });
    const sum = (l) => l.reduce((o, r) => { ['w0', 'w1', 'a0', 'b0', 'a1', 'b1', 't0', 't1', 'd'].forEach((k) => { o[k] += r[k]; }); o.n++; return o; }, { w0: 0, w1: 0, a0: 0, b0: 0, a1: 0, b1: 0, t0: 0, t1: 0, d: 0, n: 0 });
    const byCo = (S.companies || []).filter((c) => !fc.co || c.id == fc.co).map((c) => ({ c, ...sum(rows.filter((r) => r.e.cid == c.id)) })).filter((x) => x.n);
    return { cur, rows, tot: sum(rows), byCo, affected: rows.filter((r) => Math.abs(r.d) > 0.005 || Math.abs(r.w1 - r.w0) > 0.005) };
  }
  function forecastDoc(fc) {
    const f = forecast(fc), t = f.tot;
    const mk = (cols, rows) => { const ds = { cols: cols.map(([k, l, ty]) => ({ k, l, t: ty })), rows: [], n: rows.length }; rows.forEach((r) => ds.rows.push({ k: r.k || 'row', raw: cols.map((c, i) => (c[2] == 'm' || c[2] == 'n') ? +r.v[i] || 0 : (r.v[i] == null ? '' : String(r.v[i]))), cells: cols.map((c, i) => showV(c[2], r.v[i])) })); return ds; };
    const dsC = mk([['c', 'الشركة', 't'], ['n', 'المؤمن عليهم', 'n'], ['t0', 'المستحق شهريًا الآن', 'm'], ['t1', 'المتوقع بعد يناير', 'm'], ['d', 'الفرق الشهري', 'm'], ['y', 'الفرق السنوي', 'm']],
      f.byCo.map((x) => ({ v: [x.c.name, x.n, x.t0, x.t1, x.d, x.d * 12] })).concat(f.byCo.length > 1 ? [{ k: 'tot', v: ['الإجمالي', t.n, t.t0, t.t1, t.d, t.d * 12] }] : []));
    const dsE = mk([['n', 'الاسم', 't'], ['c', 'الشركة', 't'], ['wg', 'الأجر', 'm'], ['w0', 'الأجر التأميني الآن', 'm'], ['w1', 'الأجر التأميني بعد يناير', 'm'], ['t0', 'المستحق الآن', 'm'], ['t1', 'المستحق بعد يناير', 'm'], ['d', 'الفرق الشهري', 'm']],
      f.affected.sort((p, q) => q.d - p.d).map((r) => ({ v: [r.e.name, cnm(r.e.cid), +r.e.wage || 0, r.w0, r.w1, r.t0, r.t1, r.d] })));
    const kp = [['المستحق شهريًا الآن', mny(t.t0)], ['المتوقع بعد يناير', mny(t.t1)], ['الفرق شهريًا', (t.d >= 0 ? '+' : '−') + mny(Math.abs(t.d))], ['الفرق سنويًا', (t.d >= 0 ? '+' : '−') + mny(Math.abs(t.d * 12))], ['موظفون تتغير اشتراكاتهم', num(f.affected.length) + ' من ' + num(t.n)]];
    const body = '<div class="kp">' + kp.map(([l, v]) => '<div><b>' + E(v) + '</b><span>' + E(l) + '</span></div>').join('') + '</div>' +
      '<p class="note">الفروض: الحد الأدنى ' + mny(fc.min) + ' • الحد الأقصى ' + mny(fc.max) + ' • حصة العامل ' + num(fc.emp) + '٪ • حصة صاحب العمل ' + num(fc.er) + '٪' + (+fc.raise ? ' • زيادة أجور ' + num(fc.raise) + '٪' : '') + ' (مقابل الحالي: ' + mny(f.cur.min) + ' / ' + mny(f.cur.max) + ' / ' + num(f.cur.emp) + '٪ / ' + num(f.cur.er) + '٪). تقدير للتخطيط وليس إشعارًا رسميًا؛ يُراجَع مع الهيئة القومية للتأمين الاجتماعي (القانون 148 لسنة 2019).</p>' +
      '<h2>حسب الشركة</h2>' + tableHtml(dsC) + '<h2>الموظفون الذين تتغير اشتراكاتهم (' + num(f.affected.length) + ')</h2>' + tableHtml(dsE);
    return { title: 'توقع زيادات يناير 2027 على الاشتراكات' + (fc.co ? ' — ' + cnm(fc.co) : ''), sub: 'القانون 148 لسنة 2019', body, xlsx: () => saveXlsx([{ name: 'حسب الشركة', ...dsC }, { name: 'الموظفون', ...dsE }], 'توقع-زيادات-يناير') };
  }

  /* ============================ ملف الموظف الكامل (74) ============================ */
  const kvh = (pairs) => '<div class="kv">' + pairs.filter((p) => p[1] != null && p[1] !== '').map(([k, v]) => '<div><span>' + E(k) + '</span><b>' + E(v) + '</b></div>').join('') + '</div>';
  function empInfo(e) {
    let n = null; try { n = window.a9 && a9.nid ? a9.nid(String(e.nid || '').replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632)) : null; } catch (x) { n = null; }
    return n && n.valid ? n : null;
  }
  function empFullDoc(e) {
    const c = shares(e), n = empInfo(e), fno = (typeof FNM === 'function' ? FNM().get(e.id) : '') || '';
    const age = n && n.birth ? Math.floor((Date.now() - new Date(n.birth + 'T00:00:00').getTime()) / 31557600000) : '';
    const sec = (t, h) => '<h2>' + E(t) + '</h2>' + h;
    const ds = (cols, rows) => tableHtml({ cols: cols.map((x) => ({ l: x, t: 't' })), rows: rows.map((r) => ({ k: 'row', cells: r })) });
    const docs = (e.docs || []).map((d) => [d.kind || '', d.name || '', d.size ? Math.round(d.size / 1024) + ' ك.ب' : '']);
    const moves = [...(e.moves || [])].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((m) => [dd(m.date), m.fromName || cnm(m.from), m.toName || cnm(m.to), m.note || '']);
    const notes = (e.notes || []).filter((x) => !x.arch).sort((a, b) => (!!b.pin - !!a.pin) || (b.t - a.t)).map((x) => [new Date(x.t).toLocaleDateString('ar-EG'), (x.pin ? '📌 ' : '') + x.text, x.u || '']);
    const tl = (S.log || []).filter((l) => l.eid == e.id).slice(0, 40).map((l) => [new Date(l.t).toLocaleString('ar-EG'), l.a || '', l.d || '', l.u || '']);
    const body = sec('البيانات الأساسية', kvh([['الاسم', e.name], ['الكود', e.code], ['رقم الملف', fno ? num(fno) : ''], ['الشركة', cnm(e.cid)], ['الوظيفة', e.job], ['الرقم القومي', e.nid], ['الرقم التأميني', e.insno], ['النوع', n && n.gender], ['تاريخ الميلاد', n && n.birth ? dd(n.birth) : ''], ['السن', age !== '' ? num(age) + ' سنة' : ''], ['الحالة', isAct(e) ? 'مؤمن عليه' : (e.rtype || 'مستقيل')], ['تاريخ الالتحاق', dd(e.start)], ['تاريخ الاستقالة', isAct(e) ? '' : dd(e.end)], ['طلب الالتحاق', e.reqIn ? e.reqIn + (e.reqInDate ? ' — ' + dd(e.reqInDate) : '') : ''], ['طلب الاستقالة', e.reqOut ? e.reqOut + (e.reqOutDate ? ' — ' + dd(e.reqOutDate) : '') : ''], ['انتهاء بطاقة الرقم القومي', dd(e.nidExp)]])) +
      sec('التأمينات', kvh([['الأجر المسجّل', mny(e.wage)], ['الأجر التأميني', isAct(e) ? mny(c.w) : '—'], ['حصة العامل (' + num(S.cfg.emp) + '٪)', isAct(e) ? mm(c.a) + ' ج.م' : '—'], ['حصة صاحب العمل (' + num(S.cfg.er) + '٪)', isAct(e) ? mm(c.b) + ' ج.م' : '—'], ['الإجمالي الشهري', isAct(e) ? mm(c.a + c.b) + ' ج.م' : '—']])) +
      sec('المستندات (' + num(docs.length) + ')', docs.length ? ds(['النوع', 'اسم الملف', 'الحجم'], docs) : '<p class="note">لا توجد مستندات.</p>') +
      (moves.length ? sec('سجل الانتقال بين المنشآت', ds(['التاريخ', 'من', 'إلى', 'ملاحظة'], moves)) : '') +
      (notes.length ? sec('الملاحظات', ds(['التاريخ', 'الملاحظة', 'بواسطة'], notes)) : '') +
      (tl.length ? sec('آخر العمليات على الملف', ds(['الوقت', 'العملية', 'التفاصيل', 'المستخدم'], tl)) : '');
    return { title: 'ملف الموظف الكامل — ' + e.name, sub: cnm(e.cid) + (e.job ? ' • ' + e.job : ''), body };
  }

  /* ============================ القوالب (77) والوجهان (78) ============================ */
  const DOCK = ['التحاق', 'استقالة', 'عقد العمل', 'بطاقة الرقم القومي', 'شهادة الميلاد', 'المؤهل الدراسي', 'تقرير الكشف الطبي 111', 'صحيفة الحالة الجنائية (فيش)'];
  function folderSheets(e) {
    const fno = (typeof FNM === 'function' ? FNM().get(e.id) : '') || '';
    const has = new Set((e.docs || []).map((d) => d.kind));
    const front = '<div class="cv">' + logoImg() + '<div class="k">Aman System — نظام إدارة التأمينات</div><h1>ملف المؤمن عليه</h1><div class="k">' + E(cnm(e.cid)) + '</div>' +
      '<h1 style="font-size:34px;margin-top:30px">' + E(e.name) + '</h1><table><tbody>' +
      [['رقم الملف', fno ? num(fno) : ''], ['الكود', e.code], ['الرقم التأميني', e.insno], ['الرقم القومي', e.nid], ['الوظيفة', e.job], ['تاريخ الالتحاق', dd(e.start)], ['الحالة', isAct(e) ? 'مؤمن عليه' : (e.rtype || 'مستقيل') + (e.end ? ' — ' + dd(e.end) : '')]].map(([k, v]) => '<tr><th>' + E(k) + '</th><td>' + E(v == null ? '' : v) + '</td></tr>').join('') + '</tbody></table></div>';
    const back = '<div style="padding:4mm 2mm"><h2 style="margin-top:0">محتويات الملف</h2>' + DOCK.map((k) => '<div class="ck"><span class="bx">' + (has.has(k) ? '✓' : '') + '</span>' + E(k) + '</div>').join('') +
      '<h2>ملاحظات</h2>' + '<div class="ln"></div>'.repeat(7) + '<div class="sig"><div>مسؤول الملف</div><div>المراجع</div></div></div>';
    return [{ label: 'الوجه — ' + e.name, html: front }, { label: 'الظهر — ' + e.name, html: back }];
  }
  function folderDoc(emps) {
    const sheets = []; emps.forEach((e) => folderSheets(e).forEach((s) => sheets.push(s)));
    return { title: emps.length == 1 ? 'حافظة ملف — ' + emps[0].name : 'حافظات ملفات (' + num(emps.length) + ')', sheets, sides: true };
  }
  function payrollDoc(co, mo) {
    const list = (S.emps || []).filter((e) => (!co || e.cid == co) && insIn(e, mo)).sort((a, b) => cnm(a.cid).localeCompare(cnm(b.cid), 'ar') || String(a.name).localeCompare(String(b.name), 'ar'));
    const cols = [['name', 'الاسم', 't'], ['code', 'الكود', 't'], ['insno', 'الرقم التأميني', 't'], ['w', 'الأجر', 'm'], ['i', 'الأجر التأميني', 'm'], ['a', 'حصة العامل', 'm'], ['b', 'حصة صاحب العمل', 'm'], ['t', 'الإجمالي', 'm'], ['sg', 'التوقيع', 't']];
    const raw = list.map((e) => { const k = calc(e); return [e.name, e.code, e.insno, +e.wage || 0, k.w, k.a, k.b, k.a + k.b, '']; });
    const tot = [0, 0, 0, 0, 0].map((_, i) => raw.reduce((s, r) => s + r[3 + i], 0));
    const ds = { cols: cols.map(([k, l, t]) => ({ k, l, t })), n: raw.length, rows: raw.map((r) => ({ k: 'row', raw: r, cells: cols.map((c, i) => showV(c[2], r[i])) })).concat(raw.length ? [{ k: 'tot', raw: ['الإجمالي (' + num(raw.length) + ')', '', '', ...tot, ''], cells: ['الإجمالي (' + num(raw.length) + ')', '', '', ...tot.map((v) => mm(v)), ''] }] : []) };
    const t = 'كشف مرتبات — ' + (typeof my === 'function' ? my(mo) : mo) + (co ? ' — ' + cnm(co) : '');
    return { title: t, sub: 'محتسب بالأجور الحالية المسجّلة بالبرنامج', body: tableHtml(ds) + '<div class="sig"><div>المحاسب</div><div>مدير الموارد البشرية</div><div>المدير العام</div></div>', xlsx: () => saveXlsx([{ name: 'كشف المرتبات', ...ds }], 'كشف-مرتبات-' + mo + (co ? '-' + cnm(co) : '')) };
  }
  function adminDoc(co) {
    const cs = (S.companies || []).filter((c) => !co || c.id == co), st = co ? stats(co) : stats();
    const reqs = (typeof Q === 'function' ? Q() : []).filter((r) => !co || (r.cid ? r.cid == co : r.cname == cnm(co)));
    const byS = QS.map((s) => [s, reqs.filter((r) => r.status == s).length]);
    let al = []; try { al = alerts(); } catch (e) { al = []; }
    const ds = runSpec({ ...newSpec('comp'), cols: ['name', 'act', 'res', 'w', 'a', 'b', 't', 'y'] });
    if (co) { ds.rows = ds.rows.filter((r) => r.k == 'row' && r.cells[0] == cnm(co)); }
    const kp = [['الشركات', num(cs.length)], ['مؤمن عليهم حاليًا', num(st.act)], ['مستقيلون', num(st.res)], ['الأجور التأمينية', mny(st.w)], ['المستحق شهريًا', mny(st.t)], ['المستحق سنويًا', mny(st.t * 12)]];
    const rk = { r: 'عاجل', w: 'مراجعة', i: 'ملاحظة' };
    const body = '<div class="kp">' + kp.map(([l, v]) => '<div><b>' + E(v) + '</b><span>' + E(l) + '</span></div>').join('') + '</div>' +
      '<h2>الشركات</h2>' + tableHtml(ds) + '<h2>طلبات الدخول</h2>' + tableHtml({ cols: [{ l: 'الحالة', t: 't' }, { l: 'العدد', t: 'n' }], rows: byS.map((x) => ({ k: 'row', cells: [x[0], num(x[1])] })) }) +
      '<h2>التنبيهات الحالية (' + num(al.length) + ')</h2>' + (al.length ? tableHtml({ cols: [{ l: 'الأهمية', t: 't' }, { l: 'التنبيه', t: 't' }], rows: al.slice(0, 40).map((a) => ({ k: 'row', cells: [rk[a.s] || '', String(a.t).replace(/<[^>]*>/g, '')] })) }) : '<p class="note">لا توجد تنبيهات.</p>') +
      '<div class="sig"><div>إعداد</div><div>اعتماد</div></div>';
    return { title: 'تقرير إداري' + (co ? ' — ' + cnm(co) : ''), sub: 'ملخص لحالة التأمينات والموظفين', body, xlsx: () => saveXlsx([{ name: 'الشركات', ...ds }], 'تقرير-إداري') };
  }

  /* ============================ صفحة «التقارير والطباعة» ============================ */
  const ST = { tab: 'build', spec: newSpec(), mo: prevMo(), mco: '', fc: null, tpl: 'folder', tco: '', temp: '', tmo: prevMo(), fe: '', ee: '' };
  const TABS = [['build', 'منشئ التقارير'], ['month', 'تقرير شهري'], ['jan', 'زيادات يناير'], ['tpl', 'القوالب والطباعة'], ['emp', 'ملف موظف كامل']];
  const opt = (v, l, sel) => '<option value="' + E(v) + '"' + (String(sel) == String(v) ? ' selected' : '') + '>' + E(l) + '</option>';
  const coOpts = (sel, all) => opt('', all || 'كل الشركات', sel) + (S.companies || []).map((c) => opt(c.id, c.name, sel)).join('');
  const empOpts = (sel, co) => opt('', '— اختر موظفًا —', sel) + (S.emps || []).filter((e) => !co || e.cid == co).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar')).map((e) => opt(e.id, e.name + ' — ' + cnm(e.cid), sel)).join('');
  const saved = () => ld(KEY, []);

  function tabBuild() {
    const sp = ST.spec, def = SRC[sp.src];
    const selCols = sp.cols.map((k) => colOf(sp.src, k)).filter(Boolean);
    const rest = def.cols.filter((c) => !sp.cols.includes(c[0]));
    const gcols = def.cols.filter((c) => c[4]);
    const sv0 = saved();
    return '<div class="rpx-g"><div class="card"><h3>تقاريري المحفوظة</h3>' + (sv0.length ? '<div class="rpx-sv">' + sv0.map((r) => '<div class="rpx-it"><div><b>' + E(r.name) + '</b><div class="mut">' + E((SRC[r.src] || {}).label || '') + ' • ' + num(r.cols.length) + ' عمود</div></div><div class="rpx-bt"><button type="button" class="btn sm" data-a="run" data-v="' + E(r.id) + '">تشغيل</button><button type="button" class="btn s sm" data-a="edit" data-v="' + E(r.id) + '">تعديل</button><button type="button" class="btn s sm" data-a="dup" data-v="' + E(r.id) + '">نسخ</button><button type="button" class="btn s sm d" data-a="del" data-v="' + E(r.id) + '">حذف</button></div></div>').join('') + '</div>' : '<p class="mut">لا توجد تقارير محفوظة بعد. صمّم تقريرًا من الجانب الآخر واحفظه باسم.</p>') + '</div>' +
      '<div class="card"><h3>' + (sp.id ? 'تعديل تقرير' : 'تقرير جديد') + '</h3>' +
      '<label>اسم التقرير</label><input data-f="name" value="' + E(sp.name) + '" placeholder="مثال: مستقيلو شركة النيل">' +
      '<div class="rpx-r"><div><label>المصدر</label><select data-f="src">' + Object.keys(SRC).map((k) => opt(k, SRC[k].label, sp.src)).join('') + '</select></div>' +
      (def.flt.includes('co') ? '<div><label>الشركة</label><select data-f="co">' + coOpts(sp.co) + '</select></div>' : '') +
      (def.flt.includes('status') ? '<div><label>الحالة</label><select data-f="status">' + (sp.src == 'emp' ? opt('', 'الكل', sp.status) + opt('active', 'مؤمن عليهم', sp.status) + opt('resigned', 'مستقيلون', sp.status) : opt('', 'الكل', sp.status) + QS.map((s) => opt(s, s, sp.status)).join('')) + '</select></div>' : '') + '</div>' +
      (def.flt.includes('q') ? '<label>بحث نصي (اختياري)</label><input data-f="q" value="' + E(sp.q) + '" placeholder="اسم، كود، رقم…">' : '') +
      '<label>الأعمدة (بالترتيب الظاهر)</label><div class="rpx-cols">' + selCols.map((c, i) => '<div class="rpx-c"><span>' + E(c[1]) + '</span><span><button type="button" class="rpx-m" data-a="up" data-v="' + i + '" aria-label="أعلى"' + (i ? '' : ' disabled') + '>↑</button><button type="button" class="rpx-m" data-a="dn" data-v="' + i + '" aria-label="أسفل"' + (i < selCols.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="rpx-m" data-a="rm" data-v="' + i + '" aria-label="إزالة">✕</button></span></div>').join('') + '</div>' +
      (rest.length ? '<div class="rpx-add">أضف عمودًا: ' + rest.map((c) => '<button type="button" class="chip" data-a="add" data-v="' + E(c[0]) + '">+ ' + E(c[1]) + '</button>').join('') + '</div>' : '') +
      '<div class="rpx-r"><div><label>ترتيب حسب</label><select data-f="sort">' + opt('', '— بدون —', sp.sort) + selCols.map((c) => opt(c[0], c[1], sp.sort)).join('') + '</select></div><div><label>الاتجاه</label><select data-f="dir">' + opt(1, 'تصاعدي', sp.dir) + opt(-1, 'تنازلي', sp.dir) + '</select></div>' +
      (gcols.length ? '<div><label>تجميع حسب</label><select data-f="group">' + opt('', '— بدون —', sp.group) + gcols.map((c) => opt(c[0], c[1], sp.group)).join('') + '</select></div>' : '') + '</div>' +
      '<div class="row"><button type="button" class="btn" data-a="preview">معاينة وطباعة</button><button type="button" class="btn s" data-a="save">' + (sp.id ? 'حفظ التعديلات' : 'حفظ باسم') + '</button>' + (sp.id ? '<button type="button" class="btn s" data-a="new">تقرير جديد</button>' : '') + '</div></div></div>';
  }
  function tabMonth() {
    return '<div class="card"><h3>تقرير شهري بضغطة زر</h3><div class="rpx-r"><div><label>الشهر</label><input type="month" data-f="mo" value="' + E(ST.mo) + '"></div><div><label>الشركة</label><select data-f="mco">' + coOpts(ST.mco) + '</select></div></div>' +
      '<div class="row"><button type="button" class="btn" data-a="mpreview">إنشاء ومعاينة التقرير</button><button type="button" class="btn s" data-a="mcur">الشهر الحالي</button><button type="button" class="btn s" data-a="mprev">الشهر الماضي</button><button type="button" class="btn s" data-a="mxlsx">تصدير Excel (كل الأوراق)</button></div>' +
      '<p class="mut">يشمل: ملخص الشركات، الالتحاقات والاستقالات في الشهر، الطلبات المعلقة، وكشف المؤمن عليهم. الأجور المحتسبة هي الأجور الحالية المسجلة.</p></div>';
  }
  const janKpi = (t, f) => '<div><b>' + mny(t.t0) + '</b><span>المستحق شهريًا الآن</span></div><div><b>' + mny(t.t1) + '</b><span>المتوقع بعد يناير</span></div><div><b>' + (t.d >= 0 ? '+' : '−') + mny(Math.abs(t.d)) + '</b><span>الفرق شهريًا</span></div><div><b>' + (t.d >= 0 ? '+' : '−') + mny(Math.abs(t.d * 12)) + '</b><span>الفرق سنويًا</span></div><div><b>' + num(f.affected.length) + ' / ' + num(t.n) + '</b><span>موظفون تتغير اشتراكاتهم</span></div>';
  function tabJan() {
    const fc = ST.fc || (ST.fc = fcGet()), f = forecast(fc), t = f.tot;
    const inp = (k, l, st) => '<div><label>' + l + '</label><input type="number" step="' + (st || 1) + '" data-f="fc.' + k + '" value="' + E(fc[k]) + '"></div>';
    return '<div class="card"><h3>توقع زيادات يناير على الاشتراكات (القانون 148 لسنة 2019)</h3>' +
      '<div class="rpx-warn">القيم الافتراضية (حد أدنى ٣٢٠٠، حد أقصى ١٩٣٠٠، حصة العامل +٠٫٥٪) مأخوذة من أخبار منشورة عن قرارات يناير 2027 وليست من الهيئة القومية للتأمين الاجتماعي مباشرة. راجعها وعدّلها قبل الاعتماد؛ هذه الشاشة لا تغيّر إعدادات البرنامج.</div>' +
      '<div class="rpx-r">' + inp('min', 'الحد الأدنى الجديد') + inp('max', 'الحد الأقصى الجديد') + inp('emp', 'حصة العامل ٪', 0.25) + inp('er', 'حصة صاحب العمل ٪', 0.25) + inp('raise', 'زيادة أجور متوقعة ٪', 0.5) + '<div><label>الشركة</label><select data-f="fc.co">' + coOpts(fc.co) + '</select></div></div>' +
      '<div class="rpx-k" id="rpx-kpi">' + janKpi(t, f) + '</div>' +
      '<div class="row"><button type="button" class="btn" data-a="jpreview">معاينة وطباعة</button><button type="button" class="btn s" data-a="jreset">القيم الافتراضية</button></div></div>';
  }
  function tabTpl() {
    const T = ST.tpl;
    const card = (k, t, d) => '<label class="rpx-tp' + (T == k ? ' on' : '') + '"><input type="radio" name="tpl" data-f="tpl" value="' + k + '"' + (T == k ? ' checked' : '') + '><b>' + t + '</b><span>' + d + '</span></label>';
    return '<div class="card"><h3>قوالب جاهزة</h3><div class="rpx-tps">' + card('folder', 'حافظة ملف', 'وجه (غلاف) وظهر (قائمة المحتويات) — للطباعة على الوجهين') + card('payroll', 'كشف مرتبات', 'كشف شهري لشركة مع الإجماليات وخانة التوقيع') + card('admin', 'تقرير إداري', 'مؤشرات وشركات وطلبات وتنبيهات') + '</div>' +
      '<div class="rpx-r">' + (T == 'folder' ? '<div><label>الشركة</label><select data-f="tco">' + coOpts(ST.tco) + '</select></div><div><label>الموظف (اتركه فارغًا لكل مؤمن عليهم الشركة)</label><select data-f="temp">' + empOpts(ST.temp, ST.tco) + '</select></div>' : '') +
      (T == 'payroll' ? '<div><label>الشركة</label><select data-f="tco">' + coOpts(ST.tco) + '</select></div><div><label>الشهر</label><input type="month" data-f="tmo" value="' + E(ST.tmo) + '"></div>' : '') + (T == 'admin' ? '<div><label>الشركة</label><select data-f="tco">' + coOpts(ST.tco) + '</select></div>' : '') + '</div>' +
      '<div class="row"><button type="button" class="btn" data-a="tpreview">معاينة وطباعة</button></div>' +
      (T == 'folder' ? '<p class="mut">في المعاينة يظهر الوجه والظهر كصفحتين متتاليتين؛ فعّل «طباعة الوجهين» ليُرسَل أمر الطباعة على الوجهين (يلزم أن تدعم الطابعة ذلك).</p>' : '') + '</div>';
  }
  function tabEmp() {
    return '<div class="card"><h3>تقرير ملف الموظف الكامل (PDF)</h3><div class="rpx-r"><div><label>الشركة</label><select data-f="fe">' + coOpts(ST.fe) + '</select></div><div><label>الموظف</label><select data-f="ee">' + empOpts(ST.ee, ST.fe) + '</select></div></div>' +
      '<div class="row"><button type="button" class="btn" data-a="epreview"' + '>معاينة وتصدير PDF</button></div><p class="mut">يشمل البيانات الأساسية والتأمينات والمستندات وسجل الانتقال والملاحظات وآخر العمليات.</p></div>';
  }
  const BODY = { build: tabBuild, month: tabMonth, jan: tabJan, tpl: tabTpl, emp: tabEmp };
  const tabsHtml = () => '<div class="rpx-tabs" role="tablist">' + TABS.map(([k, l]) => '<button type="button" role="tab" aria-selected="' + (ST.tab == k) + '" class="rpx-tab' + (ST.tab == k ? ' on' : '') + '" data-a="tab" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
  let painting = false;
  const paintBody = () => { if (painting) return; painting = true; try { paintBody0(); } finally { painting = false; } };
  const paintBody0 = () => { const b = q$('#rpx-body'); if (b) b.innerHTML = BODY[ST.tab](); const t = q$('#rpx-tabs'); if (t) t.innerHTML = tabsHtml(); };

  /* ---- الإجراءات ---- */
  const getSaved = (id) => saved().find((r) => r.id == id);
  function specOk() { if (!ST.spec.cols.length) { toastX('اختر عمودًا واحدًا على الأقل'); return false; } return true; }
  function reportPreview(sp) { const ds = runSpec(sp); const o = { title: ds.title, sub: ds.sub, body: tableHtml(ds) + '<p class="note">عدد الصفوف: ' + num(ds.n) + '</p>', xlsx: () => saveXlsx([{ name: ds.title.slice(0, 28), ...ds }], ds.title) }; previewDoc(o, ds.cols.length > 6 ? 'landscape' : 'portrait'); }
  const act = {
    tab: (v) => { ST.tab = v; paintBody(); },
    up: (v) => { const i = +v, c = ST.spec.cols; if (i > 0) { [c[i - 1], c[i]] = [c[i], c[i - 1]]; paintBody(); } },
    dn: (v) => { const i = +v, c = ST.spec.cols; if (i < c.length - 1) { [c[i + 1], c[i]] = [c[i], c[i + 1]]; paintBody(); } },
    rm: (v) => { const c = ST.spec.cols, k = c[+v]; c.splice(+v, 1); if (ST.spec.sort == k) ST.spec.sort = ''; if (ST.spec.group == k) ST.spec.group = ''; paintBody(); },
    add: (v) => { if (!ST.spec.cols.includes(v)) ST.spec.cols.push(v); paintBody(); },
    new: () => { ST.spec = newSpec(); paintBody(); },
    preview: () => { if (specOk()) reportPreview(ST.spec); },
    save: () => {
      if (!specOk()) return;
      const sp = ST.spec; let name = String(sp.name || '').trim();
      if (!name) { toastX('اكتب اسمًا للتقرير أولًا'); const i = q$('#rpx-body [data-f=name]'); if (i) i.focus(); return; }
      const l = saved();
      if (!sp.id && l.some((r) => r.name == name)) { toastX('يوجد تقرير بنفس الاسم؛ غيّر الاسم أو افتحه للتعديل'); return; }
      const rec = { ...sp, name, id: sp.id || uid(), dir: +sp.dir || 1 };
      const i = l.findIndex((r) => r.id == rec.id); if (i >= 0) l[i] = rec; else l.push(rec);
      if (sv(KEY, l)) { ST.spec = { ...rec }; toastX('تم حفظ التقرير «' + name + '»', 1); paintBody(); }
    },
    run: (v) => { const r = getSaved(v); if (r) reportPreview(r); },
    edit: (v) => { const r = getSaved(v); if (r) { ST.spec = JSON.parse(JSON.stringify(r)); paintBody(); window.scrollTo(0, 0); } },
    dup: (v) => { const r = getSaved(v); if (!r) return; const l = saved(); let n = r.name + ' (نسخة)', k = 2; while (l.some((x) => x.name == n)) n = r.name + ' (نسخة ' + (k++) + ')'; l.push({ ...JSON.parse(JSON.stringify(r)), id: uid(), name: n }); if (sv(KEY, l)) paintBody(); },
    del: (v) => { const r = getSaved(v); if (!r) return; const go2 = () => { sv(KEY, saved().filter((x) => x.id != v)); if (ST.spec.id == v) ST.spec = newSpec(); paintBody(); }; if (typeof ask === 'function') ask('حذف التقرير «' + r.name + '»؟', go2); else if (confirm('حذف التقرير «' + r.name + '»؟')) go2(); },
    mpreview: () => previewDoc(monthDoc(ST.mo, ST.mco), 'portrait'),
    mcur: () => { ST.mo = mo0(); paintBody(); },
    mprev: () => { ST.mo = prevMo(); paintBody(); },
    mxlsx: () => monthDoc(ST.mo, ST.mco).xlsx(),
    jpreview: () => { sv(FCKEY, ST.fc); previewDoc(forecastDoc(ST.fc), 'portrait'); },
    jreset: () => { ST.fc = fcDefaults(); try { localStorage.removeItem(FCKEY); } catch (e) { /* لا شيء */ } paintBody(); },
    tpreview: () => {
      if (ST.tpl == 'folder') { const l = ST.temp ? (S.emps || []).filter((e) => e.id == ST.temp) : (S.emps || []).filter((e) => isAct(e) && (!ST.tco || e.cid == ST.tco)); if (!l.length) return toastX('لا يوجد موظفون مطابقون'); if (l.length > 150) return toastX('العدد كبير (' + num(l.length) + ')؛ اختر شركة أو موظفًا بعينه'); previewDoc(folderDoc(l), 'portrait'); }
      else if (ST.tpl == 'payroll') previewDoc(payrollDoc(ST.tco, ST.tmo), 'landscape');
      else previewDoc(adminDoc(ST.tco), 'portrait');
    },
    epreview: () => { const e = (S.emps || []).find((x) => x.id == ST.ee); if (!e) return toastX('اختر الموظف أولًا'); previewDoc(empFullDoc(e), 'portrait'); }
  };
  function onChange(el) {
    const f = el.dataset.f; let v = el.value;
    // لا نعيد رسم الصفحة عند تغيير حقل نصي/رقمي: الحدث قد يأتي أثناء ضغطة زر فيضيع الضغط. نحدّث الجزء المتأثر فقط.
    if (f == 'tpl') { ST.tpl = v; paintBody(); return; }
    if (f.startsWith('fc.')) {
      const k = f.slice(3); ST.fc[k] = (k == 'co') ? v : (v === '' ? 0 : +v); sv(FCKEY, ST.fc);
      const kp = q$('#rpx-kpi'); if (kp) { const r = forecast(ST.fc); kp.innerHTML = janKpi(r.tot, r); }
      return;
    }
    if (['mo', 'mco', 'tco', 'temp', 'tmo', 'fe', 'ee'].includes(f)) { ST[f] = v; if (f == 'tco') ST.temp = ''; if (f == 'fe') ST.ee = ''; if (f == 'tco' || f == 'fe') paintBody(); return; }
    const sp = ST.spec;
    if (f == 'src') { ST.spec = { ...newSpec(v), id: sp.id, name: sp.name }; paintBody(); return; }
    if (f == 'dir') v = +v;
    sp[f] = v;
    if (['co', 'status', 'sort', 'group', 'dir'].includes(f)) paintBody();
  }
  const root = () => q$('#view');
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('#view [data-a]'); if (!b || !q$('#rpx-body')) return;
    const a = b.dataset.a; if (act[a]) { ev.preventDefault(); try { act[a](b.dataset.v); } catch (e) { console.error('[rpx]', e); toastX('تعذر تنفيذ الإجراء'); } }
  });
  document.addEventListener('change', (ev) => { const el = ev.target; if (el && el.dataset && el.dataset.f && q$('#rpx-body') && el.closest('#view')) { try { onChange(el); } catch (e) { console.error('[rpx]', e); } } });

  /* ---- تسجيل الصفحة في القائمة ---- */
  const grp = NAV.find((g) => g[0] == 'التأمينات والمالية') || NAV[NAV.length - 1];
  if (!grp[1].some((x) => x[0] == 'rpx')) grp[1].push(['rpx', 'sheet', 'التقارير والطباعة']);
  VT.rpx = 'التقارير والطباعة'; VG.rpx = grp[0];
  R.rpx = function () { return '<div class="rpx"><div id="rpx-tabs">' + tabsHtml() + '</div><div id="rpx-body">' + BODY[ST.tab]() + '</div></div>'; };
  const _go = go;
  go = function (v) { const r = _go.apply(this, arguments); if (v == 'rpx') { try { const a = $('act'); if (a) a.innerHTML = ''; } catch (e) { /* لا شيء */ } } return r; };

  /* ---- ربط نافذة «طباعة / تصدير» القديمة (كل الصفحات): معاينة + PDF (75/76) ---- */
  const _prt = window.prt;
  if (typeof _prt === 'function') {
    window.prt = prt = function () {
      const r = _prt.apply(this, arguments);
      try {
        const b = q$('#modal button[onclick="rdirect()"]');
        if (b && b.parentNode && !q$('.rpx-x', b.parentNode)) {
          b.insertAdjacentHTML('beforebegin', '<button type="button" class="btn rpx-x" onclick="AmanRpt.previewCurrent()">' + ic('eye', 16) + ' معاينة قبل الطباعة</button>');
          b.insertAdjacentHTML('afterend', '<button type="button" class="btn s rpx-x" onclick="AmanRpt.pdfCurrent()">' + ic('down', 16) + ' تصدير PDF</button>');
        }
      } catch (e) { /* لا شيء */ }
      return r;
    };
  }
  const fixOrient = (h, or) => String(h).replace(/@page\{size:A4 (landscape|portrait)/, '@page{size:A4 ' + or);
  window.AmanRpt = {
    runSpec, docHtml, forecast, monthDoc, empFullDoc, folderDoc, payrollDoc, adminDoc, preview, closePreview, doPdf, doPrint,
    openEmpReport: (id) => { const e = (S.emps || []).find((x) => x.id == id); if (e) previewDoc(empFullDoc(e), 'portrait'); },
    previewCurrent: () => { if (typeof _r === 'undefined' || !_r) return; closeM(); preview({ title: _r.t, orient: 'landscape', build: (or, pv) => fixOrient(_r.h, or).replace('</style>', (pv ? '.np{display:none!important}html{background:#6b6b6b}body{background:#fff!important;max-width:' + (or == 'landscape' ? '297' : '210') + 'mm;margin:14px auto;padding:10mm;box-shadow:0 2px 14px #0008}' : '') + '</style>') }); },
    pdfCurrent: () => { if (typeof _r === 'undefined' || !_r) return; closeM(); doPdf(fixOrient(_r.h, 'landscape'), _r.t); }
  };
})();
