/* ======================================================================
   v15.7 — المرحلة 7: صفحة «البيانات والنسخ الاحتياطي» (واجهة طبقة SQLite)
   جافاسكربت عادي. الميزات التي تحتاج الغلاف (قاعدة SQLite، النسخ المجدول، ZIP، التدقيق) تعمل في تطبيق سطح المكتب المثبّت من الإصدار 15.7
   فقط؛ البحث الشامل وتصدير JSON يعملان في أي مكان. لا يغيّر أي مفتاح تخزين موجود.
   ====================================================================== */
(function () {
  'use strict';
  if (typeof R === 'undefined' || typeof S === 'undefined' || typeof NAV === 'undefined') return;

  const E = (s) => esc(s), q$ = (s, r) => (r || document).querySelector(s);
  const num = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
  const D = () => (window.desk && typeof window.desk.dbStatus === 'function' ? window.desk : null);
  const MAIN = 'ins_sys_v1';
  const KV = ['ins_users', 'ins_theme', 'ins_scandir', 'ins_ai_prov', 'ins_ai_url', 'ins_ai_model_openai', 'ins_ai_model_claude', 'ins_ai_model_ollama', 'ins_ui_prefs', 'ins_reports', 'ins_rpt_fc'];
  const tx = (m, ok) => { try { toast(m, ok ? 1 : undefined); } catch (e) { /* لا شيء */ } };
  const bytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' م.ب' : Math.max(1, Math.round(n / 1024)) + ' ك.ب');
  const when = (t) => (t ? new Date(t).toLocaleString('ar-EG') : '—');
  const LBL = { emps: 'الموظفون', reqs: 'طلبات الدخول', companies: 'الشركات', cars: 'السيارات', tasks: 'المهام', log: 'السجل', pay: 'كشوف المرتبات', _obj: 'الإعدادات' };

  /* ---------------- قراءة وكتابة البيانات الحالية ---------------- */
  const curMain = () => { try { return localStorage.getItem(MAIN); } catch (e) { return null; } };
  const curKv = () => { const o = {}; KV.forEach((k) => { try { const v = localStorage.getItem(k); if (v != null) o[k] = v; } catch (e) { /* لا شيء */ } }); return o; };
  const counts = (S0) => { const o = {}; Object.keys(S0 || {}).forEach((k) => { if (Array.isArray(S0[k])) o[k] = S0[k].length; }); return o; };

  /* ---------------- مرآة القاعدة: كل حفظ يُنسخ للقاعدة بعد 1.5 ثانية من آخر تغيير ---------------- */
  let tm = 0, mirrorOff = false, lastErr = '';
  const mirror = () => {
    const d = D(); if (!d || mirrorOff) return; clearTimeout(tm);
    tm = setTimeout(async () => { const m = curMain(); if (!m) return; try { const r = await d.dbSave({ main: m, kv: curKv() }); lastErr = r && r.ok ? '' : (r && r.err) || 'فشل'; } catch (e) { lastErr = String(e.message || e); } }, 1500);
  };
  if (D()) {
    const _si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k) { const r = _si.apply(this, arguments); if (this === localStorage && (k === MAIN || KV.includes(k))) mirror(); return r; };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { clearTimeout(tm); const m = curMain(); if (m) D().dbSave({ main: m, kv: curKv() }).catch(() => {}); } });
    // أول تشغيل بعد التحديث: ترحيل آمن (نسخ + تحقق) مرة واحدة. لا يغيّر ولا يحذف شيئًا من البيانات الحالية.
    setTimeout(async () => {
      try {
        const st = await D().dbStatus(); if (!st || !st.ok || st.migratedAt) { if (st && st.ok) mirror(); return; }
        const m = curMain(); if (!m) return;
        const r = await D().dbMigrate({ main: m, kv: curKv() });
        if (r && r.ok) tx('تم ترحيل البيانات إلى قاعدة SQLite والتحقق من مطابقتها', 1);
        else tx('تعذر التحقق من ترحيل القاعدة: ' + ((r && (r.err || (r.problems || []).join('؛'))) || '') + ' — بياناتك الحالية سليمة ولم تتغير');
      } catch (e) { /* لا شيء */ }
    }, 7000);
  }

  /* ---------------- بحث شامل (يعمل بالقاعدة في سطح المكتب وبالذاكرة في غيره) ---------------- */
  const norm = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632).replace(/[۰-۹]/g, (c) => c.charCodeAt(0) - 1776).replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
  const KIND = { emps: 'موظف', reqs: 'طلب دخول', companies: 'شركة', cars: 'سيارة', tasks: 'مهمة' };
  function memSearch(q, limit) {
    const toks = norm(q).split(/\s+/).filter(Boolean).slice(0, 6); if (!toks.length) return [];
    const cmap = {}; (S.companies || []).forEach((c) => { cmap[c.id] = c.name; });
    const out = [];
    for (const k of Object.keys(KIND)) {
      for (const it of (Array.isArray(S[k]) ? S[k] : [])) {
        if (!it || typeof it !== 'object') continue;
        const a = []; for (const v of Object.values(it)) { if (typeof v === 'string' ? v.length <= 200 : typeof v === 'number') a.push(v); }
        if (it.cid != null && cmap[it.cid]) a.push(cmap[it.cid]);
        const t = norm(a.join(' ')); if (!toks.every((x) => t.includes(x))) continue;
        out.push({ coll: k, kind: KIND[k], id: String(it.id == null ? '' : it.id), title: String(it.name || it.title || it.plate || ''), sub: [it.code, it.job, it.type, it.cname, it.status].filter(Boolean).join(' • ') });
        if (out.length >= limit) return out;
      }
    }
    return out;
  }
  async function runSearch(q) {
    q = String(q || '').trim(); if (!q) return { rows: [], via: '' };
    const d = D();
    if (d) { try { const st = await d.dbStatus(); if (st && st.ok && st.migratedAt) { const r = await d.dbSearch(q, 60); if (r && r.ok) return { rows: r.rows, via: 'SQLite' }; } } catch (e) { /* نرجع للذاكرة */ } }
    return { rows: memSearch(q, 60), via: 'الذاكرة' };
  }
  function openRow(r) {
    try {
      if (r.coll == 'emps' && typeof prof === 'function') prof(r.id);
      else if (r.coll == 'reqs') { qf = { c: '', q: r.title }; nv('req'); }
      else if (r.coll == 'companies') nv('comp'); else if (r.coll == 'cars') nv('cars'); else nv('dash');
    } catch (e) { tx('تعذر الفتح'); }
  }

  /* ---------------- حالة الصفحة ---------------- */
  const ST = { st: null, report: null, audit: null, srch: { q: '', rows: [], via: '' }, busy: '' };
  const card = (t, body, id) => '<div class="card dx-c"' + (id ? ' id="' + id + '"' : '') + '><h3>' + t + '</h3>' + body + '</div>';

  function secStatus() {
    const d = D(), s = ST.st;
    if (!d) return card('قاعدة البيانات', '<p class="mut">قاعدة SQLite والنسخ المجدول وتصدير ZIP والتدقيق تعمل في تطبيق سطح المكتب المثبّت من الإصدار 15.7 أو أحدث. هنا يعمل البحث الشامل وتصدير JSON فقط.</p>', 'dx-st');
    if (!s) return card('قاعدة البيانات', '<p class="mut">جارٍ القراءة…</p>', 'dx-st');
    if (!s.ok) return card('قاعدة البيانات', '<div class="dx-w">' + E(s.err || 'غير متاحة') + '<br>البرنامج يعمل بشكل طبيعي، والنسخ الاحتياطي بصيغة JSON ما زال يعمل (من صفحة الإعدادات).</div>', 'dx-st');
    const rows = Object.keys(s.counts || {}).map((k) => '<tr><td>' + E(LBL[k] || k) + '</td><td class="n">' + num(s.counts[k]) + '</td></tr>').join('');
    const cur = counts(S);
    const diff = s.migratedAt ? Object.keys(cur).filter((k) => (s.counts[k] || 0) !== cur[k] && !['log'].includes(k)) : [];
    const body = '<div class="dx-k"><div><b>' + (s.migratedAt ? '✔ مرحَّلة ومتحقَّق منها' : '— لم تُرحَّل بعد') + '</b><span>حالة القاعدة</span></div><div><b>' + E(s.engine) + '</b><span>المحرك</span></div><div><b>' + bytes(s.size) + '</b><span>حجم القاعدة</span></div><div><b>' + when(s.savedAt) + '</b><span>آخر حفظ</span></div><div><b>' + (s.integrity === 'ok' ? 'سليمة' : E(s.integrity)) + '</b><span>فحص السلامة</span></div></div>' +
      (diff.length ? '<div class="dx-w">القاعدة متأخرة عن البيانات الحالية في: ' + diff.map((k) => E(LBL[k] || k)).join('، ') + ' — تُزامَن تلقائيًا خلال ثوانٍ بعد أي حفظ، أو اضغط «ترحيل وتحقق».</div>' : '') +
      (lastErr ? '<div class="dx-w">آخر خطأ في المزامنة: ' + E(lastErr) + '</div>' : '') +
      '<div class="row"><button type="button" class="btn" data-a="migrate"' + (ST.busy ? ' disabled' : '') + '>ترحيل وتحقق الآن</button><button type="button" class="btn s" data-a="verify"' + (ST.busy ? ' disabled' : '') + '>تحقق فقط</button></div>' +
      '<p class="mut">الترحيل نسخ وليس نقلًا: بياناتك في البرنامج وفي ملف المكتبة تبقى كما هي، ويُؤخذ نسخة احتياطية قبله. لا يُعتمد إلا بعد مطابقة عدد كل جدول ومحتوى كل سجل.</p>' +
      (ST.report ? repHtml(ST.report) : '') + (rows ? '<details class="dx-d"><summary>محتويات القاعدة</summary><table class="dx-t"><tbody>' + rows + '</tbody></table></details>' : '');
    return card('قاعدة البيانات (SQLite)', body, 'dx-st');
  }
  function repHtml(r) {
    const head = r.ok ? '<div class="dx-ok">✔ المطابقة كاملة: كل الجداول والسجلات مطابقة للأصل</div>' : '<div class="dx-w">✘ فشلت المطابقة: ' + E((r.problems || [r.err || '']).join('؛ ')) + '</div>';
    return head + (r.report ? '<table class="dx-t"><thead><tr><th>الجدول</th><th>الأصل</th><th>القاعدة</th><th>غير مطابق</th></tr></thead><tbody>' + r.report.map((x) => '<tr class="' + (x.src !== x.db || x.bad ? 'bad' : '') + '"><td>' + E(LBL[x.coll] || x.coll) + '</td><td class="n">' + num(x.src) + '</td><td class="n">' + num(x.db) + '</td><td class="n">' + num(x.bad) + '</td></tr>').join('') + '</tbody></table>' : '');
  }
  function secBackup() {
    const s = ST.st; if (!D() || !s || !s.ok) return '';
    const st = s.settings || {}, list = s.backups || [];
    const body = '<div class="dx-r"><label class="dx-ck"><input type="checkbox" data-f="auto"' + (st.auto ? ' checked' : '') + '> نسخ احتياطي تلقائي</label>' +
      '<div><label>كل (ساعة)</label><input type="number" min="1" max="168" data-f="everyHours" value="' + E(st.everyHours) + '"></div><div><label>احتفظ بآخر (نسخة تلقائية)</label><input type="number" min="3" max="200" data-f="keep" value="' + E(st.keep) + '"></div></div>' +
      '<div class="row"><button type="button" class="btn" data-a="bk">نسخة احتياطية الآن</button></div>' +
      '<p class="mut">النسخ التلقائية القديمة تُحذف بعد العدد المحدد؛ النسخ اليدوية والتي تُؤخذ قبل الترحيل/الاستيراد/الاسترجاع لا تُحذف آليًا. المكان: <bdi>' + E(String(s.libDir || '') + '\\_البيانات\\نسخ') + '</bdi></p>' +
      (list.length ? '<div class="dx-l">' + list.slice(0, 30).map((b) => '<div class="dx-it"><div><b>' + E(b.name) + '</b><div class="mut">' + when(b.t) + ' • ' + bytes(b.size) + ' • ' + E(b.reason || '') + '</div></div><button type="button" class="btn s sm" data-a="restore" data-v="' + E(b.name) + '">استرجاع</button></div>').join('') + (list.length > 30 ? '<p class="mut">و ' + num(list.length - 30) + ' نسخة أقدم في المجلد.</p>' : '') + '</div>' : '<p class="mut">لا توجد نسخ بعد.</p>');
    return card('النسخ الاحتياطي المجدول', body, 'dx-bk');
  }
  function secIO() {
    const d = D();
    const body = '<div class="row"><button type="button" class="btn" data-a="expj">تصدير JSON</button>' + (d ? '<button type="button" class="btn" data-a="expz">تصدير ZIP كامل (بيانات + مستندات)</button><button type="button" class="btn s" data-a="imp">استيراد ملف…</button>' : '') + '</div>' +
      (d ? '<label class="dx-ck"><input type="checkbox" data-f="withUsers"' + (ST.withUsers ? ' checked' : '') + '> تضمين المستخدمين وكلمات مرورهم المشفّرة (لنقل البرنامج لجهاز آخر)</label>' : '') +
      '<p class="mut">لا تُصدَّر مفاتيح الذكاء الاصطناعي أبدًا. عند الاستيراد: يُتحقق من سلامة الملف ومطابقة الأعداد، ثم تُؤخذ نسخة احتياطية من بياناتك الحالية، ثم تُستبدل بياناتك بمحتوى الملف بعد تأكيدك. المستندات لا تستبدل ملفًا موجودًا.</p>';
    return card('التصدير والاستيراد', body, 'dx-io');
  }
  function secSearch() {
    const r = ST.srch;
    const body = '<input type="search" id="dx-q" data-f="q" placeholder="ابحث في الموظفين والطلبات والشركات والسيارات (اسم، كود، رقم قومي…)" value="' + E(r.q) + '" autocomplete="off">' +
      '<div id="dx-res">' + resHtml() + '</div>';
    return card('بحث شامل', body, 'dx-se');
  }
  const resHtml = () => { const r = ST.srch; if (!r.q) return ''; if (!r.rows.length) return '<p class="mut">لا نتائج.</p>'; return '<div class="mut">' + num(r.rows.length) + ' نتيجة — عبر ' + E(r.via) + '</div><div class="dx-l">' + r.rows.map((x, i) => '<div class="dx-it"><div><b>' + E(x.title) + '</b><div class="mut">' + E(x.kind) + (x.sub ? ' • ' + E(x.sub) : '') + '</div></div><button type="button" class="btn s sm" data-a="open" data-v="' + i + '">فتح</button></div>').join('') + '</div>'; };
  function secAudit() {
    if (!D()) return '';
    const a = ST.audit, li = (t, l) => l.length ? '<details class="dx-d"><summary>' + t + ' (' + num(l.length) + ')</summary><ul>' + l.slice(0, 30).map((x) => '<li><bdi>' + E(x.p || x.id) + '</bdi></li>').join('') + (l.length > 30 ? '<li>…</li>' : '') + '</ul></details>' : '';
    const body = '<div class="row"><button type="button" class="btn" data-a="audit">فحص المستندات</button></div><p class="mut">قراءة فقط: لا يحذف ولا يعدّل. يكتشف ملفات مفقودة، وملفات تغيّر محتواها منذ حفظها (للملفات المحفوظة بعد 15.7)، ومستندات في المكتبة لا يشير إليها أي موظف.</p>' +
      (a ? (a.ok ? '<div class="dx-ok">✔ تم فحص ' + num(a.checked) + ' مستندًا: لا مفقود ولا متغيّر</div>' : '<div class="dx-w">✘ وُجدت مشكلات في ' + num(a.checked) + ' مستندًا</div>') + li('مفقودة', a.missing) + li('تغيّر محتواها', a.badHash) + li('يتيمة (بلا موظف)', a.orphans) : '');
    return card('سلامة مستندات المكتبة', body, 'dx-au');
  }
  const paint = () => { const b = q$('#dx-body'); if (!b) return; const f = document.activeElement && document.activeElement.id; b.innerHTML = secStatus() + secBackup() + secIO() + secSearch() + secAudit(); if (f == 'dx-q') { const i = q$('#dx-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } };
  async function load() { const d = D(); if (d) { try { ST.st = await d.dbStatus(); } catch (e) { ST.st = { ok: false, err: String(e.message || e) }; } } paint(); }

  /* ---------------- الإجراءات ---------------- */
  const applyData = (main, kv, msg, counts0) => {
    const nowC = counts(S), newC = counts0 || counts(JSON.parse(main));
    const line = ['emps', 'companies', 'reqs', 'cars'].map((k) => (LBL[k] + ': ' + num(nowC[k] || 0) + ' ← ' + num(newC[k] || 0))).join(' • ');
    ask(msg + '\n\nالحالي ← الجديد:\n' + line + '\n\nتُؤخذ نسخة من بياناتك الحالية أولًا. متأكد؟', () => {
      try { localStorage.setItem(MAIN, main); Object.keys(kv || {}).forEach((k) => localStorage.setItem(k, kv[k])); } catch (e) { return tx('تعذر التطبيق (مساحة التخزين المحلية ممتلئة)'); }
      tx('تم التطبيق — جارٍ إعادة التحميل', 1); setTimeout(() => location.reload(), 700);
    });
  };
  const act = {
    migrate: async () => { ST.busy = 1; paint(); const r = await D().dbMigrate({ main: curMain(), kv: curKv() }); ST.busy = ''; ST.report = r; await load(); tx(r.ok ? 'تم الترحيل والتحقق بنجاح' : 'فشلت المطابقة — بياناتك الحالية لم تتأثر', r.ok); },
    verify: async () => { ST.busy = 1; paint(); const r = await D().dbVerify({ main: curMain() }); ST.busy = ''; ST.report = r; paint(); },
    bk: async () => { const r = await D().dbBackupNow(); tx(r && r.ok ? 'تم حفظ النسخة: ' + r.name : 'تعذر حفظ النسخة: ' + ((r && r.err) || ''), r && r.ok); await load(); },
    restore: async (name) => {
      const r = await D().dbReadBackup(name); if (!r || !r.ok) return tx('تعذر قراءة النسخة: ' + ((r && r.err) || ''));
      applyData(r.main, r.kv, 'استرجاع النسخة «' + name + '» سيستبدل بيانات البرنامج الحالية.', r.counts);
    },
    expj: async () => {
      const m = curMain(); if (!m) return tx('لا توجد بيانات');
      if (D()) { const r = await D().dbExport({ kind: 'json', main: m, kv: curKv(), withUsers: ST.withUsers }); if (r && r.ok) tx('تم التصدير: ' + r.path, 1); else if (r && !r.cancel) tx('تعذر التصدير: ' + (r.err || '')); return; }
      const kv = curKv(); delete kv.ins_users; const o = JSON.parse(m), c = counts(o);
      try { const dl = await getDL(); await dl.save({ filename: 'aman-' + new Date().toISOString().slice(0, 10) + '.json', data: new TextEncoder().encode(JSON.stringify({ format: 'aman-export', v: 1, kind: 'json', at: Date.now(), counts: c, S: o, kv })) }); tx('تم التصدير', 1); } catch (e) { if (!e || e.code != 'declined') tx('تعذر التصدير'); }
    },
    expz: async () => { const m = curMain(); if (!m) return tx('لا توجد بيانات'); tx('جارٍ التصدير… قد يستغرق وقتًا مع كثرة المستندات'); const r = await D().dbExport({ kind: 'zip', main: m, kv: curKv(), withDocs: true, withUsers: ST.withUsers }); if (r && r.ok) tx('تم التصدير: ' + num(r.docs) + ' مستندًا في ' + r.path, 1); else if (r && !r.cancel) tx('تعذر التصدير: ' + (r.err || '')); },
    imp: async () => {
      const p = await D().dbImportPick(); if (!p || p.cancel) return; if (!p.ok) return tx('الملف مرفوض: ' + (p.err || ''));
      const go2 = async (docs) => { const r = await D().dbImportApply({ docs }); if (!r || !r.ok) return tx('تعذر الاستيراد: ' + ((r && r.err) || '')); applyData(r.main, r.kv, 'استيراد الملف (' + when(p.at) + ')' + (r.docs ? ' — أُضيف ' + num(r.docs.added) + ' مستند وتُرك ' + num(r.docs.skipped) + ' موجودًا' : '') + ' سيستبدل بيانات البرنامج.', r.counts); };
      if (p.docs) ask('الملف يحتوي ' + num(p.docs) + ' مستندًا. هل تريد استخراجها لمكتبة المستندات الحالية؟ (لا يُستبدل أي ملف موجود)', () => go2(true)); else go2(false);
    },
    audit: async () => { const ids = []; (S.emps || []).forEach((e) => (e.docs || []).forEach((x) => { if (x && x.id != null) ids.push(String(x.id)); })); const r = await D().docsAudit(ids); if (!r || !r.ok) return tx('تعذر الفحص: ' + ((r && r.err) || '')); ST.audit = r; paint(); },
    open: (i) => { const r = ST.srch.rows[+i]; if (r) openRow(r); }
  };
  document.addEventListener('click', (ev) => { const b = ev.target.closest && ev.target.closest('#dx-body [data-a]'); if (!b) return; ev.preventDefault(); const f = act[b.dataset.a]; if (f) Promise.resolve(f(b.dataset.v)).catch((e) => { console.error('[dx]', e); tx('تعذر تنفيذ الإجراء'); }); });
  let sTm = 0;
  document.addEventListener('input', (ev) => {
    const el = ev.target; if (!el || el.id != 'dx-q' || !q$('#dx-body')) return;
    ST.srch.q = el.value; clearTimeout(sTm);
    sTm = setTimeout(async () => { const q = ST.srch.q, r = await runSearch(q); if (q !== ST.srch.q) return; ST.srch.rows = r.rows; ST.srch.via = r.via; const o = q$('#dx-res'); if (o) o.innerHTML = resHtml(); }, 220);
  });
  document.addEventListener('change', async (ev) => {
    const el = ev.target; if (!el || !el.dataset || !el.dataset.f || !q$('#dx-body') || !el.closest('#dx-body')) return;
    const f = el.dataset.f;
    if (f == 'withUsers') { ST.withUsers = el.checked; return; }
    if (['auto', 'everyHours', 'keep'].includes(f)) { const v = f == 'auto' ? el.checked : +el.value; const r = await D().dbSettings({ [f]: v }); if (r && r.ok) { ST.st.settings = r.settings; tx('تم حفظ الإعداد', 1); } }
  });

  /* ---------------- تسجيل الصفحة ---------------- */
  const grp = NAV.find((g) => g[1].some((x) => x[0] == 'set')) || NAV[NAV.length - 1];
  if (!grp[1].some((x) => x[0] == 'data')) grp[1].push(['data', 'shield', 'البيانات والنسخ']);
  VT.data = 'البيانات والنسخ الاحتياطي'; VG.data = grp[0];
  R.data = function () { return '<div class="dx"><div id="dx-body">' + secStatus() + secBackup() + secIO() + secSearch() + secAudit() + '</div></div>'; };
  const _go = go;
  go = function (v) { const r = _go.apply(this, arguments); if (v == 'data') { try { const a = $('act'); if (a) a.innerHTML = ''; } catch (e) { /* لا شيء */ } load(); } return r; };
  window.AmanData = { memSearch, runSearch, norm, load, state: ST };
})();
