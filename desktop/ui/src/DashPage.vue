<script setup>
// الشاشة الرئيسية (لوحة التحكم) — Vue 3 + PrimeVue. المرحلة 2: بنود 23–33.
// تقرأ نفس البيانات والدوال القديمة (S, stats, Q, TS, CS, alerts …) عبر core/dash.js — لا تغيير في التخزين.
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import CountUp from './CountUp.vue';
import Spark from './Spark.vue';
import TrendChart from './TrendChart.vue';
import DistChart from './DistChart.vue';
import CompareChart from './CompareChart.vue';
import DashModal from './DashModal.vue';
import * as DH from './core/dash.js';
import { host } from './core/host.js';

const ver = ref(0);
const dx = window.a9.dx;
const num = n => fm(n), money = n => mny(n), ico = (n, s) => ic(n, s || 18);

/* ---------- (24) فلتر عام: الشركة والفترة — يُحفظ في ins_ui_prefs ---------- */
const pr = DH.getDash();
const co = ref(DH.validCo(pr.co)), per = ref(pr.per), auto = ref(pr.auto);
watch(co, v => DH.setDash({ co: v }));
watch(per, v => DH.setDash({ per: v }));
watch(auto, v => { DH.setDash({ auto: v }); if (v) refresh(); });
// PrimeVue يعتبر القيمة الفارغة «بلا اختيار»، فنستخدم قيمة رمزية لـ «كل الشركات»
const coSel = computed({ get: () => co.value || '_all', set: v => { co.value = v === '_all' ? '' : v; } });
const coOpts = computed(() => { ver.value; return [{ id: '_all', name: 'كل الشركات' }, ...S.companies.map(c => ({ id: c.id, name: c.name }))]; });
const coName = computed(() => (co.value ? cn(co.value) : ''));

/* ---------- البيانات ---------- */
const K = computed(() => { ver.value; return DH.kpis(co.value, per.value); });
const rv = computed(() => { ver.value; return DH.review(co.value); });
const dist = computed(() => { ver.value; return DH.distribution(co.value); });
const bars = computed(() => { ver.value; return DH.bars(co.value); });
const barGroups = computed(() => { const m = new Map(); bars.value.forEach(b => { if (!m.has(b.g)) m.set(b.g, []); m.get(b.g).push(b); }); return [...m]; });
const als = computed(() => { ver.value; return DH.alertList(co.value); });
const ex = computed(() => { ver.value; return DH.expirySummary(); });
const t = computed(() => K.value.t);
const tasksHtml = computed(() => { ver.value; return TS().filter(x => ['late', 'today', 'soon'].includes(tst(x))).sort(tsort).slice(0, 4).map(tcard).join(''); });
const userName = computed(() => (typeof CU !== 'undefined' && CU && CU.name) ? CU.name : '');
const greeting = computed(() => dx.greet() + (userName.value ? '، ' + userName.value : ''));

/* ---------- (25) تحديث تلقائي ---------- */
const stamp = ref(Date.now());
const stampTxt = computed(() => new Date(stamp.value).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
let timer = 0, uninstall = null;
function refresh() { ver.value++; stamp.value = Date.now(); }
// أي حفظ للبيانات يستدعي refresh() من الخارج (AmanUI.refresh). أما التحديث الدوري فيخص ما يتغير مع الوقت (مواعيد، عدّادات انتهاء).
const onVis = () => { if (!document.hidden && auto.value) refresh(); };
const onStorage = (e) => { if (auto.value && (e.key === 'ins_sys_v1' || e.key == null)) refresh(); };
onMounted(() => {
  timer = setInterval(() => { if (auto.value && !document.hidden) refresh(); }, 60000);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('storage', onStorage);
  uninstall = DH.installScopeHooks(() => co.value);
  requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true; }));
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener('visibilitychange', onVis);
  window.removeEventListener('storage', onStorage);
  if (uninstall) uninstall();
});
// وميض خفيف على البطاقة التي تغيّر رقمها
const flash = reactive({});
watch(() => [K.value.t.act, K.value.companies, K.value.pendN, Math.round(K.value.t.t), rv.value.total], (n, o) => {
  ['act', 'co', 'pend', 'tot', 'rev'].forEach((k, i) => { if (o && n[i] !== o[i]) { flash[k] = true; setTimeout(() => { flash[k] = false; }, 1500); } });
});

