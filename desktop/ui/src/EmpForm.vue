<script setup>
// (34) نموذج إضافة/تعديل الموظف بـ Vue — بديل editE/regQ القديمتين، وبنفس منطق الحفظ (chk, addDocs, lg, save).
// (35) تحقق حي من الرقم القومي والتكرار • (36) استخراج النوع والسن والمحافظة وتاريخ التقاعد • (37) حساب الاشتراك أثناء كتابة الأجر
// (38) اقتراح الرقم التأميني • (39) رسالة الخطأ بجانب الحقل المعني • (40) إكمال تلقائي للاسم • (41) المستندات والـ OCR داخل النموذج
// (43) تسجيل الانتقال عند تغيير الشركة • (45) شاشة مراجعة التعديلات قبل الحفظ.
// كل المنطق في core/empform.js (مختبَر على التطبيق الحقيقي)؛ هذا الملف واجهة فقط.
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { getForm, setForm } from './core/prefs.js';
import {
  toModel, validate, nidState, contrib, suggestInsNo, nameMatches, prefillFrom, sameNameOthers, moveIntent, diffModel, saveEmployee,
  maskDate, isoToDmy, dig, LABELS, extraFields, rtypes, DOC_KINDS
} from './core/empform.js';

const props = defineProps({ open: Boolean, empId: { type: String, default: '' }, reqId: { type: String, default: '' } });
const emit = defineEmits(['close', 'legacy']);

const L = LABELS();
const EXTRA = extraFields().map(x => ({ k: x[0], l: x[1] }));
const RTS = rtypes();
const KINDS = DOC_KINDS;

const m = reactive({});                    // النموذج (نصوص كما تظهر للمستخدم)
const orig = ref({});                      // نسخة من الموظف قبل التعديل (للمقارنة)
const comps = ref([]);
const rs = ref(false);                     // موظف مستقيل؟ (تظهر حقول الاستقالة)
const step = ref('form');                  // form | review
const attempted = ref(false);
const touched = reactive({});
const serverErr = reactive({});            // أخطاء رجعت من الحفظ نفسه (chk القديمة)
const formErr = ref('');
const busy = ref(false);
const snap = ref('');
const confirmClose = ref(false);
const reviewPref = ref(true);
const docKind = ref('التحاق');
const picked = ref([]);                    // ملفات مختارة من الجهاز
const removed = ref([]);                   // مستندات قائمة معلَّمة للحذف عند الحفظ
const acOpen = ref(false);
const acIdx = ref(-1);
const box = ref(null);

const isNew = computed(() => !props.empId);
const ctx = computed(() => ({ id: props.empId, rs: rs.value, orig: orig.value }));
const res = computed(() => validate(m, ctx.value));
const errs = computed(() => {
  const o = {};
  Object.keys(res.value.err).forEach((k) => { const x = res.value.err[k]; if (!x.req || touched[k] || attempted.value) o[k] = x.m; });
  Object.keys(serverErr).forEach((k) => { if (serverErr[k]) o[k] = serverErr[k]; });
  return o;
});
const warns = computed(() => res.value.warn);
const nerr = computed(() => Object.keys(res.value.err).length);
const nid = computed(() => nidState(m.nid));
const calcR = computed(() => contrib(m.wage));
const insSug = computed(() => { const s = suggestInsNo(m.nid, m.name, props.empId); return s && dig(m.insno).trim() !== s.value ? s : null; });
const sameName = computed(() => sameNameOthers(m.name, props.empId));
const acItems = computed(() => (isNew.value && acOpen.value ? nameMatches(m.name, props.empId) : []));
const moveOn = computed(() => moveIntent(m, ctx.value));
const showMove = computed(() => !isNew.value && !rs.value && !!orig.value.cid && !!m.cid && m.cid !== orig.value.cid);
const changes = computed(() => diffModel(orig.value, m, rs.value, isNew.value));
const docsExisting = computed(() => (orig.value.docs || []).map(d => ({ ...d, gone: removed.value.includes(d.id) })));
const warnList = computed(() => Object.keys(warns.value).map(k => (L[k] || (k === 'moveDate' ? 'تاريخ الانتقال' : k)) + ': ' + warns.value[k]));
const retireTxt = computed(() => (nid.value.state !== 'ok' ? '' : nid.value.retired ? 'بلغ السن' : 'بعد نحو ' + fm(Math.max(nid.value.monthsLeft, 0)) + ' شهر'));
const title = computed(() => (props.reqId ? 'تسجيل موظف من طلب دخول' : isNew.value ? 'موظف جديد' : 'تعديل موظف'));

