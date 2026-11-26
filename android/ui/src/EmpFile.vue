<script setup>
// (42) ملف الموظف الإلكتروني المتكامل مع خط زمني • (43) سجل الانتقال بين المنشآت • (44) ملاحظات مؤرشفة ومثبّتة على الملف.
// بديل prof() القديمة (بنفس بياناتها وتبويباتها) + تبويبات جديدة. المنطق في core/empform.js.
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useDataVersion } from './core/bridge.js';
import {
  buildTimeline, TL_TYPES, notesOf, addNote, pinNote, archiveNote, restoreNote, deleteNote, transferEmp,
  nidState, fileInfo, extraFields, maskDate, isoToDmy
} from './core/empform.js';

const props = defineProps({ open: Boolean, empId: { type: String, default: '' }, tab: { type: String, default: 'data' } });
const emit = defineEmits(['close', 'edit', 'legacy']);

const dv = useDataVersion();
const lv = ref(0);
const bump = () => { lv.value++; };
const e = computed(() => { dv.value; lv.value; return S.emps.find(x => x.id === props.empId) || null; });
const tab = ref('data');

const EXTRA = extraFields();
const mvTo = ref(''), mvDate = ref(''), mvNote = ref(''), mvErr = ref('');
const ntText = ref(''), ntPin = ref(false), ntErr = ref(''), showArch = ref(false), confirmDel = ref('');
const tlFilter = ref(''), tlDesc = ref(true);

function resetForms() {
  mvTo.value = ''; mvDate.value = isoToDmy(typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10)); mvNote.value = ''; mvErr.value = '';
  ntText.value = ''; ntPin.value = false; ntErr.value = ''; showArch.value = false; confirmDel.value = ''; tlFilter.value = ''; tlDesc.value = true;
}
const onKey = (ev) => {
  if (!props.open || ev.key !== 'Escape') return;
  const lm = document.getElementById('modal');
  if ((lm && lm.classList.contains('on')) || document.querySelector('.ocr-ov') || document.querySelector('.ef-ov')) return;
  ev.stopPropagation(); ev.preventDefault(); emit('close');
};
watch(() => props.open, (v) => {
  if (v) { tab.value = props.tab || 'data'; resetForms(); window.addEventListener('keydown', onKey, true); }
  else window.removeEventListener('keydown', onKey, true);
}, { immediate: true });
watch(e, (v) => { if (props.open && !v) emit('close'); });
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true));

