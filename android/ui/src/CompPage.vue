<script setup>
// صفحة «الشركات» — Vue 3 + PrimeVue. نفس البيانات (S.companies) ونفس دوال التعديل والحذف القديمة (editC/delC) والانتقال لقائمة الموظفين (empOf).
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import SearchBox from './SearchBox.vue';

const ver = ref(0);
const q = ref('');
const sort = ref('recent');
const SORTS = [['recent', 'الأحدث تحديثًا'], ['name', 'الاسم'], ['act', 'الأكثر مؤمنًا عليهم'], ['total', 'الأعلى اشتراكًا']];
const icon = (n, s) => ic(n, s || 16);
const initials = (n) => ini(n);
const A = { emps: (id) => empOf(id), edit: (id) => editC(id), del: (id) => delC(id), add: () => editC(), old: () => amanSwitchComp(false) };

const rows = computed(() => {
  ver.value;
  const nq = q.value ? nz(q.value) : '';
  let l = byRecent(S.companies.slice()).filter((c) => !nq || hay(c).includes(nq)).map((c) => {
    const s = stats(c.id);
    return { id: c.id, name: c.name || '', no: c.no || '', sector: c.sector || '', addr: c.addr || '', s, pct: s.n ? Math.round(s.act / s.n * 100) : 0 };
  });
  if (sort.value === 'name') l = l.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  else if (sort.value === 'act') l = l.slice().sort((a, b) => b.s.act - a.s.act);
  else if (sort.value === 'total') l = l.slice().sort((a, b) => b.s.t - a.s.t);
  return l;
});
const tot = computed(() => { ver.value; return stats(); });
const money = (n) => mny(n);
const num = (n) => fm(n);
function refresh() { ver.value++; }
defineExpose({ refresh });
</script>

<template>
  <div class="card aman-ui noprint">
    <div class="tb">
      <SearchBox v-model="q" class="grow" placeholder="بحث باسم الشركة أو رقم المنشأة أو النشاط" />
      <select v-model="sort" class="p-inputtext p-component at-in" style="width:auto" title="الترتيب"><option v-for="s in SORTS" :key="s[0]" :value="s[0]">{{ s[1] }}</option></select>
      <Button size="small" @click="A.add"><span v-html="icon('plus', 14)"></span> شركة جديدة</Button>
      <Button size="small" text severity="secondary" label="الشكل القديم" @click="A.old" />
    </div>
    <p class="mut" style="margin:0">{{ num(rows.length) }} شركة · {{ num(tot.act) }} مؤمن عليه · إجمالي الاشتراكات الشهرية {{ money(tot.t) }}</p>
  </div>
  <div class="grid k3 mt aman-ui">
    <div v-for="c in rows" :key="c.id" class="card">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
        <div class="av" style="border-radius:12px;width:44px;height:44px" v-html="icon('building', 22)"></div>
        <div><b style="font-size:15px">{{ c.name }}</b><div class="mut">رقم المنشأة: {{ c.no }} · {{ c.sector }}</div></div>
      </div>
      <div class="pg" style="grid-template-columns:1fr 1fr 1fr;text-align:center">
        <div><b style="font-size:18px">{{ num(c.s.act) }}</b><small>مؤمن عليهم</small></div>
        <div><b style="font-size:18px;color:var(--bad)">{{ num(c.s.res) }}</b><small>مستقيلون</small></div>
        <div><b style="font-size:18px">{{ num(c.s.n) }}</b><small>الإجمالي</small></div>
      </div>
      <div class="prog"><i :style="{ width: c.pct + '%' }"></i></div>
      <p class="mut">حصة العامل {{ money(c.s.a) }} · حصة صاحب العمل {{ money(c.s.b) }}</p>
      <p style="margin:4px 0 14px">الإجمالي الشهري: <b style="color:var(--pri2)">{{ money(c.s.t) }}</b></p>
      <div style="display:flex;gap:6px;align-items:center">
        <Button size="small" @click="A.emps(c.id)"><span v-html="icon('users', 14)"></span> الموظفون</Button>
        <Button text rounded severity="secondary" title="تعديل" @click="A.edit(c.id)"><span v-html="icon('edit', 15)"></span></Button>
        <Button text rounded severity="danger" title="حذف" @click="A.del(c.id)"><span v-html="icon('trash', 15)"></span></Button>
      </div>
    </div>
    <p v-if="!rows.length" class="mut">لا توجد شركات مطابقة.</p>
  </div>
</template>
