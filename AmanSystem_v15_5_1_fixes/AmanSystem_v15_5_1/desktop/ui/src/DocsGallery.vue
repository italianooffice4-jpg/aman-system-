<script setup>
// (62) رفع بالسحب والإفلات • (63) معرض شبكي مع معاينة • (64) ترتيب بالسحب • (65) مقارنة نسخة قديمة/جديدة.
// بديل docs() القديمة بنفس التخزين (e.docs + IndexedDB). الخانة #dk و#scl موجودتان عمدًا ليعمل المسح الضوئي وقراءة البطاقة (OCR) القديمان كما هما.
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useDataVersion } from './core/bridge.js';
import * as D from './core/docs.js';
import { incoming, dismiss, fileOf } from './core/incoming.js';

const props = defineProps({ open: Boolean, empId: { type: String, default: '' } });
const emit = defineEmits(['close', 'legacy']);
const dv = useDataVersion(), lv = ref(0);
const bump = () => { lv.value++; };
const emp = computed(() => { dv.value; lv.value; return S.emps.find((x) => x.id == props.empId) || null; });
const list = computed(() => { dv.value; lv.value; return D.listOf(props.empId); });
const kind = ref('التحاق');
const KINDS = D.KINDS;
const msg = ref(''), busy = ref(false), over = ref(false);
const thumbs = reactive({});
const sel = ref([]);
const scN = ref(0);
const icon = (n, s) => ic(n, s || 16);
const size = D.fmtSize;
const isImg = D.isImg, isPdf = D.isPdf;
const L = { scan: (m) => scanDoc(m), latest: () => scanLatest(), ocrS: () => window.a9.ocrScan(), ocrF: () => window.a9.ocrFile() };

watch(() => [props.open, list.value.map((d) => d.id).join()], async () => {
  if (!props.open) return;
  sel.value = sel.value.filter((id) => list.value.some((d) => d.id === id));
  for (const d of list.value) if (!(d.id in thumbs)) { thumbs[d.id] = ''; D.thumbOf(d).then((t) => { thumbs[d.id] = t; }); }
}, { immediate: true });
watch(() => props.open, (v) => { if (v) { msg.value = ''; sel.value = []; preview.value = null; cmp.value = null; kind.value = 'التحاق'; } else cleanup(); });
const onSc = () => { scN.value = typeof SC !== 'undefined' && SC ? SC.length : 0; };
window.addEventListener('aman:sc', onSc);
onBeforeUnmount(() => { window.removeEventListener('aman:sc', onSc); cleanup(); });

/* ---------- (62) الرفع ---------- */
async function doUpload(files) {
  if (!files || !files.length || busy.value) return;
  busy.value = true; msg.value = '';
  try {
    const r = await D.upload(props.empId, files, kind.value);
    msg.value = (r.added ? 'تم رفع ' + r.added + ' ملف. ' : '') + (r.bad.length ? 'تم تجاهل: ' + r.bad.map((b) => b.name + ' (' + b.why + ')').join('، ') : '');
    bump();
  } catch (e) { console.error('[AmanUI] upload', e); msg.value = 'تعذر رفع الملفات'; }
  busy.value = false;
}
const pickFiles = (ev) => { doUpload([...ev.target.files]); ev.target.value = ''; };
function onDrop(ev) {
  over.value = false;
  const fl = ev.dataTransfer && ev.dataTransfer.files;
  if (fl && fl.length) { ev.preventDefault(); doUpload([...fl]); }
}
const onOver = (ev) => { if (ev.dataTransfer && [...(ev.dataTransfer.types || [])].includes('Files')) { ev.preventDefault(); over.value = true; } };
async function addScanned() {
  if (!(typeof SC !== 'undefined' && SC && SC.length)) { msg.value = 'لا توجد صفحات ممسوحة بعد'; return; }
  await doUpload(SC.slice()); SC = []; try { scl(); } catch (e) { /* لا شيء */ } onSc();
}