/* دوال البرنامج القديم للقالب */
const money = n => mny(n);
const money2 = n => m2(n);
const num = n => fm(n);
const cname = id => cn(id);
const dmyx = s => isoToDmy(s);
const mv = (v) => { lv.value; return window.a9 && window.a9.mv ? window.a9.mv(v) : v; };
const sizeTxt = n => (n ? (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '');
const timeTxt = ts => new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
const initials = n => ini(n);

const cfg = computed(() => { lv.value; return S.cfg || {}; });
const info = computed(() => (e.value ? fileInfo(e.value) : { fno: '—', cf: '—' }));
const cal = computed(() => (e.value ? calc(e.value) : { w: 0, a: 0, b: 0 }));
const nid = computed(() => (e.value ? nidState(e.value.nid) : { state: 'empty' }));
const active = computed(() => !!e.value && e.value.status === 'active');
const dataRows = computed(() => {
  const x = e.value; if (!x) return [];
  const rows = [['رقم الملف', info.value.fno], ['رسالة التأكيد', info.value.cf], ['الكود', x.code, 'c'], ['الوظيفة', x.job], ['الرقم التأميني', mv(x.insno), 'c'], ['الرقم القومي', mv(x.nid), 'c'],
    ['تاريخ الالتحاق', isoToDmy(x.start)], ['طلب الالتحاق', [x.reqIn, isoToDmy(x.reqInDate)].filter(Boolean).join(' — ')]];
  if (nid.value.state === 'ok') rows.push(['تاريخ الميلاد والسن', isoToDmy(nid.value.birth) + ' (' + nid.value.age + ' سنة)'], ['النوع · محافظة الميلاد', nid.value.gender + ' · ' + nid.value.gov]);
  if (x.status === 'resigned') rows.push(['تاريخ انتهاء الخدمة', isoToDmy(x.end)], ['نوع انتهاء الخدمة', x.rtype || 'استقالة'], ['طلب ' + (x.rtype || 'الاستقالة'), [x.reqOut, isoToDmy(x.reqOutDate)].filter(Boolean).join(' — ')]);
  EXTRA.forEach(([k, l]) => { if (x[k]) rows.push([l, x[k]]); });
  return rows;
});
const insNotes = computed(() => {
  const x = e.value, o = []; if (!x) return o;
  if (+x.wage < S.cfg.min) o.push('الأجر أقل من الحد الأدنى (' + mny(S.cfg.min) + ') — يُحتسب التأمين على الحد الأدنى.');
  if (+x.wage > S.cfg.max) o.push('الأجر أعلى من الحد الأقصى (' + mny(S.cfg.max) + ') — يُحتسب التأمين على الحد الأقصى.');
  if (nid.value.state === 'ok' && active.value) {
    if (nid.value.retired) o.push('بلغ سن المعاش بتاريخ ' + isoToDmy(nid.value.retire) + '.');
    else if (nid.value.monthsLeft <= 12) o.push('يبلغ سن المعاش بتاريخ ' + isoToDmy(nid.value.retire) + ' (بعد نحو ' + fm(Math.max(nid.value.monthsLeft, 0)) + ' شهر).');
  }
  return o;
});
const docsList = computed(() => (e.value && e.value.docs) || []);
const movesList = computed(() => [...((e.value && e.value.moves) || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.t - a.t));
const otherComps = computed(() => (e.value ? S.companies.filter(c => c.id !== e.value.cid) : []));
const notesAct = computed(() => { lv.value; return e.value ? notesOf(e.value, false) : []; });
const notesArch = computed(() => { lv.value; return e.value ? notesOf(e.value, true) : []; });
const tlAll = computed(() => buildTimeline(e.value));
const tlChips = computed(() => {
  const c = {}; tlAll.value.forEach((x) => { c[x.type] = (c[x.type] || 0) + 1; });
  return Object.keys(c).map(k => ({ k, l: TL_TYPES[k] + ' (' + fm(c[k]) + ')' }));
});
const tlList = computed(() => { const l = tlFilter.value ? tlAll.value.filter(x => x.type === tlFilter.value) : tlAll.value; return tlDesc.value ? l : [...l].reverse(); });
const tabs = computed(() => [['data', 'البيانات'], ['ins', 'التأمينات'], ['docs', 'المستندات (' + fm(docsList.value.length) + ')'], ['tl', 'الخط الزمني'], ['mv', 'الانتقالات (' + fm(movesList.value.length) + ')'], ['nt', 'الملاحظات (' + fm(notesAct.value.length) + ')']]);

function toggleMask() {
  try { localStorage.setItem('aman_mask', window.a9.masked() ? '0' : '1'); window.a9.syncBtn(); } catch (x) { /* لا شيء */ }
  bump(); try { window.AmanUI.refresh(); } catch (x) { /* لا شيء */ }
}
function commit() { save(); bump(); }
function doMove() {
  mvErr.value = '';
  const r = transferEmp(e.value, mvTo.value, mvDate.value, mvNote.value);
  if (!r.ok) { mvErr.value = r.err; return; }
  commit(); toast('تم تسجيل الانتقال', 1); mvTo.value = ''; mvNote.value = '';
  try { go(cur); } catch (x) { /* لا شيء */ }
}
function doNote() {
  ntErr.value = '';
  const r = addNote(e.value, ntText.value, ntPin.value);
  if (!r.ok) { ntErr.value = r.err; return; }
  commit(); ntText.value = ''; ntPin.value = false;
}
const togglePin = (n) => { pinNote(e.value, n.id, !n.pin); commit(); };
const arch = (n) => { archiveNote(e.value, n.id); commit(); };
const restore = (n) => { restoreNote(e.value, n.id); commit(); };
function del(n) { if (confirmDel.value !== n.id) { confirmDel.value = n.id; return; } deleteNote(e.value, n.id); confirmDel.value = ''; commit(); }
const viewDoc = d => { try { vd(e.value.id, d.id); } catch (x) { toast('تعذر فتح المستند'); } };
const manageDocs = () => { try { docs(e.value.id); } catch (x) { /* لا شيء */ } };
const dossier = () => { try { window.a9.dossier(e.value.id); } catch (x) { toast('حافظة الملف غير متاحة'); } };
const printForm = () => { const id = e.value.id; emit('close'); try { frmFor(id); } catch (x) { /* لا شيء */ } };
</script>

<template>
  <Teleport to="body">
    <div v-if="open && e" class="aman-ui ef-ov" @mousedown.self="emit('close')">
      <div class="ef-box ef-wide" role="dialog" aria-modal="true" :aria-label="'ملف ' + e.name">
        <div class="ef-h ff-head">
          <div class="av">{{ initials(e.name) }}</div>
          <div class="ff-who">
            <b>{{ e.name }}</b>
            <span class="ef-mut">{{ e.job || '—' }} · {{ cname(e.cid) }}</span>
            <span class="tag" :class="active ? 'a' : 'r'">{{ active ? 'مؤمن عليه' : (e.rtype || 'مستقيل') }}</span>
          </div>
          <span class="ef-sp"></span>
          <button type="button" class="ef-lnk" @click="toggleMask">إظهار/إخفاء الأرقام</button>
          <button type="button" class="ef-lnk" title="فتح بطاقة الموظف القديمة" @click="emit('legacy')">الشكل القديم</button>
          <button type="button" class="ef-x" aria-label="إغلاق" @click="emit('close')">×</button>
        </div>
        <div class="ff-tabs">
          <button v-for="t in tabs" :key="t[0]" type="button" class="ff-tab" :class="{ on: tab === t[0] }" @click="tab = t[0]">{{ t[1] }}</button>
        </div>

        <div class="ef-b">
          <div v-if="tab === 'data'" class="ff-grid">
            <div v-for="r in dataRows" :key="r[0]"><small>{{ r[0] }}</small><b :class="r[2] === 'c' ? 'a9n' : ''">{{ r[1] || '—' }}</b></div>
          </div>

          <div v-else-if="tab === 'ins'">
            <div class="ef-calc">
              <div><small>الأجر الشهري</small><b>{{ money(e.wage) }}</b></div>
              <div><small>الأجر التأميني المحتسب</small><b>{{ money(cal.w) }}</b></div>
              <div class="hl"><small>خصم العامل ({{ cfg.emp }}%)</small><b>{{ money2(cal.a) }}</b></div>
              <div class="hl"><small>حصة صاحب العمل ({{ cfg.er }}%)</small><b>{{ money2(cal.b) }}</b></div>
              <div class="full"><small>إجمالي السداد الشهري عن الموظف</small><b>{{ money2(cal.a + cal.b) }}</b></div>
            </div>
            <div v-for="n in insNotes" :key="n" class="ef-note warn">{{ n }}</div>
            <div v-if="nid.state === 'ok'" class="ff-grid">
              <div><small>سن المعاش</small><b>{{ dmyx(nid.retire) }}</b></div>
              <div><small>المتبقي</small><b>{{ nid.retired ? 'بلغ السن' : num(Math.max(nid.monthsLeft, 0)) + ' شهر' }}</b></div>
            </div>
            <div v-else class="ef-note">تعذر تحليل الرقم القومي.</div>
          </div>

          <div v-else-if="tab === 'docs'">
            <div v-for="d in docsList" :key="d.id" class="ef-doc">
              <span class="tag i">{{ d.kind || 'مستند' }}</span><span class="n">{{ d.name }}</span><small class="ef-mut">{{ sizeTxt(d.size) }}</small>
              <button type="button" class="btn s sm" @click="viewDoc(d)">عرض</button>
            </div>
            <p v-if="!docsList.length" class="ef-mut">لا توجد مستندات</p>
            <div class="ef-scan"><button type="button" class="btn s sm" @click="manageDocs">إدارة المستندات (رفع / حذف)</button></div>
          </div>

          <div v-else-if="tab === 'tl'">
            <div class="ff-chips">
              <button type="button" class="chip" :class="{ on: !tlFilter }" @click="tlFilter = ''">الكل ({{ num(tlAll.length) }})</button>
              <button v-for="c in tlChips" :key="c.k" type="button" class="chip" :class="{ on: tlFilter === c.k }" @click="tlFilter = c.k">{{ c.l }}</button>
              <span class="ef-sp"></span>
              <button type="button" class="ef-lnk" @click="tlDesc = !tlDesc">{{ tlDesc ? 'الأحدث أولًا' : 'الأقدم أولًا' }}</button>
            </div>
            <div class="ff-tl">
              <div v-for="x in tlList" :key="x.key" class="ff-ev" :class="'t-' + x.type">
                <b>{{ x.title }}</b>
                <div v-if="x.detail" class="ff-det">{{ x.detail }}</div>
                <div class="ef-mut">{{ dmyx(x.day) }}<template v-if="x.timed"> · {{ timeTxt(x.ts) }}</template><template v-if="x.user"> · {{ x.user }}</template></div>
              </div>
              <p v-if="!tlList.length" class="ef-mut">لا توجد أحداث</p>
            </div>
          </div>

          <div v-else-if="tab === 'mv'">
            <div class="ef-note">الشركة الحالية: <b>{{ cname(e.cid) }}</b></div>
            <div v-for="x in movesList" :key="x.id" class="ff-mvrow">
              <b>{{ x.fromName || cname(x.from) }} ← {{ x.toName || cname(x.to) }}</b>
              <span class="ef-mut">{{ dmyx(x.date) }}<template v-if="x.u"> · {{ x.u }}</template></span>
              <div v-if="x.note" class="ff-det">{{ x.note }}</div>
            </div>
            <p v-if="!movesList.length" class="ef-mut">لا توجد انتقالات مسجَّلة لهذا الموظف.</p>
            <h4 class="ef-sec">تسجيل انتقال إلى منشأة أخرى</h4>
            <p v-if="!active" class="ef-mut">لا يمكن تسجيل انتقال لموظف مستقيل.</p>
            <div v-else class="ef-g">
              <div class="ef-f" :class="{ 'is-err': mvErr }">
                <label for="ff_mvto">المنقول إليها</label>
                <select id="ff_mvto" v-model="mvTo" class="p-inputtext p-component ef-in"><option value="">— اختر —</option><option v-for="c in otherComps" :key="c.id" :value="c.id">{{ c.name }}</option></select>
              </div>
              <div class="ef-f">
                <label for="ff_mvdate">تاريخ الانتقال</label>
                <input id="ff_mvdate" class="p-inputtext p-component ef-in" dir="ltr" inputmode="numeric" maxlength="10" :value="mvDate" @input="mvDate = maskDate($event.target.value)" />
              </div>
              <div class="ef-f full"><label for="ff_mvnote">ملاحظة</label><input id="ff_mvnote" v-model="mvNote" class="p-inputtext p-component ef-in" autocomplete="off" /></div>
              <div v-if="mvErr" class="ef-msg bad full">{{ mvErr }}</div>
              <div class="full"><button type="button" class="btn" @click="doMove">تسجيل الانتقال</button>
                <span class="ef-mut"> يسجّل الانتقال ويغيّر شركة الموظف فقط؛ استمارات الخروج والدخول تُطبع من «استمارات التأمينات».</span></div>
            </div>
          </div>

          <div v-else-if="tab === 'nt'">
            <div class="ef-f" :class="{ 'is-err': ntErr }">
              <label for="ff_nt">ملاحظة جديدة</label>
              <textarea id="ff_nt" v-model="ntText" class="p-inputtext p-component ef-in ff-ta" rows="3" maxlength="2000"></textarea>
              <div v-if="ntErr" class="ef-msg bad">{{ ntErr }}</div>
              <div class="ff-row"><label class="ef-chk"><input v-model="ntPin" type="checkbox" /> تثبيت في أعلى الملف</label><span class="ef-sp"></span><button type="button" class="btn" @click="doNote">إضافة</button></div>
            </div>
            <div v-for="n in notesAct" :key="n.id" class="ff-note" :class="{ pin: n.pin }">
              <div class="ff-nt">{{ n.text }}</div>
              <div class="ff-row"><span class="ef-mut"><template v-if="n.pin">📌 </template>{{ n.u }} · {{ dmyx(new Date(n.t).toISOString().slice(0, 10)) }} {{ timeTxt(n.t) }}</span><span class="ef-sp"></span>
                <button type="button" class="ef-lnk" @click="togglePin(n)">{{ n.pin ? 'إلغاء التثبيت' : 'تثبيت' }}</button>
                <button type="button" class="ef-lnk" @click="arch(n)">أرشفة</button></div>
            </div>
            <p v-if="!notesAct.length" class="ef-mut">لا توجد ملاحظات.</p>
            <button v-if="notesArch.length" type="button" class="ef-lnk" @click="showArch = !showArch">{{ showArch ? 'إخفاء' : 'عرض' }} المؤرشفة ({{ num(notesArch.length) }})</button>
            <template v-if="showArch">
              <div v-for="n in notesArch" :key="n.id" class="ff-note arch">
                <div class="ff-nt">{{ n.text }}</div>
                <div class="ff-row"><span class="ef-mut">{{ n.u }} · {{ dmyx(new Date(n.t).toISOString().slice(0, 10)) }}</span><span class="ef-sp"></span>
                  <button type="button" class="ef-lnk" @click="restore(n)">استعادة</button>
                  <button type="button" class="ef-lnk bad" @click="del(n)">{{ confirmDel === n.id ? 'تأكيد الحذف النهائي' : 'حذف نهائي' }}</button></div>
              </div>
            </template>
          </div>
        </div>

        <div class="ef-f2">
          <button type="button" class="btn" @click="emit('edit', e.id)">تعديل</button>
          <button type="button" class="btn s" @click="printForm">طباعة استمارة التأمينات</button>
          <button type="button" class="btn s" @click="dossier">حافظة الملف A4</button>
          <span class="ef-sp"></span>
          <button type="button" class="btn s" @click="emit('close')">إغلاق</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
