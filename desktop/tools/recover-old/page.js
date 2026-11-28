(async function () {
  const $ = (id) => document.getElementById(id), log = (m) => { $('log').textContent += m + '\n'; };
  const idb = () => new Promise((res) => {
    if (!indexedDB.databases) return res(null);
    indexedDB.databases().then((l) => {
      if (!(l || []).some((d) => d.name === 'ins_docs')) return res(null);
      const q = indexedDB.open('ins_docs'); q.onsuccess = () => res(q.result); q.onerror = () => res(null);
    }).catch(() => res(null));
  });
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  let S = {};
  try { S = JSON.parse(localStorage.getItem('ins_sys_v1') || '{}'); } catch (e) { log('تعذر قراءة بيانات الموظفين القديمة: ' + e); }
  const nEmp = (S.emps || []).length;
  log('موظفون في النسخة القديمة: ' + nEmp);
  const meta = await window.rec.meta(S);
  const db = await idb();
  if (!db || !db.objectStoreNames.contains('f')) {
    $('st').textContent = 'لم أجد مستندات مخزنة في هذه النسخة القديمة.';
    const sum = await window.rec.done(); show(sum, 0); return;
  }
  const store = () => db.transaction('f', 'readonly').objectStore('f');
  const keys = await req(store().getAllKeys());
  $('st').textContent = 'تم العثور على ' + keys.length + ' مستند. جارٍ حفظها كملفات في: ' + meta.dir;
  let i = 0;
  for (const k of keys) {
    try { const rec = await req(store().get(k)); await window.rec.doc(rec); } catch (e) { log('تعذر قراءة مستند ' + k + ': ' + e); }
    i++; $('pb').style.width = Math.round(i * 100 / keys.length) + '%'; $('ct').textContent = i + ' / ' + keys.length;
  }
  const sum = await window.rec.done(); show(sum, keys.length);
  function show(s, n) {
    $('st').textContent = n === 0 ? 'لم أجد مستندات مخزنة في هذه النسخة القديمة.' : 'انتهى.'; $('res').style.display = 'block';
    $('res').innerHTML = '<div class="ok">✔ تم حفظ ' + s.saved + ' مستند كملفات حقيقية</div>' +
      '<div class="mut">موجودة مسبقًا (تم تخطيها): ' + s.skipped + ' • غير مرتبطة بموظف (حُفظت في مجلد «_مستندات غير مرتبطة»): ' + s.orphan + '</div>' +
      (s.errors.length ? '<div class="bad">تعذر: ' + s.errors.length + ' (' + s.errors.slice(0, 5).join('، ') + ')</div>' : '') +
      '<div class="mut">المجلد: ' + s.dir + '</div><div style="margin-top:10px">أغلق هذه النافذة ثم افتح «Aman System» — ستظهر المستندات عند أصحابها.</div>';
  }
})();