/* ---------- (23) مؤشرات قابلة للضغط ---------- */
const openActive = () => DH.openEmps({ co: co.value, s: 'active' });
// القالب لا يرى دوال البرنامج القديم العامة (nv) مباشرة؛ نمرّرها عبر دالة في السكربت، وتُنفَّذ بعد انتهاء معالج الضغط
const nav = (p) => DH.later(() => nv(p));
const openCompanies = () => nav('comp');
const openPend = () => DH.openReqs(co.value);
const totalOpen = ref(false), reviewOpen = ref(false), revCat = ref('');
function openReview(k) { revCat.value = k || (rv.value.cats[0] ? rv.value.cats[0].k : ''); reviewOpen.value = true; }
const curCat = computed(() => rv.value.cats.find(c => c.k === revCat.value) || rv.value.cats[0] || null);
function viewCat() { const k = curCat.value && curCat.value.k; reviewOpen.value = false; DH.openEmps({ co: co.value, x: k }); }
function profile(id) { reviewOpen.value = false; try { prof(id); } catch (e) { console.error('[AmanUI]', e); } }
function pickDist(id) { if (dist.value.mode === 'company') DH.openEmps({ co: id, s: 'active' }); else DH.openEmps({ co: co.value, s: id }); }

/* ---------- (26) شرائط تقدم متحركة ---------- */
const ready = ref(false);

/* ---------- (28) عدّاد انتهاء المستندات ---------- */
const exRows = computed(() => ex.value.near.slice(0, 6).map(x => ({ ...x, txt: DH.expiryText(x.days), w: Math.max(0, Math.min(100, x.days / 90 * 100)) })));

/* ---------- أزرار سريعة ---------- */
const quick = [
  { l: 'موظف جديد', i: 'uplus', f: () => editE() },
  { l: 'طلب دخول', i: 'clip', f: () => editQ() },
  { l: 'رفع كشف مرتبات', i: 'up', f: () => impP() },
  { l: 'تقرير سريع', i: 'sheet', f: () => nav('fin') }
];

/* ---------- مساعد أمان (نفس منطق a9.dashAsk لكن بحالة Vue) ---------- */
const chips = ['ملخص اليوم', 'طلبات الدخول', 'المقبلون على المعاش', 'إجمالي التأمينات'];
const q = ref('');
const msgs = ref([]);
const box = ref(null);
async function ask(txt) {
  txt = String(txt == null ? q.value : txt).trim();
  if (!txt) return;
  q.value = '';
  msgs.value.push({ u: true, text: txt });
  let r = null;
  try { r = (/ملخص/.test(txt) && !window.a9.assist(txt)) ? { text: brief() } : window.a9.ask(txt); } catch (e) { /* يتجاهل ويجرّب المحادثة الكاملة */ }
  if (r) msgs.value.push({ u: false, text: r.text, html: r.html || '' });
  else {
    msgs.value.push({ u: false, text: 'لم أفهم المطلوب محلياً. فتحت لك المحادثة الكاملة.', html: '' });
    try { chatToggle(); chatSend(txt); } catch (e) { /* لا شيء */ }
  }
  await nextTick();
  if (box.value) box.value.scrollTop = box.value.scrollHeight;
}
defineExpose({ refresh });
</script>

