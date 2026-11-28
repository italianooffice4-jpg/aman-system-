'use strict';
// يحوّل مستندات النسخة القديمة (IndexedDB) إلى ملفات حقيقية داخل مكتبة البرنامج الجديد (نفس هيكل المجلدات ونفس الفهرس).
// وحدة Node خالصة (قابلة للاختبار بدون Electron). لا تحذف ولا تكتب فوق أي ملف موجود.
const path = require('path');
const { Library } = require('../../library.js');

class Recovery {
  /* S: بيانات البرنامج القديم (ins_sys_v1) — تُستخدم فقط لمعرفة صاحب كل مستند (شركة/موظف/نوع) */
  constructor(libDir, S) {
    this.lib = new Library(libDir);
    this.S = S || {};
    this.owner = new Map();
    const comp = (id) => ((this.S.companies || []).find(c => c.id === id) || {}).name || '_عام';
    for (const e of (this.S.emps || [])) for (const d of (e.docs || [])) this.owner.set(d.id, { company: comp(e.cid), who: (e.name || '_عام') + (e.nid ? ' - ' + e.nid : ''), kind: d.kind });
    for (const c of (this.S.cars || [])) for (const d of (c.docs || [])) this.owner.set(d.id, { company: 'السيارات', who: c.plate || '_عام', kind: d.kind });
    this.sum = { total: 0, saved: 0, skipped: 0, orphan: 0, bytes: 0, errors: [] };
  }
  add(rec) {
    const s = this.sum; s.total++;
    try {
      if (!rec || !rec.id || !rec.data) { s.errors.push((rec && rec.name) || '؟'); return { ok: false }; }
      if (this.lib.has(rec.id)) { s.skipped++; return { ok: true, skipped: true }; }
      const o = this.owner.get(rec.id);
      if (!o) s.orphan++;
      const r = this.lib.save({ id: rec.id, name: rec.name, type: rec.type, data: rec.data, company: o ? o.company : '_مستندات غير مرتبطة', who: o ? o.who : '_عام', kind: (o && o.kind) || 'مستندات' });
      if (!r.ok) { s.errors.push(rec.name + ': ' + r.err); return r; }
      s.saved++; s.bytes += Math.round(String(rec.data).length * 0.75);
      return r;
    } catch (e) { s.errors.push(((rec && rec.name) || '؟') + ': ' + e.message); return { ok: false }; }
  }
  summary() { return { ...this.sum, dir: this.lib.dir }; }
}
module.exports = { Recovery };
