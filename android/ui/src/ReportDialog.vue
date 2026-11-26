<script setup>
// نافذة تقرير عامة: نتائج أسئلة المساعد (68) وتقرير التدقيق (69). قراءة فقط + تصدير CSV (يفتح في Excel) + طباعة.
import { computed } from 'vue';
const props = defineProps({ spec: { type: Object, default: null } });
const emit = defineEmits(['close']);
const secs = computed(() => (props.spec && props.spec.sections) || []);
const total = computed(() => secs.value.reduce((n, s) => n + s.rows.length, 0));
const show = (s, r, c) => { const v = r[c.k]; return c.k === 'wage' || c.k === 'total' ? (v == null ? '' : mny(v)) : v == null ? '' : v; };
const open = (r) => { if (r.eid) { emit('close'); try { prof(r.eid); } catch (e) { /* لا شيء */ } } };
const sevCls = (s) => (s.sev === 'err' ? 'r' : s.sev === 'warn' ? 'w' : 'i');
const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function csv() {
  const out = ['\ufeff' + (props.spec.title || 'تقرير')];
  secs.value.forEach((s) => {
    if (s.title) out.push('', s.title);
    out.push(s.columns.map((c) => '"' + c.l + '"').join(','));
    s.rows.forEach((r) => out.push(s.columns.map((c) => '"' + String(show(s, r, c)).replace(/"/g, '""') + '"').join(',')));
  });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = (props.spec.title || 'تقرير').replace(/[\\/:*?"<>|]/g, '-') + '-' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function print() {
  const h = '<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + esc(props.spec.title) + '</title><style>body{font-family:Cairo,Tahoma,sans-serif;padding:18px}h1{font-size:20px}h2{font-size:15px;margin:18px 0 6px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #999;padding:4px 6px;text-align:right}th{background:#eee}p{color:#555}</style></head><body><h1>' + esc(props.spec.title) + '</h1><p>' + esc(props.spec.subtitle || '') + '</p>' +
    secs.value.map((s) => (s.title ? '<h2>' + esc(s.title) + '</h2>' : '') + '<table><tr>' + s.columns.map((c) => '<th>' + esc(c.l) + '</th>').join('') + '</tr>' + s.rows.map((r) => '<tr>' + s.columns.map((c) => '<td>' + esc(show(s, r, c)) + '</td>').join('') + '</tr>').join('') + '</table>').join('') + '</body></html>';
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; document.body.appendChild(f);
  f.contentDocument.open(); f.contentDocument.write(h); f.contentDocument.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* لا شيء */ } setTimeout(() => f.remove(), 2000); }, 250);
}
</script>

<template>
  <div v-if="spec" class="ef-ov" @mousedown.self="emit('close')" @keydown.esc="emit('close')">
    <div class="ef-box ef-wide rp-box" role="dialog" aria-label="تقرير">
      <div class="ef-head"><div class="ef-id"><b>{{ spec.title }}</b> <span class="ef-mut">{{ total }} صف</span></div><span class="ef-sp"></span>
        <button type="button" class="btn s sm" @click="csv">تصدير Excel (CSV)</button>
        <button type="button" class="btn s sm" @click="print">طباعة</button>
        <button type="button" class="ef-x" aria-label="إغلاق" @click="emit('close')">×</button></div>
      <p v-if="spec.subtitle" class="ef-mut rp-sub">{{ spec.subtitle }}</p>
      <div class="rp-body">
        <p v-if="!total" class="ef-mut" style="padding:20px;text-align:center">لا توجد نتائج مطابقة.</p>
        <section v-for="(s, i) in secs" :key="i" class="rp-sec">
          <h4 v-if="s.title"><span v-if="s.sev" class="tag" :class="sevCls(s)">{{ s.sev === 'err' ? 'خطأ' : s.sev === 'warn' ? 'مراجعة' : 'ملاحظة' }}</span> {{ s.title }}</h4>
          <div v-if="s.groups && s.groups.length" class="rp-grp"><span v-for="g in s.groups" :key="g.k" class="tag i">{{ g.k }}: {{ g.n }}</span></div>
          <div class="rp-tw"><table v-if="s.rows.length"><thead><tr><th v-for="c in s.columns" :key="c.k">{{ c.l }}</th></tr></thead>
            <tbody><tr v-for="(r, j) in s.rows.slice(0, 500)" :key="j"><td v-for="c in s.columns" :key="c.k"><a v-if="c.k === 'name' && r.eid" href="#" @click.prevent="open(r)">{{ show(s, r, c) }}</a><template v-else>{{ show(s, r, c) }}</template></td></tr></tbody></table></div>
          <p v-if="s.rows.length > 500" class="ef-mut">يُعرض أول 500 صف هنا؛ التصدير والطباعة يشملان الكل.</p>
        </section>
      </div>
    </div>
  </div>
</template>
