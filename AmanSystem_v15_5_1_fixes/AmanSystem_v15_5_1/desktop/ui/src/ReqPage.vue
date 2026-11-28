<script setup>
// صفحة «طلبات الدخول» — Vue 3 + PrimeVue. تبويبان:
//  1) قائمة الانتظار: نفس طلبات الدخول القديمة (قيد الانتظار/معتمد/مرفوض) بلوحة Kanban أو قائمة — نفس البيانات S.reqs ونفس دوال التعديل (editQ/delQ/regQ).
//  2) متابعة التقديم (50): مسودة ← قُدِّم ← مؤكَّد لطلبات الدخول (الالتحاق) والخروج (الاستقالة) — انظر core/filings.js.
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import SearchBox from './SearchBox.vue';
import { setViewMode } from './core/prefs.js';
import * as FL from './core/filings.js';

const ver = ref(0);
const initials = (n) => ini(n);
const statuses = QS.slice();
const A = { reg: (id) => regQ(id), edit: (id) => editQ(id), del: (id) => delQ(id), old: () => amanSwitchReq(false) };
const icon = (n, s) => ic(n, s || 16);
const dateH = (s) => fd(s);
const tab = ref((() => { try { return localStorage.getItem('ins_ui_reqtab') === 'file' ? 'file' : 'queue'; } catch (e) { return 'queue'; } })());
watch(tab, (v) => { try { localStorage.setItem('ins_ui_reqtab', v); } catch (e) { /* لا شيء */ } });

/* ---------- 1) قائمة الانتظار ---------- */
const qs = ref(qf.q || ''), qco = ref(qf.c || '');
watch([qs, qco], () => { qf.q = qs.value; qf.c = qco.value; }, { immediate: true, flush: 'sync' });
const mode = ref(typeof qm !== 'undefined' ? qm : 'kanban');
const setMode = (v) => { qm = v; mode.value = v; setViewMode('req', v); };
const QCOL = ['#d97706', '#16a34a', '#dc2626'], QICO = ['clock', 'check', 'x'];
const kpis = computed(() => { ver.value; return QS.map((s, i) => kpi(QICO[i], Q().filter((q) => q.status == s).length, s, QCOL[i])); });
const coOpts = computed(() => { ver.value; return [...new Set(Q().map(qc).filter(Boolean))].map((c) => ({ v: c, l: c })); });
const queue = computed(() => {
  ver.value; qs.value; qco.value;
  const nq = qs.value ? nz(qs.value) : '';
  return byRecent(Q().filter((q) => (!qco.value || qc(q) == qco.value) && (!nq || hay(q).includes(nq)))).map((q) => ({
    id: q.id, name: q.name || '', code: q.code || '', job: q.job || '', hdate: q.hdate || '', co: qc(q) || '', status: q.status
  }));
});
const byStatus = (s) => queue.value.filter((q) => q.status == s);
const tone = (s) => (s == 'معتمد' ? 'success' : s == 'مرفوض' ? 'danger' : 'warn');
function setStatus(id, s) {
  const q = Q().find((x) => x.id == id);
  if (!q || q.status == s) return;
  q.status = s; lg('تغيير حالة طلب دخول', q.name + ' ← ' + s); save(); ver.value++;
}
const dragId = ref(''), overCol = ref('');
const onDrop = (s) => { overCol.value = ''; if (dragId.value) setStatus(dragId.value, s); dragId.value = ''; };
const sel = ref([]);
const allSel = computed(() => queue.value.length > 0 && sel.value.length === queue.value.length);
const toggleAll = (c) => { sel.value = c ? queue.value.map((q) => q.id) : []; };
function bulk(s) {
  if (!sel.value.length) { toast('حدد طلبًا واحدًا على الأقل'); return; }
  const ids = new Set(sel.value);
  Q().forEach((q) => { if (ids.has(q.id)) q.status = s; });
  lg('تحديث ' + ids.size + ' طلب', '← ' + s); save(); sel.value = []; ver.value++;
  toast('تم تحديث ' + ids.size + ' طلب إلى: ' + s, 1);
}

