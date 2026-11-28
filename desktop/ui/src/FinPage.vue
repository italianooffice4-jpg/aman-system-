<script setup>
// صفحة «التقارير المالية» — Vue 3 + PrimeVue. نفس الحسابات (stats) والنصوص؛ إضافة: فلتر شركات فوري، ترتيب بالضغط على العناوين، ونسبة كل شركة من الإجمالي.
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Button from 'primevue/button';

const ver = ref(0);
const co = ref('');
const A = { old: () => amanSwitchFin(false) };
const companies = computed(() => { ver.value; return S.companies.map((c) => ({ v: c.id, l: c.name })); });
const rows = computed(() => {
  ver.value;
  const all = stats().t || 0;
  return S.companies.filter((c) => !co.value || c.id == co.value).map((c) => {
    const s = stats(c.id);
    return { id: c.id, name: c.name || '', act: s.act, w: s.w, a: s.a, b: s.b, t: s.t, y: s.t * 12, share: all ? s.t / all * 100 : 0 };
  });
});
const sum = computed(() => rows.value.reduce((o, r) => ({ act: o.act + r.act, w: o.w + r.w, a: o.a + r.a, b: o.b + r.b, t: o.t + r.t, y: o.y + r.y }), { act: 0, w: 0, a: 0, b: 0, t: 0, y: 0 }));
const kpis = computed(() => {
  ver.value;
  const t = co.value ? stats(co.value) : stats();
  return [kpi('coins', t.w, 'إجمالي الأجور التأمينية', '#714b67', 1), kpi('user', t.a, 'حصة العاملين (' + S.cfg.emp + '%)', '#017e84', 1), kpi('building', t.b, 'حصة أصحاب العمل (' + S.cfg.er + '%)', '#0284c7', 1), kpi('shield', t.t, 'المستحق شهريًا للتأمينات', '#16a34a', 1)];
});
const money = (n) => mny(n);
const num = (n) => fm(n);
const pct = (n) => fm(Math.round(n)) + '٪';
const icon = (n) => ic(n, 18);
function refresh() { ver.value++; }
defineExpose({ refresh });
</script>

<template>
  <div class="card aman-ui noprint">
    <div class="tb">
      <Select v-model="co" :options="companies" optionLabel="l" optionValue="v" placeholder="كل الشركات" showClear style="min-width: 13rem" />
      <span class="grow"></span>
      <Button size="small" text severity="secondary" label="الشكل القديم" @click="A.old" />
    </div>
  </div>
  <div class="grid k4 mt" v-html="kpis.join('')"></div>
  <div class="card mt aman-ui">
    <h3><span v-html="icon('layers')"></span> تفصيل لكل شركة (شهريًا / سنويًا)</h3>
    <DataTable :value="rows" dataKey="id" scrollable>
      <template #empty>لا توجد شركات</template>
      <Column field="name" header="الشركة" sortable />
      <Column field="act" header="مؤمن عليهم" sortable><template #body="{ data: r }">{{ num(r.act) }}</template><template #footer><b>{{ num(sum.act) }}</b></template></Column>
      <Column field="w" header="الأجور التأمينية" sortable><template #body="{ data: r }">{{ money(r.w) }}</template><template #footer><b>{{ money(sum.w) }}</b></template></Column>
      <Column field="a" header="حصة العامل" sortable><template #body="{ data: r }">{{ money(r.a) }}</template><template #footer><b>{{ money(sum.a) }}</b></template></Column>
      <Column field="b" header="حصة صاحب العمل" sortable><template #body="{ data: r }">{{ money(r.b) }}</template><template #footer><b>{{ money(sum.b) }}</b></template></Column>
      <Column field="t" header="الإجمالي الشهري" sortable><template #body="{ data: r }"><b>{{ money(r.t) }}</b></template><template #footer><b>{{ money(sum.t) }}</b></template></Column>
      <Column field="y" header="الإجمالي السنوي" sortable><template #body="{ data: r }">{{ money(r.y) }}</template><template #footer><b>{{ money(sum.y) }}</b></template></Column>
      <Column field="share" header="النسبة من الإجمالي" sortable><template #body="{ data: r }">{{ pct(r.share) }}</template></Column>
    </DataTable>
    <p class="mut">يُحتسب الخصم على الأجر التأميني بين الحد الأدنى والأقصى المحدّدين في الإعدادات، ويشمل المؤمن عليهم الحاليين فقط.</p>
  </div>
</template>
