<script setup>
// صفحة «الموظفون المؤمن عليهم» — Vue 3 + PrimeVue.
// تقرأ نفس البيانات والدوال القديمة (S, EL, calc, cn, prof, editE ...) فلا تغيير في البيانات ولا في المنطق.
import { ref, reactive, computed, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import SearchBox from './SearchBox.vue';
import DropPanel from './DropPanel.vue';
import { getAdv, setAdv, distinctJobs } from './core/search.js';
import { listViews, saveView, removeView } from './core/prefs.js';

const ver = ref(0);

/* ---------- المرشحات (متزامنة مع flt القديم) ---------- */
const q = ref(flt.q || '');
const comp = ref(flt.c || '');
const st = ref(flt.s || '');
const fn = ref(flt.fn || '');
const cfk = ref(flt.k || '');
watch([q, comp, st, fn, cfk], () => {
  flt.q = q.value; flt.c = comp.value; flt.s = st.value; flt.fn = fn.value; flt.k = cfk.value; ep = 0;
}, { immediate: true, flush: 'sync' });

const companies = computed(() => { ver.value; return S.companies.map(c => ({ v: c.id, l: c.name })); });
const statuses = [{ v: 'active', l: 'مؤمن عليه' }, { v: 'resigned', l: 'مستقيل' }];
const chips = computed(() => {
  ver.value;
  const rel = S.emps.map(cfOf);
  return [{ v: '', l: 'كل الحالات' }, ...CFS.map(x => ({ v: x, l: 'رسالة التأكيد: ' + x + ' (' + fm(rel.filter(c => c.st == x).length) + ')' }))];
});
const xLabel = computed(() => (flt.x ? XL[flt.x] : ''));

/* ---------- الأعمدة ---------- */
const ALL = [['fno', 'رقم الملف'], ['code', 'الكود'], ['name', 'الموظف'], ['company', 'الشركة'], ['insno', 'الرقم التأميني'], ['nid', 'الرقم القومي'], ['start', 'تاريخ الالتحاق'], ['reqIn', 'طلب الالتحاق'], ['wage', 'الأجر'], ['ded', 'خصم العامل'], ['status', 'الحالة'], ['cf', 'رسالة التأكيد'], ['reqOut', 'طلب الاستقالة'], ['upd', 'آخر تحديث']].map(x => ({ k: x[0], l: x[1] }));
const DEF = ['fno', 'name', 'company', 'insno', 'nid', 'wage', 'status', 'cf', 'upd'];
const HEAD = Object.fromEntries(ALL.map(a => [a.k, a.l]));
const FIELD = { fno: 'fno', code: 'code', name: 'name', company: 'company', insno: 'insno', nid: 'nid', start: 'start', reqIn: 'reqIn', wage: 'wage', ded: 'ded', status: 'active', cf: 'cf', reqOut: 'reqOut', upd: 'upd' };
const NOSORT = ['reqIn', 'reqOut'];
// نفس مفتاح التخزين القديم ins_ui_cols؛ الترتيب المحفوظ = ترتيب العرض. عمود «الموظف» ثابت (لا يُخفى) ويُضاف في موضعه القديم لو غاب.
const loadCols = () => {
  try {
    const j = JSON.parse(localStorage.getItem('ins_ui_cols'));
    if (Array.isArray(j) && j.every(k => ALL.some(a => a.k === k))) {
      const u = [...new Set(j)];
      if (!u.includes('name')) { const at = u.findIndex(k => k !== 'fno' && k !== 'code'); u.splice(at < 0 ? u.length : at, 0, 'name'); }
      return u;
    }
  } catch (e) {}
  return [...DEF];
};
const cols = ref(loadCols());
watch(cols, v => { try { localStorage.setItem('ins_ui_cols', JSON.stringify(v)); } catch (e) {} });
const vis = k => cols.value.includes(k);
const hiddenCols = computed(() => ALL.filter(a => !cols.value.includes(a.k)));
const toggleCol = k => { if (k === 'name') return; cols.value = vis(k) ? cols.value.filter(x => x !== k) : [...cols.value, k]; };
const moveCol = (k, d) => { const a = [...cols.value], i = a.indexOf(k), j = i + d; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; cols.value = a; };
const resetCols = () => { cols.value = [...DEF]; };

/* ---------- (47) فلاتر مركبة: الوظيفة/القسم + نطاق الأجر + تاريخ الالتحاق + المستندات (تُطبَّق داخل EL() فتشمل الطباعة والتعيين الجماعي) ---------- */
const adv = reactive(getAdv());
watch(adv, v => { setAdv(v); ep = 0; ver.value++; }, { deep: true, flush: 'sync' });
const advN = computed(() => Object.keys(adv).filter(k => adv[k] !== '').length);
const clearAdvAll = () => { Object.keys(adv).forEach(k => { adv[k] = ''; }); };
const jobs = computed(() => { ver.value; return distinctJobs(); });

/* ---------- اللوحات المنسدلة + (20) العروض المحفوظة ---------- */
const panel = ref('');
const togglePanel = n => { panel.value = panel.value === n ? '' : n; };
const views = ref(listViews('emp'));
const viewName = ref('');
const reloadViews = () => { views.value = listViews('emp'); };

/* ---------- البيانات ---------- */
const list = computed(() => {
  // يعتمد صراحةً على خانات البحث والفلاتر: EL() القديمة تقرأ flt (متغير عادي غير تفاعلي)،
  // فبدون قراءة هذه القيم هنا لا يُعاد حساب القائمة عند الكتابة/الاختيار إلا بعد مغادرة الشاشة والرجوع.
  ver.value; q.value; comp.value; st.value; fn.value; cfk.value;
  const m = FNM();
  return EL().map(e => {
    const r = calc(e), c = cfOf(e);
    return {
      id: e.id, fno: m.get(e.id) || 0, code: e.code || '', name: e.name || '', job: e.job || '', company: cn(e.cid),
      insno: e.insno || '', nid: e.nid || '', start: e.start || '', reqIn: e.reqIn || '', reqInDate: e.reqInDate || '',
      wage: +e.wage || 0, ded: e.status === 'active' ? r.a : null, active: e.status === 'active', rtype: e.rtype || 'مستقيل', end: e.end || '',
      cf: c.st || '', cfDt: c.dt, cfNote: c.note, cfKind: c.k, reqOut: e.reqOut || '', reqOutDate: e.reqOutDate || '', upd: e._u || 0, nd: (e.docs || []).length
    };
  });
});

const SORTMAP = { fno: 'fno', _u: 'upd', name: 'name', cid: 'company', insno: 'insno', nid: 'nid', start: 'start', wage: 'wage', status: 'active', cf: 'cf', code: 'code' };
const sf = ref(SORTMAP[es.k] || 'upd');
const so = ref(es.d || -1);
const onSort = e => { sf.value = e.sortField; so.value = e.sortOrder; };

const snapshotView = () => ({ q: q.value, comp: comp.value, st: st.value, fn: fn.value, cfk: cfk.value, adv: { ...adv }, cols: [...cols.value], sf: sf.value, so: so.value });
function saveCurrentView() {
  const n = viewName.value.trim();
  if (!n) { toast('اكتب اسمًا للعرض أولًا'); return; }
  saveView('emp', n, snapshotView()); viewName.value = ''; reloadViews();
  toast('تم حفظ العرض «' + n + '»', 1);
}
function applyView(v) {
  const x = v.state || {};
  q.value = x.q || ''; fn.value = x.fn || ''; st.value = x.st || ''; cfk.value = x.cfk || '';
  comp.value = companies.value.some(c => c.v === x.comp) ? x.comp : '';
  Object.keys(adv).forEach(k => { adv[k] = (x.adv && x.adv[k]) || ''; });
  if (Array.isArray(x.cols) && x.cols.includes('name') && x.cols.every(k => ALL.some(a => a.k === k))) cols.value = [...x.cols];
  if (x.sf) { sf.value = x.sf; so.value = x.so || -1; }
  panel.value = ''; ver.value++;
}
const dropView = id => { removeView(id); reloadViews(); };

const cfSev = s => (s === CFS[1] ? 'success' : s === CFS[0] ? 'warn' : s === CFS[2] ? 'danger' : 'secondary');
const rowClass = r => (r.active ? '' : 'row-out');

/* ---------- ربط الدوال القديمة ---------- */
const L = {
  prof: id => prof(id), form: id => frmFor(id), docs: id => docs(id), edit: id => editE(id),
  toggle: id => toggle(id), del: id => delE(id), cf: id => cfEdit(id),
  sortFn: () => sortFn(), bulk: () => cfBulk(), clrx: () => clrx(),
  old: () => amanSwitchUI(false)
};
/* ---------- إخفاء الأرقام القومية والتأمينية (نفس زر الشريط العلوي ومفتاح aman_mask) ----------
   الزر العلوي يعيد رسم الصفحة (go) فتُعاد قراءة الحالة عند التركيب. الضغط على رقم يكشفه هو فقط. */
const shown = ref(new Set());
const mkey = (id, f) => id + ':' + f;
const mval = (id, f, v) => {
  if (!v) return '—';
  return shown.value.has(mkey(id, f)) ? v : window.a9.mv(v);
};
const flip = (id, f) => {
  const k = mkey(id, f), n = new Set(shown.value);
  n.has(k) ? n.delete(k) : n.add(k);
  shown.value = n;
};
const maskTip = () => 'اضغط لإظهار/إخفاء هذا الرقم فقط';

const icon = (n, s) => ic(n, s || 16);
const dateH = s => fd(s);
const money = n => mny(n);
const money2 = n => m2(n);
const updTxt = t => upd({ _u: t });
const initials = n => ini(n);

function refresh() {
  ver.value++;
  // الطباعة القديمة تنسخ #rows: نملؤه (مخفياً) فقط عند وضع «اطبع الكل»
  if (typeof PRALL !== 'undefined' && PRALL) { const h = document.getElementById('rows'); if (h) { h.innerHTML = empTable(EL()); try { window.a9.pass(); } catch (e) {} } }
}
defineExpose({ refresh });
</script>

<template>
  <div class="card aman-ui noprint">
    <div class="chips2">
      <Button v-for="c in chips" :key="c.v" :label="c.l" size="small" rounded :outlined="cfk !== c.v" @click="cfk = c.v" />
    </div>

    <div class="tb">
      <SearchBox v-model="q" class="grow" placeholder="بحث بالاسم أو الكود أو الرقم التأميني أو القومي" />
      <Select v-model="comp" :options="companies" optionLabel="l" optionValue="v" placeholder="كل الشركات" showClear style="min-width: 11rem" />
      <Select v-model="st" :options="statuses" optionLabel="l" optionValue="v" placeholder="كل الحالات" showClear style="min-width: 9rem" />
      <InputText v-model="fn" type="number" min="1" placeholder="رقم الملف" title="ابحث برقم الملف (اختر الشركة أولًا)" style="width: 8rem" />
      <div class="dpw">
        <Button size="small" severity="secondary" outlined data-dp-trigger title="إظهار الأعمدة وترتيبها" @click="togglePanel('cols')"><span v-html="icon('list', 14)"></span> الأعمدة ({{ cols.length }})</Button>
        <DropPanel :open="panel === 'cols'" width="300px" @close="panel = ''">
          <div class="dp-h">الأعمدة بترتيب العرض</div>
          <div v-for="(k, i) in cols" :key="k" class="dp-r">
            <span class="dp-t">{{ HEAD[k] }}</span>
            <button type="button" class="dp-b" :disabled="i === 0" title="تحريك لليمين" @click="moveCol(k, -1)">→</button>
            <button type="button" class="dp-b" :disabled="i === cols.length - 1" title="تحريك لليسار" @click="moveCol(k, 1)">←</button>
            <button type="button" class="dp-b" :disabled="k === 'name'" title="إخفاء" @click="toggleCol(k)">×</button>
          </div>
          <div v-if="hiddenCols.length" class="dp-h">أعمدة مخفية</div>
          <div v-for="a in hiddenCols" :key="a.k" class="dp-r">
            <span class="dp-t mut2">{{ a.l }}</span>
            <button type="button" class="dp-b dp-add" @click="toggleCol(a.k)">+ إظهار</button>
          </div>
          <div class="dp-f"><Button size="small" text severity="secondary" label="الترتيب الافتراضي" @click="resetCols" /></div>
        </DropPanel>
      </div>
      <div class="dpw">
        <Button size="small" severity="secondary" :outlined="!advN" data-dp-trigger title="فلاتر مركبة" @click="togglePanel('adv')"><span v-html="icon('sliders', 14)"></span> فلاتر متقدمة<template v-if="advN"> ({{ advN }})</template></Button>
        <DropPanel :open="panel === 'adv'" width="340px" @close="panel = ''">
          <div class="dp-h">القسم / الوظيفة</div>
          <select v-model="adv.job" class="p-inputtext p-component at-in"><option value="">الكل</option><option v-for="j in jobs" :key="j" :value="j">{{ j }}</option></select>
          <div class="dp-h">نطاق الأجر</div>
          <div class="dp-2"><input v-model="adv.wmin" type="number" min="0" class="p-inputtext p-component at-in" placeholder="من" /><input v-model="adv.wmax" type="number" min="0" class="p-inputtext p-component at-in" placeholder="إلى" /></div>
          <div class="dp-h">تاريخ الالتحاق</div>
          <div class="dp-2"><input v-model="adv.dfrom" type="date" class="p-inputtext p-component at-in" /><input v-model="adv.dto" type="date" class="p-inputtext p-component at-in" /></div>
          <div class="dp-h">المستندات</div>
          <select v-model="adv.docs" class="p-inputtext p-component at-in"><option value="">الكل</option><option value="has">لديه مستندات</option><option value="none">بدون مستندات</option></select>
          <p class="mut2 dp-n">حالة الاستمارة (رسالة التأكيد) تُختار من الأزرار أعلى الجدول وتُجمع مع هذه الفلاتر.</p>
          <div class="dp-f"><Button size="small" text severity="secondary" label="مسح الفلاتر المتقدمة" :disabled="!advN" @click="clearAdvAll" /></div>
        </DropPanel>
      </div>
      <div class="dpw">
        <Button size="small" severity="secondary" outlined data-dp-trigger title="العروض والبحث المحفوظة" @click="togglePanel('views')"><span v-html="icon('check', 14)"></span> العروض المحفوظة<template v-if="views.length"> ({{ views.length }})</template></Button>
        <DropPanel :open="panel === 'views'" width="320px" @close="panel = ''">
          <div class="dp-h">حفظ العرض الحالي (الفلاتر + الأعمدة + الترتيب)</div>
          <div class="dp-2"><input v-model="viewName" class="p-inputtext p-component at-in" placeholder="اسم العرض" maxlength="40" @keydown.enter.prevent="saveCurrentView" /><Button size="small" label="حفظ" @click="saveCurrentView" /></div>
          <div v-if="views.length" class="dp-h">العروض المحفوظة</div>
          <p v-else class="mut2 dp-n">لا توجد عروض محفوظة بعد.</p>
          <div v-for="v in views" :key="v.id" class="dp-r">
            <button type="button" class="dp-t dp-link" @click="applyView(v)">{{ v.name }}</button>
            <button type="button" class="dp-b" title="حذف" @click="dropView(v.id)">×</button>
          </div>
        </DropPanel>
      </div>
      <Button size="small" severity="secondary" outlined title="عرض بترتيب رقم الملف" @click="L.sortFn"><span v-html="icon('list', 14)"></span> ترتيب الملفات</Button>
      <Button size="small" severity="secondary" outlined title="تعيين حالة التأكيد لكل المعروضين" @click="L.bulk"><span v-html="icon('check', 14)"></span> حالة التأكيد للمعروض</Button>
      <Button v-if="xLabel" size="small" rounded :label="xLabel + ' ✕'" @click="L.clrx" />
      <Button size="small" text severity="secondary" label="الشكل القديم" title="الرجوع للشكل القديم" @click="L.old" />
    </div>

    <DataTable :value="list" dataKey="id" :rowClass="rowClass" scrollable paginator :rows="25" :rowsPerPageOptions="[25, 50, 100, 200]"
      paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
      currentPageReportTemplate="{first} – {last} من {totalRecords} موظف"
      :sortField="sf" :sortOrder="so" @sort="onSort">
      <template #empty>لا توجد نتائج</template>

      <Column v-for="k in cols" :key="k" :field="FIELD[k]" :header="HEAD[k]" :sortable="!NOSORT.includes(k)">
        <template #body="{ data: r }">
          <span v-if="k === 'fno'" class="fnb2" :title="'رقم الملف في ' + r.company">{{ r.fno }}</span>
          <template v-else-if="k === 'code'">{{ r.code }}</template>
          <div v-else-if="k === 'name'" class="who2" @click="L.prof(r.id)">
            <div class="av">{{ initials(r.name) }}</div>
            <div><b>{{ r.name }}</b><div class="mut2">{{ r.job }}</div></div>
          </div>
          <template v-else-if="k === 'company'">{{ r.company }}</template>
          <span v-else-if="k === 'insno'" class="a9n mkc" :title="maskTip()" @click="flip(r.id, 'insno')">{{ mval(r.id, 'insno', r.insno) }}</span>
          <span v-else-if="k === 'nid'" class="a9n mkc" :title="maskTip()" @click="flip(r.id, 'nid')">{{ mval(r.id, 'nid', r.nid) }}</span>
          <span v-else-if="k === 'start'" v-html="dateH(r.start)"></span>
          <template v-else-if="k === 'reqIn'">
            <template v-if="r.reqIn">{{ r.reqIn }}<div class="mut2" v-html="dateH(r.reqInDate)"></div></template>
            <template v-else>—</template>
          </template>
          <template v-else-if="k === 'wage'">{{ money(r.wage) }}</template>
          <template v-else-if="k === 'ded'">{{ r.ded === null ? '—' : money2(r.ded) }}</template>
          <template v-else-if="k === 'status'">
            <span v-if="r.active" class="p-tag p-component p-tag-success"><span class="p-tag-label">مؤمن عليه</span></span>
            <template v-else><span class="p-tag p-component p-tag-danger"><span class="p-tag-label">{{ r.rtype }}</span></span><div class="mut2" v-html="dateH(r.end)"></div></template>
          </template>
          <div v-else-if="k === 'cf'" class="cfcell" title="اضغط لتحديث الحالة" @click="L.cf(r.id)">
            <span class="p-tag p-component" :class="'p-tag-' + cfSev(r.cf)"><span class="p-tag-label">{{ r.cf || 'غير محدد' }}</span></span>
            <div class="mut2">{{ r.cfKind === 'out' ? 'خروج' : 'دخول' }}<template v-if="r.cfDt"> · <span v-html="dateH(r.cfDt)"></span></template></div>
            <div v-if="r.cfNote" class="mut2" :title="r.cfNote" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis">{{ r.cfNote }}</div>
          </div>
          <template v-else-if="k === 'reqOut'">
            <template v-if="r.reqOut">{{ r.reqOut }}<div class="mut2" v-html="dateH(r.reqOutDate)"></div></template>
            <template v-else>—</template>
          </template>
          <span v-else-if="k === 'upd'" class="mut2">{{ updTxt(r.upd) }}</span>
        </template>
      </Column>

      <Column header="">
        <template #body="{ data: r }">
          <div class="acts">
            <button type="button" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-secondary" title="ملف الموظف" @click="L.prof(r.id)"><span v-html="icon('eye')"></span></button>
            <button type="button" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-secondary" title="طباعة استمارة التأمينات" @click="L.form(r.id)"><span v-html="icon('form')"></span></button>
            <button type="button" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-secondary" :title="'المستندات (' + r.nd + ')'" @click="L.docs(r.id)"><span v-html="icon('pclip')"></span></button>
            <button type="button" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-secondary" title="تعديل" @click="L.edit(r.id)"><span v-html="icon('edit')"></span></button>
            <button type="button" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-secondary" :title="r.active ? 'تسجيل استقالة' : 'إعادة تعيين'" @click="L.toggle(r.id)"><span v-html="icon(r.active ? 'logout' : 'refresh')"></span></button>
            <button type="button" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-danger" title="حذف" @click="L.del(r.id)"><span v-html="icon('trash')"></span></button>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
  <!-- حاوية مخفية للطباعة القديمة (تُملأ فقط عند الطباعة) -->
  <div id="rows" class="tw pr-only"></div>
</template>