/* ---------- 2) متابعة التقديم (50) ---------- */
const kind = ref('in');
const fq = ref(''), fco = ref(''), fall = ref(false);
const companies = computed(() => { ver.value; return S.companies.map((c) => ({ v: c.id, l: c.name })); });
const fb = computed(() => { ver.value; return FL.board(kind.value, { co: fco.value, q: fq.value, all: fall.value }); });
const fdrag = ref(''), fover = ref('');
const dlg = ref({ open: false, id: '', to: '', num: '', date: '', err: '' });
const CAP = { draft: 'لا رقم طلب بعد', submitted: 'رقم الطلب مسجَّل ولم يصل التأكيد', confirmed: 'وصلت رسالة التأكيد' };
function doMove(id, to, opts) {
  const r = FL.move(id, kind.value, to, opts);
  if (r.ok) { if (!r.same) { ver.value++; toast('تم نقل الطلب إلى «' + FL.COLS.find((c) => c[0] === to)[1] + '»', 1); } return true; }
  if (r.need) { Object.assign(dlg.value, { open: true, id, to, err: r.err, num: (opts && opts.num) || '', date: (opts && opts.date) || FL.maskDate(dmy(today())) }); return false; }
  toast(r.err); return false;
}
const fDrop = (to) => { fover.value = ''; const id = fdrag.value; fdrag.value = ''; if (id) doMove(id, to); };
function dlgOk() {
  const d = dlg.value;
  if (doMove(d.id, d.to, { num: d.num, date: d.date })) d.open = false;
}
const nextOf = (s) => (s === 'draft' ? 'submitted' : s === 'submitted' ? 'confirmed' : '');
const nextLabel = (s) => (s === 'draft' ? 'تسجيل التقديم' : s === 'submitted' ? 'تأكيد' : '');
const unconfirm = (id) => doMove(id, 'submitted');
const kindLabel = computed(() => (kind.value === 'out' ? 'الخروج' : 'الالتحاق'));
const openFile = (id) => prof(id);
const edit = (id) => editE(id);

function refresh() { ver.value++; }
defineExpose({ refresh });
</script>