/* دوال تعرض بيانات البرنامج القديم داخل القالب (القالب لا يرى المتغيرات العامة مباشرة) */
const money = n => mny(n);
const money2 = n => m2(n);
const num = n => fm(n);
const cname = id => cn(id);
const dmyx = s => isoToDmy(s);
const scTick = ref(0);
const scN = () => { scTick.value; return typeof SC !== 'undefined' && SC ? SC.length : 0; };
const onSc = () => { scTick.value++; };
const resetSC = () => { try { SC = []; } catch (e) { /* لا شيء */ } };
const sizeTxt = n => (n ? (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '');

const eMsg = k => errs.value[k] || '';
const wMsg = k => (errs.value[k] ? '' : warns.value[k] || '');
const fcls = k => ({ 'is-err': !!errs.value[k], 'is-warn': !errs.value[k] && !!warns.value[k] });
const touch = (k) => { touched[k] = true; if (serverErr[k]) delete serverErr[k]; };

/* الحقول العامة (النص/التاريخ) */
const GEN_JOB = [{ k: 'job' }];
const GEN_REQ = [{ k: 'start', t: 'date', r: true }, { k: 'reqIn' }, { k: 'reqInDate', t: 'date' }];
const GEN_RES = [{ k: 'end', t: 'date', r: true }, { k: 'rtype', t: 'select' }, { k: 'reqOut' }, { k: 'reqOutDate', t: 'date' }];

/* ---------------- فتح/تهيئة ---------------- */
function init() {
  const e = props.empId ? S.emps.find(x => x.id === props.empId) : null;
  if (props.empId && !e) { toast('الموظف غير موجود'); emit('close'); return; }
  orig.value = e ? { ...e } : {};
  rs.value = !!(e && e.status === 'resigned');
  comps.value = S.companies.map(c => ({ id: c.id, name: c.name }));
  Object.keys(m).forEach((k) => { delete m[k]; });
  Object.assign(m, toModel(e || {}, rs.value));
  if (!e) m.cid = (comps.value[0] && comps.value[0].id) || '';
  if (!e && props.reqId) {
    const p = prefillFrom({ kind: 'req', id: props.reqId });
    Object.keys(p).forEach((k) => { if (k in m) m[k] = String(p[k]); });
  }
  Object.keys(touched).forEach((k) => { delete touched[k]; });
  Object.keys(serverErr).forEach((k) => { delete serverErr[k]; });
  formErr.value = ''; attempted.value = false; step.value = 'form'; confirmClose.value = false; busy.value = false;
  picked.value = []; removed.value = []; acOpen.value = false; acIdx.value = -1;
  docKind.value = rs.value ? 'استقالة' : 'التحاق';
  reviewPref.value = getForm().review;
  resetSC();
  snap.value = JSON.stringify(m);
  nextTick(() => { const el = document.getElementById('f_name'); if (el) el.focus(); });
}
const isDirty = () => JSON.stringify(m) !== snap.value || picked.value.length > 0 || removed.value.length > 0 || scN() > 0;

watch(() => props.open, (v) => {
  if (v) { init(); window.addEventListener('keydown', onWinKey, true); }
  else window.removeEventListener('keydown', onWinKey, true);
}, { immediate: true });
watch(reviewPref, (v) => { if (props.open && getForm().review !== v) setForm({ review: v }); });
window.addEventListener('aman:sc', onSc);
onBeforeUnmount(() => { window.removeEventListener('keydown', onWinKey, true); window.removeEventListener('aman:sc', onSc); });

function onWinKey(e) {
  if (!props.open || e.key !== 'Escape') return;
  const lm = document.getElementById('modal');
  if ((lm && lm.classList.contains('on')) || document.querySelector('.ocr-ov')) return;   // نافذة قديمة فوقنا: هي التي تتعامل مع Esc
  e.stopPropagation(); e.preventDefault();
  if (acOpen.value) { acOpen.value = false; return; }
  if (step.value === 'review') { step.value = 'form'; return; }
  tryClose();
}
function finish() { resetSC(); confirmClose.value = false; emit('close'); }
function tryClose() { if (busy.value) return; if (isDirty()) { confirmClose.value = true; return; } finish(); }
function legacy() { resetSC(); emit('legacy'); }

/* ---------------- الحقول ---------------- */
function onDate(k, ev) { const v = maskDate(ev.target.value); m[k] = v; ev.target.value = v; }
function normDigits(k) { m[k] = dig(m[k]).replace(/\s+/g, k === 'nid' ? '' : ' ').trim(); touch(k); }
function focusField(k) {
  nextTick(() => { const el = document.getElementById('f_' + k); if (el) { try { el.scrollIntoView({ block: 'center' }); } catch (x) { /* لا شيء */ } el.focus(); } });
}

/* (40) إكمال الاسم */
function onNameInput(ev) { m.name = ev.target.value; acIdx.value = -1; acOpen.value = document.activeElement === ev.target; }
function pickAc(it) {
  const p = prefillFrom(it);
  Object.keys(p).forEach((k) => { if (k in m && (k === 'name' || k === 'cid' || !String(m[k] || '').trim())) m[k] = String(p[k]); });
  acOpen.value = false; acIdx.value = -1;
  toast(it.kind === 'emp' ? 'تم نقل البيانات الشخصية من ملف «' + it.name + '» — راجع الأجر والتواريخ' : 'تم نقل بيانات طلب الدخول «' + it.name + '»', 1);
}
function onNameKey(e) {
  const n = acItems.value.length;
  if (e.key === 'ArrowDown') { if (n) { e.preventDefault(); acOpen.value = true; acIdx.value = (acIdx.value + 1) % n; } }
  else if (e.key === 'ArrowUp') { if (n) { e.preventDefault(); acIdx.value = (acIdx.value - 1 + n) % n; } }
  else if (e.key === 'Enter') { if (acIdx.value >= 0 && acItems.value[acIdx.value]) { e.preventDefault(); pickAc(acItems.value[acIdx.value]); } }
}
function onNameBlur() { setTimeout(() => { acOpen.value = false; }, 150); touch('name'); }

/* (41) المستندات والمسح والـ OCR — تستدعي نفس دوال البرنامج القديم (scanDoc, scanLatest, a9.ocrScan, a9.ocrFile) */
function onFiles(ev) { picked.value = [...picked.value, ...Array.from(ev.target.files || [])]; ev.target.value = ''; }
function dropPicked(i) { picked.value = picked.value.filter((_, j) => j !== i); }
function toggleGone(id) { removed.value = removed.value.includes(id) ? removed.value.filter(x => x !== id) : [...removed.value, id]; }
function viewDoc(d) { try { vd(props.empId, d.id); } catch (e) { toast('تعذر فتح المستند'); } }
function scan(mode) { try { scanDoc(mode); } catch (e) { toast('تعذر بدء المسح'); } }
function latest() { try { scanLatest(); } catch (e) { toast('تعذر جلب آخر مسح'); } }
function ocrScan() { try { window.a9.ocrScan(); } catch (e) { toast('قراءة البطاقة غير متاحة'); } }
function ocrFile() { try { window.a9.ocrFile(); } catch (e) { toast('قراءة البطاقة غير متاحة'); } }
function openOther(id) { try { prof(id); } catch (e) { /* لا شيء */ } }

/* ---------------- الحفظ (45 المراجعة ← 39 الأخطاء بجانب الحقول) ---------------- */
async function onSave() {
  if (busy.value) return;
  Object.keys(serverErr).forEach((k) => { delete serverErr[k]; });
  formErr.value = '';
  if (step.value === 'form') {
    attempted.value = true;
    const ks = Object.keys(res.value.err);
    if (ks.length) { focusField(ks[0]); toast('لم يتم الحفظ: راجع الحقول المعلَّمة بالأحمر (' + ks.length + ')'); return; }
    if (!isNew.value && !changes.value.length && !picked.value.length && !removed.value.length && !scN()) { toast('لا توجد تغييرات لحفظها'); finish(); return; }
    if (reviewPref.value) { step.value = 'review'; await nextTick(); if (box.value) box.value.scrollTop = 0; return; }
  }
  await doSave();
}
async function doSave() {
  busy.value = true;
  try {
    const files = [...picked.value, ...(typeof SC !== 'undefined' && SC ? SC : [])];
    const r = await saveEmployee(m, { id: props.empId, rs: rs.value, files, kind: docKind.value, removeDocs: new Set(removed.value), reqId: props.reqId });
    if (!r.ok) {
      step.value = 'form';
      if (r.field) { serverErr[r.field] = r.err; focusField(r.field); } else formErr.value = r.err;
      toast('لم يتم الحفظ: ' + r.err);
      return;
    }
    save();
    toast(r.isNew ? (props.reqId ? 'تم تسجيل الموظف وحذف الطلب من قائمة الانتظار' : 'تمت إضافة الموظف') : 'تم حفظ التعديلات', 1);
    if (r.docsErr) toast('تم حفظ بيانات الموظف لكن ' + r.docsErr + ' — أعد رفعها من «المستندات»');
    finish();
    try { go(cur); } catch (e) { /* لا شيء */ }
  } catch (err) {
    console.error('[AmanUI] emp save', err);
    toast('تعذر الحفظ: ' + ((err && err.message) || err));
    step.value = 'form';
  } finally { busy.value = false; }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="aman-ui ef-ov" @mousedown.self="tryClose">
      <div ref="box" class="ef-box" role="dialog" aria-modal="true" :aria-label="title">
        <div class="ef-h">
          <b>{{ title }}</b>
          <span v-if="!isNew" class="ef-sub">{{ orig.name }} · {{ cname(orig.cid) }}</span>
          <span class="ef-sp"></span>
          <button type="button" class="ef-lnk" title="فتح النموذج القديم (تفقد البيانات التي لم تُحفظ)" @click="legacy">الشكل القديم</button>
          <button type="button" class="ef-x" aria-label="إغلاق" @click="tryClose">×</button>
        </div>

        <div v-if="confirmClose" class="ef-cc">
          <span>توجد تغييرات لم تُحفظ. تجاهلها وإغلاق النافذة؟</span>
          <button type="button" class="btn d sm" @click="finish">نعم، تجاهل</button>
          <button type="button" class="btn s sm" @click="confirmClose = false">متابعة التعديل</button>
        </div>

        <!-- ============ خطوة المراجعة (45) ============ -->
        <div v-if="step === 'review'" class="ef-b ef-rv">
          <h4>مراجعة قبل الحفظ</h4>
          <p class="ef-mut">راجع ما سيُحفظ ثم اضغط «تأكيد الحفظ». يمكنك الرجوع للتعديل.</p>
          <table v-if="changes.length" class="ef-tb">
            <thead><tr><th>الحقل</th><th>{{ isNew ? '' : 'قبل' }}</th><th>{{ isNew ? 'القيمة' : 'بعد' }}</th></tr></thead>
            <tbody>
              <tr v-for="c in changes" :key="c.k"><td>{{ c.label }}</td><td class="old">{{ isNew ? '' : c.from }}</td><td class="new">{{ c.to }}</td></tr>
            </tbody>
          </table>
          <p v-else class="ef-mut">لا تغييرات في بيانات الموظف.</p>
          <div v-if="moveOn" class="ef-note">سيُسجَّل انتقال من «{{ cname(orig.cid) }}» إلى «{{ cname(m.cid) }}» بتاريخ {{ m.moveDate }}<template v-if="m.moveNote"> — {{ m.moveNote }}</template>.</div>
          <div v-else-if="showMove" class="ef-note">تغيير الشركة سيُحفظ كتصحيح (بدون تسجيل انتقال).</div>
          <div v-if="picked.length || scN()" class="ef-note">مستندات سيتم رفعها ({{ picked.length + scN() }}) بنوع «{{ docKind }}»: {{ picked.map(f => f.name).join('، ') }}<template v-if="scN()"> + ملفات ممسوحة ضوئيًا</template></div>
          <div v-if="removed.length" class="ef-note bad">مستندات سيتم حذفها ({{ removed.length }}): {{ docsExisting.filter(d => d.gone).map(d => d.name).join('، ') }}</div>
          <div v-if="warnList.length" class="ef-note warn"><b>تنبيهات (لا تمنع الحفظ):</b><ul><li v-for="w in warnList" :key="w">{{ w }}</li></ul></div>
          <label class="ef-chk"><input v-model="reviewPref" type="checkbox" /> اعرض هذه المراجعة قبل كل حفظ</label>
        </div>

        <!-- ============ النموذج ============ -->
        <div v-else class="ef-b">
          <div v-if="attempted && nerr" class="ef-banner bad">لم يتم الحفظ: {{ num(nerr) }} حقل يحتاج تصحيحًا (معلَّم بالأحمر).</div>
          <div v-if="formErr" class="ef-banner bad">{{ formErr }}</div>

          <h4 class="ef-sec">بيانات الهوية</h4>
          <div class="ef-g">
            <div class="ef-f full" :class="fcls('name')">
              <label for="f_name">الاسم <b class="rq">*</b></label>
              <div class="ef-ac">
                <input id="f_name" class="p-inputtext p-component ef-in" :value="m.name" autocomplete="off" @input="onNameInput" @focus="acOpen = isNew" @blur="onNameBlur" @keydown="onNameKey" />
                <ul v-if="acItems.length" class="at-sg ef-sg" role="listbox">
                  <li v-for="(it, i) in acItems" :key="it.kind + it.id" :class="{ 'is-on': i === acIdx }" role="option">
                    <button type="button" @mousedown.prevent="pickAc(it)">
                      <b>{{ it.name }}</b><small>{{ it.sub }}</small>
                      <span class="tag" :class="it.kind === 'emp' ? 'i' : 'w'">{{ it.kind === 'emp' ? 'نقل بياناته' : 'طلب دخول' }}</span>
                    </button>
                  </li>
                </ul>
              </div>
              <div v-if="eMsg('name')" class="ef-msg bad">{{ eMsg('name') }}</div>
              <div v-else-if="sameName.length" class="ef-msg warn">يوجد موظف بنفس الاسم: «{{ sameName[0].name }}» ({{ cname(sameName[0].cid) }}) <button type="button" class="ef-lnk" @click="openOther(sameName[0].id)">عرض ملفه</button></div>
            </div>

            <div class="ef-f" :class="fcls('nid')">
              <label for="f_nid">الرقم القومي <b class="rq">*</b></label>
              <input id="f_nid" v-model="m.nid" class="p-inputtext p-component ef-in" dir="ltr" inputmode="numeric" autocomplete="off" @blur="normDigits('nid')" />
              <div v-if="eMsg('nid')" class="ef-msg bad">{{ eMsg('nid') }}</div>
              <div v-else-if="nid.state === 'partial'" class="ef-msg">{{ num(nid.len) }} من ١٤ رقمًا</div>
              <div v-else-if="wMsg('nid')" class="ef-msg warn">{{ wMsg('nid') }}</div>
            </div>

            <div class="ef-f" :class="fcls('insno')">
              <label for="f_insno">الرقم التأميني</label>
              <input id="f_insno" v-model="m.insno" class="p-inputtext p-component ef-in" dir="ltr" inputmode="numeric" autocomplete="off" @blur="normDigits('insno')" />
              <div v-if="eMsg('insno')" class="ef-msg bad">{{ eMsg('insno') }}</div>
              <div v-else-if="wMsg('insno')" class="ef-msg warn">{{ wMsg('insno') }}</div>
              <div v-if="insSug" class="ef-sug">
                <span>اقتراح: <b dir="ltr">{{ insSug.value }}</b> — {{ insSug.reason }}</span>
                <button type="button" class="btn s sm" @click="m.insno = insSug.value">استخدم</button>
              </div>
            </div>

            <div v-if="nid.state === 'ok'" class="ef-nid full">
              <div><small>النوع</small><b>{{ nid.gender }}</b></div>
              <div><small>تاريخ الميلاد والسن</small><b>{{ dmyx(nid.birth) }} ({{ num(nid.age) }} سنة)</b></div>
              <div><small>محافظة الميلاد</small><b>{{ nid.gov }}</b></div>
              <div><small>سن المعاش</small><b>{{ dmyx(nid.retire) }}</b><em>{{ retireTxt }}</em></div>
            </div>

            <div class="ef-f" :class="fcls('code')">
              <label for="f_code">كود الموظف</label>
              <input id="f_code" v-model="m.code" class="p-inputtext p-component ef-in" autocomplete="off" @blur="touch('code')" />
            </div>

            <div class="ef-f" :class="fcls('cid')">
              <label for="f_cid">الشركة (المسجل بها تأمينيًا) <b class="rq">*</b></label>
              <select id="f_cid" v-model="m.cid" class="p-inputtext p-component ef-in">
                <option v-for="c in comps" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <div v-if="eMsg('cid')" class="ef-msg bad">{{ eMsg('cid') }}</div>
            </div>

            <div v-if="showMove" class="ef-move full">
              <div><b>تغيير الشركة:</b> «{{ cname(orig.cid) }}» ← «{{ cname(m.cid) }}»</div>
              <div class="ef-mvk">
                <label><input v-model="m.moveKind" type="radio" value="move" /> انتقال فعلي (يُسجَّل في سجل الانتقالات)</label>
                <label><input v-model="m.moveKind" type="radio" value="fix" /> تصحيح شركة مسجَّلة بالخطأ (بدون تسجيل)</label>
              </div>
              <div v-if="m.moveKind === 'move'" class="ef-g">
                <div class="ef-f" :class="fcls('moveDate')">
                  <label for="f_moveDate">تاريخ الانتقال <b class="rq">*</b></label>
                  <input id="f_moveDate" class="p-inputtext p-component ef-in" dir="ltr" inputmode="numeric" maxlength="10" placeholder="يوم/شهر/سنة" :value="m.moveDate" @input="onDate('moveDate', $event)" @blur="touch('moveDate')" />
                  <div v-if="eMsg('moveDate')" class="ef-msg bad">{{ eMsg('moveDate') }}</div>
                </div>
                <div class="ef-f"><label for="f_moveNote">ملاحظة الانتقال</label><input id="f_moveNote" v-model="m.moveNote" class="p-inputtext p-component ef-in" autocomplete="off" /></div>
              </div>
            </div>
          </div>

          <h4 class="ef-sec">العمل والأجر</h4>
          <div class="ef-g">
            <div v-for="f in GEN_JOB" :key="f.k" class="ef-f" :class="fcls(f.k)">
              <label :for="'f_' + f.k">{{ L[f.k] }}</label>
              <input :id="'f_' + f.k" v-model="m[f.k]" class="p-inputtext p-component ef-in" autocomplete="off" @blur="touch(f.k)" />
            </div>
            <div class="ef-f" :class="fcls('wage')">
              <label for="f_wage">الأجر الشهري <b class="rq">*</b></label>
              <input id="f_wage" v-model="m.wage" class="p-inputtext p-component ef-in" dir="ltr" inputmode="decimal" autocomplete="off" @blur="normDigits('wage')" />
              <div v-if="eMsg('wage')" class="ef-msg bad">{{ eMsg('wage') }}</div>
              <div v-else-if="wMsg('wage')" class="ef-msg warn">{{ wMsg('wage') }}</div>
            </div>
            <div v-if="calcR" class="ef-calc full">
              <div><small>الأجر التأميني المحتسب</small><b>{{ money(calcR.base) }}</b></div>
              <div class="hl"><small>خصم العامل ({{ calcR.empPct }}%)</small><b>{{ money2(calcR.emp) }}</b></div>
              <div class="hl"><small>حصة صاحب العمل ({{ calcR.erPct }}%)</small><b>{{ money2(calcR.er) }}</b></div>
              <div><small>الإجمالي الشهري</small><b>{{ money2(calcR.total) }}</b></div>
              <p v-if="calcR.capped === 'min'" class="ef-cap">الأجر أقل من الحد الأدنى ({{ money(calcR.min) }}) — يُحتسب التأمين على الحد الأدنى.</p>
              <p v-else-if="calcR.capped === 'max'" class="ef-cap">الأجر أعلى من الحد الأقصى ({{ money(calcR.max) }}) — يُحتسب التأمين على الحد الأقصى.</p>
            </div>
            <div v-for="f in GEN_REQ" :key="f.k" class="ef-f" :class="fcls(f.k)">
              <label :for="'f_' + f.k">{{ L[f.k] }}<b v-if="f.r" class="rq"> *</b></label>
              <input v-if="f.t === 'date'" :id="'f_' + f.k" class="p-inputtext p-component ef-in" dir="ltr" inputmode="numeric" maxlength="10" placeholder="يوم/شهر/سنة  مثال 25/03/2026" :value="m[f.k]" @input="onDate(f.k, $event)" @blur="touch(f.k)" />
              <input v-else :id="'f_' + f.k" v-model="m[f.k]" class="p-inputtext p-component ef-in" autocomplete="off" @blur="touch(f.k)" />
              <div v-if="eMsg(f.k)" class="ef-msg bad">{{ eMsg(f.k) }}</div>
              <div v-else-if="wMsg(f.k)" class="ef-msg warn">{{ wMsg(f.k) }}</div>
            </div>
          </div>

          <template v-if="rs">
            <h4 class="ef-sec">بيانات الاستقالة / انتهاء الخدمة</h4>
            <div class="ef-g">
              <div v-for="f in GEN_RES" :key="f.k" class="ef-f" :class="fcls(f.k)">
                <label :for="'f_' + f.k">{{ L[f.k] }}<b v-if="f.r" class="rq"> *</b></label>
                <input v-if="f.t === 'date'" :id="'f_' + f.k" class="p-inputtext p-component ef-in" dir="ltr" inputmode="numeric" maxlength="10" placeholder="يوم/شهر/سنة" :value="m[f.k]" @input="onDate(f.k, $event)" @blur="touch(f.k)" />
                <select v-else-if="f.t === 'select'" :id="'f_' + f.k" v-model="m.rtype" class="p-inputtext p-component ef-in"><option v-for="t in RTS" :key="t" :value="t">{{ t }}</option></select>
                <input v-else :id="'f_' + f.k" v-model="m[f.k]" class="p-inputtext p-component ef-in" autocomplete="off" @blur="touch(f.k)" />
                <div v-if="eMsg(f.k)" class="ef-msg bad">{{ eMsg(f.k) }}</div>
              </div>
            </div>
          </template>

          <h4 class="ef-sec">بيانات إضافية</h4>
          <div class="ef-g">
            <div v-for="f in EXTRA" :key="f.k" class="ef-f">
              <label :for="'f_' + f.k">{{ f.l }}</label>
              <input :id="'f_' + f.k" v-model="m[f.k]" class="p-inputtext p-component ef-in" autocomplete="off" />
            </div>
          </div>

          <h4 class="ef-sec">المستندات</h4>
          <div v-if="docsExisting.length" class="ef-docs">
            <div v-for="d in docsExisting" :key="d.id" class="ef-doc" :class="{ gone: d.gone }">
              <span class="tag i">{{ d.kind || 'مستند' }}</span><span class="n">{{ d.name }}</span><small class="ef-mut">{{ sizeTxt(d.size) }}</small>
              <button type="button" class="btn s sm" @click="viewDoc(d)">عرض</button>
              <button type="button" class="btn s sm" :class="d.gone ? '' : 'd'" @click="toggleGone(d.id)">{{ d.gone ? 'تراجع' : 'حذف' }}</button>
            </div>
          </div>
          <div class="ef-up">
            <select v-model="docKind" class="p-inputtext p-component ef-in ef-kind" aria-label="نوع المستند"><option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option></select>
            <input type="file" multiple class="ef-file" @change="onFiles" />
          </div>
          <div class="ef-scan">
            <button type="button" class="btn s sm" @click="scan('flat')">من الزجاج</button>
            <button type="button" class="btn s sm" @click="scan('adf')">تغذية تلقائية</button>
            <button type="button" class="btn s sm" @click="latest">جلب آخر مسح</button>
            <button type="button" class="btn s sm" title="مسح البطاقة ضوئيًا ثم قراءة بياناتها" @click="ocrScan">قراءة بطاقة (ماسح)</button>
            <button type="button" class="btn s sm" title="قراءة بيانات بطاقة من صورة" @click="ocrFile">قراءة من صورة</button>
          </div>
          <div id="scl" class="ef-scl"></div>
          <div v-if="picked.length" class="ef-picked">
            <span v-for="(f, i) in picked" :key="f.name + i" class="tag i">{{ f.name }} <a @click="dropPicked(i)">✕</a></span>
          </div>
        </div>

        <div class="ef-f2">
          <span v-if="step === 'form' && nerr && !attempted" class="ef-mut">{{ num(nerr) }} حقل ناقص أو غير صحيح</span>
          <span class="ef-sp"></span>
          <template v-if="step === 'review'">
            <button type="button" class="btn s" :disabled="busy" @click="step = 'form'">رجوع للتعديل</button>
            <button type="button" class="btn" data-ef-save :disabled="busy" @click="onSave">{{ busy ? 'جارٍ الحفظ…' : 'تأكيد الحفظ' }}</button>
          </template>
          <template v-else>
            <button type="button" class="btn s" :disabled="busy" @click="tryClose">إلغاء</button>
            <button type="button" class="btn" data-ef-save :disabled="busy" title="Ctrl+S" @click="onSave">{{ busy ? 'جارٍ الحفظ…' : 'حفظ' }}</button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