<template>
  <div class="aman-ui aman-dash">
    <h2 class="dv-greet">{{ greeting }}</h2>
    <p class="dv-sub">نبض النظام في نظرة واحدة: الأرقام والطلبات والشغل المعلّق<template v-if="coName"> — <b>{{ coName }}</b></template></p>

    <!-- (24) الفلتر العام + (25) حالة التحديث التلقائي + (33) الملخص -->
    <div class="dv-bar noprint">
      <div class="dv-bar-f">
        <label class="dv-fl"><span>الشركة</span>
          <Select v-model="coSel" :options="coOpts" optionLabel="name" optionValue="id" size="small" aria-label="فلتر الشركة" class="dv-sel" />
        </label>
        <label class="dv-fl"><span>الفترة</span>
          <SelectButton v-model="per" :options="DH.PERIODS" optionLabel="l" optionValue="v" :allowEmpty="false" size="small" aria-label="فلتر الفترة" />
        </label>
        <Button v-if="co" text size="small" label="كل الشركات" @click="co = ''" />
      </div>
      <div class="dv-bar-r">
        <span class="dv-live" :class="{ off: !auto }" :title="auto ? 'تتحدث الأرقام تلقائيًا عند أي تغيير وكل دقيقة' : 'التحديث التلقائي متوقف'"><i></i>{{ auto ? 'تحديث تلقائي' : 'متوقف' }} · {{ stampTxt }}</span>
        <label class="dv-sw"><input v-model="auto" type="checkbox" /> تلقائي</label>
        <Button size="small" severity="secondary" outlined aria-label="تحديث الآن" title="تحديث الآن" @click="refresh"><span v-html="ico('refresh', 15)"></span></Button>
        <Button size="small" severity="secondary" outlined label="ملخص اليوم" @click="host.openSummary(true)" />
      </div>
    </div>

    <!-- مؤشرات -->
    <div class="dv-kpis">
      <div class="dvk dv-click" :class="{ flash: flash.act }" style="--kc: #0d9488" role="button" tabindex="0" title="اضغط لعرض قائمة المؤمن عليهم" @click="openActive" @keydown.enter.prevent="openActive" @keydown.space.prevent="openActive">
        <small>المؤمن عليهم</small>
        <b><CountUp :value="t.act" /></b>
        <div class="dl">{{ K.cntDelta || ' ' }}</div>
        <div class="dl2">خلال {{ num(per) }} شهر: +{{ num(K.hires) }} التحاق / −{{ num(K.leaves) }} خروج</div>
        <Spark :values="K.sr.cnt" color="#0d9488" />
      </div>

      <div class="dvk dv-click" :class="{ flash: flash.co }" style="--kc: #34d399" role="button" tabindex="0" title="اضغط لعرض الشركات" @click="openCompanies" @keydown.enter.prevent="openCompanies" @keydown.space.prevent="openCompanies">
        <small>الشركات</small>
        <b><CountUp :value="K.companies" /></b>
        <div class="dl">{{ num(t.n) }} موظف إجمالاً</div>
        <div class="cbars">
          <div v-for="c in K.coRows.slice(0, 4)" :key="c.id" :title="c.name + ': ' + num(c.act) + ' مؤمن عليه'">
            <i :style="{ width: Math.round(c.act / Math.max(1, ...K.coRows.map(x => x.act)) * 100) + '%' }"></i><span>{{ c.name }}</span><b>{{ num(c.act) }}</b>
          </div>
        </div>
      </div>

      <div class="dvk dv-click" :class="{ flash: flash.pend }" style="--kc: #7c3aed" role="button" tabindex="0" title="اضغط لعرض الطلبات" @click="openPend" @keydown.enter.prevent="openPend" @keydown.space.prevent="openPend">
        <small>طلبات قيد المراجعة</small>
        <b><CountUp :value="K.pendN" /></b>
        <div class="dl">{{ K.totalReq ? 'من إجمالي ' + num(K.totalReq) + ' طلب' : 'لا توجد طلبات' }}</div>
        <div class="prog" style="margin: 16px 0 8px"><i :style="{ width: (K.totalReq ? Math.round(K.pendN / K.totalReq * 100) : 0) + '%' }"></i></div>
      </div>

      <div class="dvk dv-click" :class="{ flash: flash.tot }" style="--kc: #8b5cf6" role="button" tabindex="0" title="اضغط لعرض تفصيل الإجمالي حسب الشركة" @click="totalOpen = true" @keydown.enter.prevent="totalOpen = true" @keydown.space.prevent="totalOpen = true">
        <small>إجمالي التأمينات الشهرية</small>
        <b><CountUp :value="t.t" money /></b>
        <div class="dl">{{ K.totDelta }}</div>
        <Spark :values="K.wageMoney" color="#8b5cf6" />
      </div>

      <div class="dvk dv-click" :class="{ flash: flash.rev }" :style="{ '--kc': rv.total ? '#f59e0b' : '#16a34a' }" role="button" tabindex="0" title="اضغط لعرض الملفات وأسباب المراجعة" @click="openReview()" @keydown.enter.prevent="openReview()" @keydown.space.prevent="openReview()">
        <small>ملفات تحتاج مراجعة</small>
        <b><CountUp :value="rv.total" /></b>
        <div class="dl">{{ rv.total ? num(rv.cats.length) + ' نوع من الملاحظات' : 'كل الملفات سليمة ✓' }}</div>
        <div class="dv-mini"><span v-for="c in rv.cats.slice(0, 3)" :key="c.k" class="tag" :class="c.s">{{ c.label }} · {{ num(c.n) }}</span></div>
      </div>
    </div>

    <!-- إجراءات سريعة -->
    <div class="dq-grid noprint">
      <Button v-for="a in quick" :key="a.l" severity="secondary" outlined @click="a.f"><span v-html="ico(a.i, 16)"></span> {{ a.l }}</Button>
    </div>

    <!-- (27) الاتجاه + (31) التوزيع -->
    <div class="dv-row dv-r2">
      <div class="dvp v dv-chart"><TrendChart :tick="ver" :co="co" :per="per" /></div>
      <div class="dvp t">
        <h4><span v-html="ico('users')"></span> {{ dist.mode === 'company' ? 'توزيع المشتركين حسب المنشأة' : 'توزيع المؤمن عليهم' }}</h4>
        <DistChart :items="dist.items" :total="dist.mode === 'company' ? dist.total : t.n" :centerLabel="dist.mode === 'company' ? 'مؤمن عليه نشط' : 'موظف'" @pick="pickDist" />
        <p class="dv-hint mut">{{ dist.mode === 'company' ? 'اضغط على منشأة لعرض موظفيها المؤمن عليهم.' : 'اضغط على جزء لعرض القائمة.' }}</p>
      </div>
    </div>

    <!-- (30) المقارنة + (26) شرائط التقدم -->
    <div class="dv-row dv-r2">
      <div class="dvp v"><CompareChart :tick="ver" :co="co" :per="per" /></div>
      <div class="dvp t">
        <h4><span v-html="ico('coins')"></span> الأجور والاشتراكات</h4>
        <template v-for="[g, list] in barGroups" :key="g">
          <h6 class="dv-bg">{{ g }}</h6>
          <div v-for="b in list" :key="b.k" class="dv-pg" :title="b.hint">
            <div class="dv-pgh"><span>{{ b.label }}</span><b>{{ b.val }}</b></div>
            <div class="dv-pgb" role="progressbar" :aria-valuenow="Math.round(b.pct)" aria-valuemin="0" aria-valuemax="100" :aria-label="b.label"><i :class="'t-' + b.tone" :style="{ width: (ready ? b.pct : 0) + '%' }"></i></div>
            <small class="mut">{{ num(Math.round(b.pct)) }}٪<template v-if="b.hint"> · {{ b.hint }}</template></small>
          </div>
        </template>
      </div>
    </div>

    <!-- (32) التنبيهات + (28) انتهاء المستندات + طلبات -->
    <div class="dv-row dv-r3 dv-row3">
      <div class="dvp dv-al">
        <h4><span v-html="ico('bell')"></span> التنبيهات <span v-if="als.length" class="at-n">{{ num(als.length) }}</span></h4>
        <button v-for="(a, i) in als" :key="i" type="button" class="al" :class="a.s" @click="DH.openAlert(a, co)"><i v-html="ico(a.i)"></i><span>{{ a.t }}</span></button>
        <p v-if="!als.length" class="mut"><span v-html="ico('check', 16)"></span> لا توجد تنبيهات، كل شيء سليم.</p>
      </div>

      <div class="dvp dv-ex">
        <h4><span v-html="ico('clock')"></span> انتهاء المستندات والتجديدات</h4>
        <div v-if="ex.all.length" class="dv-chips">
          <span class="tag r">منتهية {{ num(ex.expired) }}</span><span class="tag w">خلال ٣٠ يومًا {{ num(ex.soon) }}</span><span class="tag a">سارية {{ num(ex.ok) }}</span>
        </div>
        <button v-for="x in exRows" :key="x.id" type="button" class="dv-exr" @click="nav('cars')">
          <span class="n">{{ x.what }} — <b>{{ x.plate }}</b></span>
          <span class="tag" :class="x.sev">{{ x.txt }}</span>
          <span class="dv-exb"><i :class="'t-' + x.sev" :style="{ width: (ready ? x.w : 0) + '%' }"></i></span>
        </button>
        <p v-if="ex.all.length && !exRows.length" class="mut">لا توجد مستندات تنتهي خلال ٩٠ يومًا ✓</p>
        <p v-if="!ex.all.length" class="mut">لم تُسجَّل تواريخ انتهاء بعد. تُسجَّل رخصة السيارة والتأمين الإجباري والفحص الفني من صفحة السيارات.</p>
      </div>

      <div class="dvp t">
        <h4><span v-html="ico('clip')"></span> طلبات بانتظار المراجعة ({{ num(K.pendN) }})</h4>
        <div v-for="(r, i) in K.pend.slice(0, 4)" :key="r.id || i" class="it"><span>{{ r.name }}</span><Button size="small" severity="secondary" label="مراجعة" @click="nav('req')" /></div>
        <p v-if="!K.pendN" class="mut">لا توجد طلبات معلّقة.</p>
      </div>
    </div>

    <!-- عمليات + مساعد -->
    <div class="dv-row dv-r3 dv-row3">
      <div class="dvp dv-ops">
        <h4><span v-html="ico('history')"></span> آخر العمليات</h4>
        <div v-for="(l, i) in K.ops" :key="i" class="op"><b>{{ l.a }}</b> {{ l.d }}<small>{{ l.when }}</small></div>
        <p v-if="!K.ops.length" class="mut">لا توجد عمليات بعد</p>
      </div>

      <div class="dvp v dv-ai dv-span2">
        <h4><span v-html="ico('search')"></span> مساعد أمان — اسأل أو اطلب إجراء</h4>
        <div class="chips"><Button v-for="c in chips" :key="c" size="small" rounded outlined severity="secondary" :label="c" @click="ask(c)" /></div>
        <div ref="box" class="am">
          <div v-for="(m, i) in msgs" :key="i" :class="['ab', { u: m.u }]">
            <span style="white-space: pre-line">{{ m.text }}</span><span v-if="m.html" v-html="m.html"></span>
          </div>
        </div>
        <div class="row">
          <InputText v-model="q" placeholder="اسم موظف أو رقم قومي أو سؤال…" autocomplete="off" fluid @keydown.enter="ask()" />
          <Button aria-label="بحث" @click="ask()"><span v-html="ico('search', 16)"></span></Button>
        </div>
      </div>
    </div>

    <!-- المهام -->
    <div class="dv-row dv-r3 dv-row3">
      <div class="dvp" style="grid-column: 1 / -1">
        <h4><span v-html="ico('clock')"></span> مهامي القادمة</h4>
        <div v-if="tasksHtml" v-html="tasksHtml"></div>
        <p v-else class="mut">لا توجد مهام قادمة.</p>
      </div>
    </div>

    <!-- موقف الشركات -->
    <div class="card mt">
      <h3><span v-html="ico('layers')"></span> موقف الشركات</h3>
      <DataTable :value="K.coRows" dataKey="id" scrollable rowHover :rowClass="() => 'dv-rowlink'" @row-click="e => DH.openEmps({ co: e.data.id, s: 'active' })">
        <template #empty>لا توجد شركات</template>
        <Column field="name" header="الشركة" sortable><template #body="{ data: r }"><b>{{ r.name }}</b></template></Column>
        <Column field="act" header="مؤمن عليهم" sortable><template #body="{ data: r }"><Tag severity="success" :value="num(r.act)" /></template></Column>
        <Column field="res" header="مستقيلون" sortable><template #body="{ data: r }"><Tag severity="danger" :value="num(r.res)" /></template></Column>
        <Column field="a" header="حصة العامل" sortable><template #body="{ data: r }">{{ money(r.a) }}</template></Column>
        <Column field="b" header="حصة صاحب العمل" sortable><template #body="{ data: r }">{{ money(r.b) }}</template></Column>
        <Column field="t" header="الإجمالي الشهري" sortable><template #body="{ data: r }"><b>{{ money(r.t) }}</b></template></Column>
      </DataTable>
    </div>

    <!-- (23) نافذة: تفصيل الإجمالي الشهري حسب الشركة -->
    <DashModal :open="totalOpen" title="إجمالي التأمينات الشهرية — تفصيل" @close="totalOpen = false">
      <div class="tw"><table class="ctb">
        <tr><th>الشركة</th><th>مؤمن عليهم</th><th>حصة العامل</th><th>حصة صاحب العمل</th><th>الإجمالي</th></tr>
        <tr v-for="r in K.coRows" :key="r.id"><td><b>{{ r.name }}</b></td><td>{{ num(r.act) }}</td><td>{{ money(r.a) }}</td><td>{{ money(r.b) }}</td><td><b>{{ money(r.t) }}</b></td></tr>
        <tr class="dv-tot"><td>الإجمالي</td><td>{{ num(t.act) }}</td><td>{{ money(t.a) }}</td><td>{{ money(t.b) }}</td><td><b>{{ money(t.t) }}</b></td></tr>
      </table></div>
      <p class="mut">الأجر التأميني يُحسب بين الحد الأدنى والأقصى المضبوطين في الإعدادات، ويشمل المؤمن عليهم النشطين فقط.</p>
      <template #foot><button type="button" class="btn" @click="totalOpen = false; nav('fin')">التقارير المالية</button><button type="button" class="btn s" @click="totalOpen = false">إغلاق</button></template>
    </DashModal>

    <!-- (29) نافذة: الملفات التي تحتاج مراجعة -->
    <DashModal :open="reviewOpen" :title="'ملفات تحتاج مراجعة (' + num(rv.total) + ')'" wide @close="reviewOpen = false">
      <p v-if="!rv.cats.length" class="dv-ok">لا توجد ملفات تحتاج مراجعة ✓</p>
      <template v-else>
        <div class="dv-chips">
          <button v-for="c in rv.cats" :key="c.k" type="button" class="chip" :class="{ on: curCat && curCat.k === c.k }" @click="revCat = c.k">{{ c.label }} ({{ num(c.n) }})</button>
        </div>
        <div v-if="curCat" class="dv-rl">
          <button v-for="e in curCat.list.slice(0, 100)" :key="e.id" type="button" class="dv-sm-r" @click="profile(e.id)">
            <span class="n"><b>{{ e.name }}</b> <small class="mut">{{ e.co }}<template v-if="e.code"> · {{ e.code }}</template></small></span><span class="tag" :class="curCat.s">فتح الملف</span>
          </button>
          <p v-if="curCat.list.length > 100" class="mut">يظهر أول ١٠٠ من {{ num(curCat.list.length) }} — افتح القائمة الكاملة بالزر أدناه.</p>
        </div>
      </template>
      <template #foot><button v-if="curCat" type="button" class="btn" @click="viewCat">فتح القائمة في صفحة الموظفين</button><button type="button" class="btn s" @click="reviewOpen = false">إغلاق</button></template>
    </DashModal>
  </div>
</template>