<template>
  <div class="card aman-ui noprint">
    <div class="tb">
      <Button size="small" :outlined="tab !== 'queue'" label="قائمة الانتظار" @click="tab = 'queue'" />
      <Button size="small" :outlined="tab !== 'file'" label="متابعة التقديم (مسودة ← قُدِّم ← مؤكَّد)" @click="tab = 'file'" />
      <span class="grow"></span>
      <Button size="small" text severity="secondary" label="الشكل القديم" @click="A.old()" />
    </div>
  </div>

  <!-- 1) قائمة الانتظار -->
  <template v-if="tab === 'queue'">
    <div class="grid k4 mt" v-html="kpis.join('')"></div>
    <div class="card mt aman-ui">
      <div class="tb">
        <SearchBox v-model="qs" class="grow" placeholder="بحث بالاسم أو الكود" />
        <Select v-model="qco" :options="coOpts" optionLabel="l" optionValue="v" placeholder="كل الشركات / أماكن العمل" showClear style="min-width: 13rem" />
        <Button size="small" :outlined="mode !== 'kanban'" @click="setMode('kanban')"><span v-html="icon('kanban', 14)"></span> لوحة</Button>
        <Button size="small" :outlined="mode !== 'list'" @click="setMode('list')"><span v-html="icon('list', 14)"></span> قائمة</Button>
      </div>

      <div v-if="mode === 'kanban'" class="kb">
        <div v-for="s in statuses" :key="s" class="kc" :class="{ ov: overCol === s }" @dragover.prevent="overCol = s" @dragleave="overCol = ''" @drop.prevent="onDrop(s)">
          <div class="kh"><span><Tag :severity="tone(s)" :value="s" /></span><span class="mut">{{ byStatus(s).length }}</span></div>
          <div v-for="q in byStatus(s)" :key="q.id" class="kcard" draggable="true" @dragstart="dragId = q.id; $event.dataTransfer.setData('text/plain', q.id)">
            <div style="display:flex;gap:10px;align-items:center"><div class="av">{{ initials(q.name) }}</div><div><b>{{ q.name }}</b><div class="mut">{{ q.job }} · {{ q.code }}</div></div></div>
            <div class="mut" style="margin:8px 0">{{ q.co || '—' }} · تعيين: <span v-html="dateH(q.hdate) || '—'"></span></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <Button v-if="q.status === 'معتمد'" size="small" @click="A.reg(q.id)"><span v-html="icon('uplus', 14)"></span> تسجيل كموظف</Button>
              <Button text rounded size="small" severity="secondary" title="تعديل" @click="A.edit(q.id)"><span v-html="icon('edit', 15)"></span></Button>
              <Button text rounded size="small" severity="danger" title="حذف" @click="A.del(q.id)"><span v-html="icon('trash', 15)"></span></Button>
            </div>
          </div>
          <p v-if="!byStatus(s).length" class="mut" style="text-align:center;margin-top:30px">اسحب الطلبات إلى هنا</p>
        </div>
      </div>

      <template v-else>
        <div class="tb">
          <Button size="small" :disabled="!sel.length" @click="bulk('معتمد')"><span v-html="icon('check', 14)"></span> اعتماد المحدد</Button>
          <Button size="small" severity="danger" outlined :disabled="!sel.length" @click="bulk('مرفوض')"><span v-html="icon('x', 14)"></span> رفض المحدد</Button>
          <Button size="small" severity="secondary" outlined :disabled="!sel.length" @click="bulk('قيد الانتظار')"><span v-html="icon('clock', 14)"></span> إرجاع للانتظار</Button>
          <span class="mut">{{ sel.length ? sel.length + ' محدد' : '' }}</span>
        </div>
        <DataTable :value="queue" dataKey="id" scrollable paginator :rows="50" :rowsPerPageOptions="[25, 50, 100]"
          paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first} – {last} من {totalRecords} طلب">
          <template #empty>لا توجد طلبات</template>
          <Column><template #header><input type="checkbox" style="width:auto" :checked="allSel" @change="toggleAll($event.target.checked)" /></template>
            <template #body="{ data: r }"><input v-model="sel" type="checkbox" :value="r.id" style="width:auto" /></template></Column>
          <Column field="code" header="الكود" sortable />
          <Column field="name" header="الاسم" sortable><template #body="{ data: r }"><b>{{ r.name }}</b></template></Column>
          <Column field="job" header="الوظيفة" sortable />
          <Column field="hdate" header="تاريخ التعيين" sortable><template #body="{ data: r }"><span v-html="dateH(r.hdate) || '—'"></span></template></Column>
          <Column field="co" header="الشركة" sortable><template #body="{ data: r }">{{ r.co || '—' }}</template></Column>
          <Column field="status" header="حالة الاعتماد" sortable><template #body="{ data: r }"><Tag :severity="tone(r.status)" :value="r.status" /></template></Column>
          <Column header="">
            <template #body="{ data: r }">
              <div class="acts">
                <Button v-if="r.status === 'معتمد'" size="small" label="تسجيل كموظف" @click="A.reg(r.id)" />
                <Button text rounded severity="secondary" title="تعديل" @click="A.edit(r.id)"><span v-html="icon('edit')"></span></Button>
                <Button text rounded severity="danger" title="حذف" @click="A.del(r.id)"><span v-html="icon('trash')"></span></Button>
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
      <p class="mut">اسحب الطلب بين الأعمدة لتغيير حالته. بعد الاعتماد اضغط «تسجيل كموظف»، وعند الحفظ يُحذف الطلب تلقائيًا من قائمة الانتظار.</p>
    </div>
  </template>

  <!-- 2) متابعة التقديم -->
  <div v-else class="card mt aman-ui">
    <div class="tb">
      <Button size="small" :outlined="kind !== 'in'" label="طلبات الدخول (الالتحاق)" @click="kind = 'in'" />
      <Button size="small" :outlined="kind !== 'out'" label="طلبات الخروج (الاستقالة)" @click="kind = 'out'" />
      <SearchBox v-model="fq" class="grow" placeholder="بحث بالاسم أو الكود أو الرقم" />
      <Select v-model="fco" :options="companies" optionLabel="l" optionValue="v" placeholder="كل الشركات" showClear style="min-width: 11rem" />
      <label class="mut" style="display:flex;gap:6px;align-items:center"><input v-model="fall" type="checkbox" style="width:auto" /> كل المؤكَّد (وإلا آخر 30 يومًا)</label>
    </div>
    <div class="kb fl-board">
      <div v-for="c in FL.COLS" :key="c[0]" class="kc" :class="{ ov: fover === c[0] }" @dragover.prevent="fover = c[0]" @dragleave="fover = ''" @drop.prevent="fDrop(c[0])">
        <div class="kh"><span><Tag :severity="c[0] === 'confirmed' ? 'success' : c[0] === 'submitted' ? 'info' : 'secondary'" :value="c[1]" /> <small class="mut">{{ CAP[c[0]] }}</small></span><span class="mut">{{ fb.cols[c[0]].length }}<template v-if="fb.cols[c[0]].length !== fb.total[c[0]]"> من {{ fb.total[c[0]] }}</template></span></div>
        <div v-for="x in fb.cols[c[0]]" :key="x.id" class="kcard" draggable="true" @dragstart="fdrag = x.id; $event.dataTransfer.setData('text/plain', x.id)">
          <div style="display:flex;gap:10px;align-items:center;cursor:pointer" @click="openFile(x.id)"><div class="av">{{ initials(x.name) }}</div><div><b>{{ x.name }}</b><div class="mut">{{ x.job }} · {{ x.code }}</div></div></div>
          <div class="mut" style="margin:8px 0">{{ x.company }}<template v-if="x.since"> · {{ kind === 'out' ? 'الاستقالة' : 'الالتحاق' }}: <span v-html="dateH(x.since)"></span></template><template v-if="x.rtype"> · {{ x.rtype }}</template></div>
          <div v-if="x.num" class="mut">رقم الطلب: <b>{{ x.num }}</b> <span v-html="dateH(x.date)"></span></div>
          <div v-if="x.confirmedOn" class="mut">تأكيد: <span v-html="dateH(x.confirmedOn)"></span></div>
          <Tag v-if="x.problem" severity="danger" value="بها مشكلة (رسالة التأكيد)" />
          <div v-if="x.note" class="mut" :title="x.note" style="max-width:220px;overflow:hidden;text-overflow:ellipsis">{{ x.note }}</div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
            <Button v-if="nextOf(c[0])" size="small" :label="nextLabel(c[0])" @click="doMove(x.id, nextOf(c[0]))" />
            <Button v-if="c[0] === 'confirmed'" size="small" severity="secondary" outlined label="إلغاء التأكيد" @click="unconfirm(x.id)" />
            <Button text rounded size="small" severity="secondary" title="تعديل بيانات الموظف" @click="edit(x.id)"><span v-html="icon('edit', 15)"></span></Button>
          </div>
        </div>
        <p v-if="!fb.cols[c[0]].length" class="mut" style="text-align:center;margin-top:30px">لا توجد طلبات {{ kindLabel }} هنا</p>
      </div>
    </div>
    <p class="mut">الحالة مشتقة من بيانات الموظف نفسها: «مسودة» بلا رقم طلب، «قُدِّم» برقم طلب بلا تأكيد، «مؤكَّد» حين تكون رسالة التأكيد «تم التأكيد». سحب بطاقة من «مسودة» يطلب رقم الطلب وتاريخه. لا يمكن الرجوع إلى «مسودة» من هنا حتى لا يضيع رقم الطلب.</p>

    <Dialog v-model:visible="dlg.open" modal :header="'تسجيل تقديم طلب ' + kindLabel" :style="{ width: '24rem' }" class="aman-ui">
      <p v-if="dlg.err" class="mut" style="color:var(--bad)">{{ dlg.err }}</p>
      <label class="mut">رقم الطلب</label>
      <InputText v-model="dlg.num" autofocus style="width:100%" @keydown.enter.prevent="dlgOk" />
      <label class="mut" style="display:block;margin-top:10px">تاريخ تقديم الطلب</label>
      <InputText :modelValue="dlg.date" dir="ltr" inputmode="numeric" maxlength="10" placeholder="يوم/شهر/سنة" style="width:100%" @update:modelValue="dlg.date = FL.maskDate($event)" @keydown.enter.prevent="dlgOk" />
      <div style="display:flex;gap:8px;margin-top:16px"><Button label="حفظ ونقل" @click="dlgOk" /><Button severity="secondary" outlined label="إلغاء" @click="dlg.open = false" /></div>
    </Dialog>
  </div>
</template>
