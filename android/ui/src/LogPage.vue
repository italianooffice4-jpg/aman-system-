<script setup>
// صفحة «سجل العمليات» — Vue 3 + PrimeVue. نفس S.log (للقراءة فقط)؛ إضافة: بحث فوري وفلاتر العملية/المستخدم/التاريخ.
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import SearchBox from './SearchBox.vue';
import { maskDate } from './core/empform.js';

const ver = ref(0);
const q = ref(''), op = ref(''), user = ref(''), from = ref(''), to = ref('');
const all = ref(false);
const A = { old: () => amanSwitchLog(false) };
const logs = computed(() => { ver.value; return Array.isArray(S.log) ? S.log : []; });
const ops = computed(() => [...new Set(logs.value.map((l) => l.a).filter(Boolean))].map((v) => ({ v, l: v })));
const users = computed(() => [...new Set(logs.value.map((l) => l.u).filter(Boolean))].map((v) => ({ v, l: v })));
const dayStart = (s) => { const d = pd(s); return d ? new Date(d + 'T00:00:00').getTime() : null; };
const rows = computed(() => {
  const nq = q.value ? nz(q.value) : '', f = dayStart(from.value), t = dayStart(to.value), ids = new Set(S.emps.map((e) => e.id));
  return logs.value.filter((l) => (!op.value || l.a === op.value) && (!user.value || l.u === user.value) && (f === null || l.t >= f) && (t === null || l.t < t + 864e5) &&
    (!nq || nz((l.a || '') + ' ' + (l.d || '') + ' ' + (l.u || '')).includes(nq))).map((l, i) => ({ i, t: l.t, a: l.a || '', d: l.d || '', u: l.u || '', eid: l.eid || '', has: !!(l.eid && ids.has(l.eid)) }));
});
const bad = computed(() => (from.value && pd(from.value) === null) || (to.value && pd(to.value) === null));
const DF = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'short', timeStyle: 'medium' });   // مُنشئ واحد (toLocaleString في كل صف بطيء)
const when = (t) => DF.format(t);
const icon = (n) => ic(n, 18);
const num = (n) => fm(n);
const clear = () => { q.value = op.value = user.value = from.value = to.value = ''; };
const openFile = (id) => { if (id && S.emps.some((e) => e.id == id)) prof(id); };
function refresh() { ver.value++; }
defineExpose({ refresh });
</script>

<template>
  <div class="card aman-ui">
    <h3><span v-html="icon('history')"></span> سجل العمليات</h3>
    <div class="tb noprint">
      <SearchBox v-model="q" class="grow" placeholder="بحث في العملية أو التفاصيل أو المستخدم" />
      <Select v-model="op" :options="ops" optionLabel="l" optionValue="v" placeholder="كل العمليات" showClear style="min-width: 11rem" />
      <Select v-model="user" :options="users" optionLabel="l" optionValue="v" placeholder="كل المستخدمين" showClear style="min-width: 10rem" />
      <input :value="from" dir="ltr" inputmode="numeric" maxlength="10" class="p-inputtext p-component at-in" style="width:9rem" placeholder="من يوم/شهر/سنة" @input="from = maskDate($event.target.value)" />
      <input :value="to" dir="ltr" inputmode="numeric" maxlength="10" class="p-inputtext p-component at-in" style="width:9rem" placeholder="إلى يوم/شهر/سنة" @input="to = maskDate($event.target.value)" />
      <Button size="small" text severity="secondary" label="مسح الفلاتر" @click="clear" />
      <label class="mut" style="display:flex;gap:6px;align-items:center"><input v-model="all" type="checkbox" style="width:auto" /> عرض الكل (للطباعة)</label>
      <Button size="small" text severity="secondary" label="الشكل القديم" @click="A.old" />
    </div>
    <p v-if="bad" class="mut" style="color:var(--bad)">تاريخ غير صحيح في الفلتر؛ اكتبه بصيغة يوم/شهر/سنة.</p>
    <p class="mut">{{ num(rows.length) }} من {{ num(logs.length) }} عملية</p>
    <DataTable :value="rows" dataKey="i" scrollable :paginator="!all" :rows="50" :rowsPerPageOptions="[50, 100, 200, 400]"
      paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
      currentPageReportTemplate="{first} – {last} من {totalRecords}" sortField="t" :sortOrder="-1">
      <template #empty>لا توجد عمليات مسجلة</template>
      <Column field="t" header="الوقت" sortable><template #body="{ data: r }">{{ when(r.t) }}</template></Column>
      <Column field="a" header="العملية" sortable><template #body="{ data: r }"><span class="p-tag p-component p-tag-info"><span class="p-tag-label">{{ r.a }}</span></span></template></Column>
      <Column field="d" header="التفاصيل"><template #body="{ data: r }"><a v-if="r.has" href="#" @click.prevent="openFile(r.eid)">{{ r.d }}</a><template v-else>{{ r.d }}</template></template></Column>
      <Column field="u" header="المستخدم" sortable><template #body="{ data: r }">{{ r.u || '—' }}</template></Column>
    </DataTable>
  </div>
</template>