/* (66) ملفات واردة من مجلد الماسح */
async function addIncoming(f) {
  try { const file = await fileOf(f.name); await doUpload([file]); dismiss(f.name); }
  catch (e) { msg.value = 'تعذر إضافة ' + f.name + ': ' + ((e && e.message) || e); }
}

/* ---------- (64) الترتيب ---------- */
const dragId = ref(''), overId = ref('');
const dStart = (ev, d) => { dragId.value = d.id; try { ev.dataTransfer.setData('text/plain', d.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { /* لا شيء */ } };
function dDrop(ev, d) {
  const from = dragId.value; dragId.value = overId.value = '';
  if (!from) return;
  ev.preventDefault(); ev.stopPropagation();
  if (D.reorder(props.empId, from, d.id)) bump();
}
function move(d, dir) {
  const l = list.value, i = l.findIndex((x) => x.id === d.id), j = i + dir;
  if (j >= 0 && j < l.length && D.reorder(props.empId, d.id, l[j].id)) bump();
}

/* ---------- (63) المعاينة ---------- */
const preview = ref(null);
let urls = [];
const mkUrl = (rec) => { const u = D.objectUrl(rec); if (u.startsWith('blob:')) urls.push(u); return u; };
function cleanup() { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; }
async function view(d) {
  const rec = await D.blobOf(d.id);
  if (!rec) { msg.value = 'تعذر فتح المستند (المحتوى غير موجود)'; return; }
  preview.value = { d, url: isImg(d) ? rec.data : mkUrl(rec), img: isImg(d) };
}
async function download(d) {
  const rec = await D.blobOf(d.id); if (!rec) { msg.value = 'تعذر تنزيل المستند'; return; }
  const a = document.createElement('a'); a.href = mkUrl(rec); a.download = d.name || 'document'; document.body.appendChild(a); a.click(); a.remove();
}
async function del(d) {
  if (!confirm('حذف المستند «' + d.name + '» نهائيًا؟')) return;
  if (await D.remove(props.empId, d.id)) { D.dropThumb(d.id); delete thumbs[d.id]; bump(); }
}
const kindChange = (d, ev) => { if (D.setKind(props.empId, d.id, ev.target.value)) bump(); };

/* ---------- (65) المقارنة ---------- */
const cmp = ref(null), zoom = ref(1), diff = ref(false);
const pairs = computed(() => { list.value; return D.comparablePairs(props.empId); });   // يعتمد على list ليتحدث بعد الرفع/الحذف/تغيير النوع
async function openCmp(a, b) {
  const [ra, rb] = await Promise.all([D.blobOf(a.id), D.blobOf(b.id)]);
  if (!ra || !rb) { msg.value = 'تعذر فتح أحد المستندين للمقارنة'; return; }
  zoom.value = 1; diff.value = false;
  cmp.value = { a, b, ua: isImg(a) ? ra.data : mkUrl(ra), ub: isImg(b) ? rb.data : mkUrl(rb) };
}
function cmpSelected() {
  if (sel.value.length !== 2) return;
  const l = list.value, [x, y] = sel.value.map((id) => l.find((d) => d.id === id)).sort((p, q) => l.indexOf(p) - l.indexOf(q));
  openCmp(x, y);
}
const cmpPair = (p) => openCmp(p.older, p.newer);
const swap = () => { const c = cmp.value; cmp.value = { a: c.b, b: c.a, ua: c.ub, ub: c.ua }; };
const bothImg = computed(() => cmp.value && isImg(cmp.value.a) && isImg(cmp.value.b));
const toggleSel = (id) => { const i = sel.value.indexOf(id); if (i >= 0) sel.value.splice(i, 1); else if (sel.value.length < 2) sel.value.push(id); else sel.value = [sel.value[1], id]; };

const onKey = (ev) => {
  if (!props.open || ev.key !== 'Escape') return;
  if (cmp.value) cmp.value = null; else if (preview.value) preview.value = null; else emit('close');
};
window.addEventListener('keydown', onKey);
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div v-if="open && emp" class="ef-ov dg-ov" @mousedown.self="emit('close')">
    <div class="ef-box ef-wide dg-box" :class="{ 'dg-over': over }" role="dialog" aria-label="مستندات الموظف" @dragover="onOver" @dragleave.self="over = false" @drop="onDrop">
      <div class="ef-head">
        <div class="ef-id"><b>مستندات {{ emp.name }}</b> <span class="ef-mut">{{ list.length }} مستند</span></div>
        <span class="ef-sp"></span>
        <button type="button" class="ef-lnk" title="فتح شاشة المستندات القديمة" @click="emit('legacy')">الشكل القديم</button>
        <button type="button" class="ef-x" aria-label="إغلاق" @click="emit('close')">×</button>
      </div>

      <div class="dg-bar">
        <label class="dg-l">نوع المستند
          <select id="dk" v-model="kind"><option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option></select>
        </label>
        <label class="btn sm dg-up"><span v-html="icon('up', 14)"></span> رفع ملفات<input type="file" multiple accept="image/*,application/pdf,.pdf" hidden @change="pickFiles" /></label>
        <button type="button" class="btn s sm" @click="L.scan('flat')"><span v-html="icon('scan', 14)"></span> من الزجاج</button>
        <button type="button" class="btn s sm" @click="L.scan('adf')"><span v-html="icon('scan', 14)"></span> تغذية تلقائية</button>
        <button type="button" class="btn s sm" @click="L.latest()"><span v-html="icon('down', 14)"></span> جلب آخر مسح</button>
        <button type="button" class="btn s sm" title="مسح بطاقة ثم قراءة بياناتها" @click="L.ocrS()"><span v-html="icon('scan', 14)"></span> قراءة بطاقة (ماسح)</button>
        <button type="button" class="btn s sm" title="قراءة بطاقة من صورة" @click="L.ocrF()"><span v-html="icon('eye', 14)"></span> قراءة بطاقة (صورة)</button>
        <span class="ef-sp"></span>
        <button type="button" class="btn s sm" :disabled="sel.length !== 2" title="حدد مستندين من المعرض" @click="cmpSelected"><span v-html="icon('layers', 14)"></span> مقارنة المحدد ({{ sel.length }}/2)</button>
        <button v-for="p in pairs" :key="p.kind" type="button" class="btn s sm" @click="cmpPair(p)">قارن آخر نسختين: {{ p.kind }}</button>
      </div>
      <div class="dg-sc"><div id="scl"></div><button v-if="scN" type="button" class="btn sm" @click="addScanned">إضافة {{ scN }} ممسوح إلى المستندات</button></div>
      <div v-if="incoming.length" class="dg-inc"><b>واردة من مجلد الماسح ({{ incoming.length }}):</b>
        <span v-for="f in incoming" :key="f.name" class="dg-incf">{{ f.name }} <button type="button" class="ef-lnk" @click="addIncoming(f)">إضافة كـ «{{ kind }}»</button><button type="button" class="ef-lnk dg-del" @click="dismiss(f.name)">تجاهل</button></span></div>
      <p v-if="msg" class="ef-mut dg-msg">{{ msg }}</p>

      <div class="dg-grid" :class="{ busy }">
        <div v-if="!list.length" class="dg-empty"><span v-html="icon('pclip', 28)"></span><p>لا توجد مستندات. اسحب صورًا أو ملفات PDF وأفلتها هنا، أو اضغط «رفع ملفات».</p></div>
        <div v-for="(d, i) in list" :key="d.id" class="dg-card" :class="{ sel: sel.includes(d.id), ov: overId === d.id }" draggable="true"
          @dragstart="dStart($event, d)" @dragend="dragId = overId = ''" @dragover.prevent="overId = d.id" @dragleave="overId = ''" @drop="dDrop($event, d)">
          <label class="dg-chk" title="تحديد للمقارنة"><input type="checkbox" :checked="sel.includes(d.id)" @change="toggleSel(d.id)" /></label>
          <button type="button" class="dg-th" :aria-label="'عرض ' + d.name" @click="view(d)">
            <img v-if="thumbs[d.id]" :src="thumbs[d.id]" alt="" draggable="false" />
            <span v-else class="dg-ic" v-html="icon(isPdf(d) ? 'file' : 'eye', 34)"></span>
            <small v-if="isPdf(d)" class="dg-pdf">PDF</small>
          </button>
          <div class="dg-nm" :title="d.name">{{ d.name }}</div>
          <div class="dg-mt"><select :value="d.kind" aria-label="نوع المستند" @change="kindChange(d, $event)"><option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option><option v-if="!KINDS.includes(d.kind)" :value="d.kind">{{ d.kind }}</option></select><span class="ef-mut">{{ size(d.size || 0) }}</span></div>
          <div class="dg-ac">
            <button type="button" class="ef-lnk" title="تقديم" :disabled="i === 0" @click="move(d, -1)">▶</button>
            <button type="button" class="ef-lnk" title="تأخير" :disabled="i === list.length - 1" @click="move(d, 1)">◀</button>
            <button type="button" class="ef-lnk" @click="view(d)">عرض</button>
            <button type="button" class="ef-lnk" @click="download(d)">تنزيل</button>
            <button type="button" class="ef-lnk dg-del" @click="del(d)">حذف</button>
          </div>
        </div>
      </div>
      <p class="ef-mut dg-tip">اسحب البطاقات لإعادة ترتيبها، وأفلت الملفات في أي مكان من النافذة لرفعها. المستند الأحدث = الأبعد في الترتيب عند المقارنة.</p>
      <div v-if="over" class="dg-drop">أفلت الملفات هنا للرفع كـ «{{ kind }}»</div>

      <div v-if="preview" class="dg-pv" @mousedown.self="preview = null">
        <div class="dg-pvb"><div class="ef-head"><b>{{ preview.d.name }}</b><span class="ef-sp"></span><button type="button" class="ef-x" @click="preview = null">×</button></div>
          <img v-if="preview.img" :src="preview.url" alt="" /><iframe v-else :src="preview.url" title="معاينة"></iframe></div>
      </div>

      <div v-if="cmp" class="dg-pv" @mousedown.self="cmp = null">
        <div class="dg-pvb dg-cmp">
          <div class="ef-head"><b>مقارنة المستندات</b><span class="ef-sp"></span>
            <label class="ef-mut">تكبير <input v-model.number="zoom" type="range" min="0.5" max="3" step="0.1" /></label>
            <label v-if="bothImg" class="ef-mut"><input v-model="diff" type="checkbox" /> إظهار الفروق</label>
            <button type="button" class="ef-lnk" @click="swap">تبديل الجانبين</button>
            <button type="button" class="ef-x" @click="cmp = null">×</button></div>
          <div v-if="diff && bothImg" class="dg-diff"><div class="dg-pane" :style="{ '--z': zoom }"><img :src="cmp.ua" alt="" /><img class="dg-bl" :src="cmp.ub" alt="" /></div></div>
          <div v-else class="dg-two">
            <div class="dg-side"><div class="dg-cap">{{ cmp.a.name }} · {{ cmp.a.kind }} · <b>الأقدم</b></div>
              <div class="dg-pane" :style="{ '--z': zoom }"><img v-if="isImg(cmp.a)" :src="cmp.ua" alt="" /><iframe v-else :src="cmp.ua" title="الأقدم"></iframe></div></div>
            <div class="dg-side"><div class="dg-cap">{{ cmp.b.name }} · {{ cmp.b.kind }} · <b>الأحدث</b></div>
              <div class="dg-pane" :style="{ '--z': zoom }"><img v-if="isImg(cmp.b)" :src="cmp.ub" alt="" /><iframe v-else :src="cmp.ub" title="الأحدث"></iframe></div></div>
          </div>
          <p class="ef-mut dg-tip">في وضع «إظهار الفروق» تظهر المناطق المتطابقة داكنة والمختلفة ساطعة (للصور فقط، ويفضّل أن تكون بنفس الحجم والاتجاه).</p>
        </div>
      </div>
    </div>
  </div>
</template>
