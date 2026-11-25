<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, onErrorCaptured } from 'vue';
import ToastStack from './ToastStack.vue';
import BellPanel from './BellPanel.vue';
import ShortcutsHelp from './ShortcutsHelp.vue';
import QuickSearch from './QuickSearch.vue';
import DailySummary from './DailySummary.vue';
import EmpForm from './EmpForm.vue';
import EmpFile from './EmpFile.vue';
import { hasSummary, getDash, setDash } from './core/dash.js';
import { host } from './core/host.js';
import { onSeq } from './core/shortcuts.js';
import { markAllRead } from './core/notify.js';

// تطبيق Vue صغير دائم التركيب خارج #view: الإشعارات (51)، الجرس (52)، البحث السريع (46/48)، الاختصارات (84).
const bellOpen = ref(false), helpOpen = ref(false), searchOpen = ref(false), seq = ref(false), sumOpen = ref(false);
// المرحلة 3: نموذج الموظف (EmpForm) وملفه (EmpFile). أي خطأ داخلهما يُغلقهما ويفتح الشكل القديم دون تعطيل باقي الواجهة.
const formS = reactive({ open: false, id: '', reqId: '' });
const fileS = reactive({ open: false, id: '', tab: 'data' });
const legacyFns = () => window.amanLegacy || {};
function openForm(id, o) { fileS.open = false; Object.assign(formS, { open: true, id: id || '', reqId: (o && o.reqId) || '' }); }
function openFile(id, tab) { formS.open = false; Object.assign(fileS, { open: true, id, tab: tab || 'data' }); }
function formLegacy() { const { id, reqId } = formS; formS.open = false; const l = legacyFns(); try { if (reqId && l.regQ) l.regQ(reqId); else if (l.editE) l.editE(id || undefined); } catch (e) { console.error('[AmanUI]', e); } }
function fileLegacy() { const id = fileS.id; fileS.open = false; try { const l = legacyFns(); if (l.prof) l.prof(id); } catch (e) { console.error('[AmanUI]', e); } }
function fileEdit(id) { fileS.open = false; openForm(id); }
onErrorCaptured((err, inst) => {
  const n = inst && inst.type && (inst.type.__name || inst.type.name);
  if (n !== 'EmpForm' && n !== 'EmpFile') return true;      // غير ذلك: المعالج العام كما كان
  console.error('[AmanUI] ' + n, err);
  if (n === 'EmpForm') formLegacy(); else fileLegacy();
  try { toast('تعذر عرض الشكل الجديد، تم فتح الشكل القديم'); } catch (e) { /* لا شيء */ }
  return false;
});
const bellStyle = ref({});
const bellBox = ref(null);

function placeBell() {
  const b = document.getElementById('bell'); if (!b) return;
  const r = b.getBoundingClientRect();
  bellStyle.value = { top: Math.round(r.bottom + 8) + 'px', left: Math.round(Math.min(Math.max(8, r.left - 120), window.innerWidth - 400)) + 'px' };
}
function toggleBell() { if (!bellOpen.value) { placeBell(); bellOpen.value = true; markAllRead(); } else bellOpen.value = false; }
const onDoc = (e) => {
  if (!bellOpen.value) return;
  const t = e.target;
  if ((bellBox.value && bellBox.value.contains(t)) || (t.closest && t.closest('#bell'))) return;
  bellOpen.value = false;
};
const onKey = (e) => { if (e.key === 'Escape') { bellOpen.value = false; helpOpen.value = false; searchOpen.value = false; } };
let offSeq = null;

onMounted(() => {
  host.toggleBell = toggleBell;
  host.closeBell = () => { bellOpen.value = false; };
  host.openSearch = () => { searchOpen.value = true; };
  host.openHelp = () => { helpOpen.value = true; };
  // (33) الملخص اليومي: يُسجَّل اليوم عند العرض (حتى لو أُغلق البرنامج دون إغلاق النافذة لا يتكرر)
  host.openSummary = () => { sumOpen.value = true; try { setDash({ sumDay: today() }); } catch (e) { /* لا شيء */ } };
  host.maybeSummary = () => { const d = getDash(); if (!d.summary || d.sumDay === today() || !hasSummary()) return; host.openSummary(); };
  host.openEmpForm = openForm;
  host.openEmpFile = openFile;
  host.ready = true;
  offSeq = onSeq((v) => { seq.value = v; });
  document.addEventListener('mousedown', onDoc, true);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', placeBell);
});
onBeforeUnmount(() => {
  host.ready = false; host.openEmpForm = null; host.openEmpFile = null;
  if (offSeq) offSeq();
  document.removeEventListener('mousedown', onDoc, true);
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', placeBell);
});
</script>

<template>
  <ToastStack />
  <div v-if="bellOpen" ref="bellBox" class="at-bellwrap" :style="bellStyle">
    <BellPanel :open="true" @close="bellOpen = false" />
  </div>
  <QuickSearch :open="searchOpen" @close="searchOpen = false" />
  <ShortcutsHelp :open="helpOpen" @close="helpOpen = false" />
  <DailySummary :open="sumOpen" @close="sumOpen = false" />
  <EmpForm :open="formS.open" :emp-id="formS.id" :req-id="formS.reqId" @close="formS.open = false" @legacy="formLegacy" />
  <EmpFile :open="fileS.open" :emp-id="fileS.id" :tab="fileS.tab" @close="fileS.open = false" @edit="fileEdit" @legacy="fileLegacy" />
  <div v-if="seq" class="at-seq">G ← اضغط حرف الصفحة: D لوحة · E موظفون · C شركات · Q طلبات · M مطابقة · F مالية · P استمارات · S إعدادات</div>
</template>
