<script setup>
// (33) الملخص اليومي: يظهر مرة واحدة في اليوم عند فتح النظام (لو فيه ما يستحق العرض)، ويمكن فتحه يدويًا من اللوحة.
// يقرأ نفس بيانات البرنامج (المهام، طلبات الدخول، مستندات السيارات، التنبيهات). لا يكتب في بيانات النظام.
import { ref, computed, watch } from 'vue';
import DashModal from './DashModal.vue';
import { summary, getDash, setDash, expiryText } from './core/dash.js';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);
const sm = ref(null), auto = ref(true);
watch(() => props.open, (v) => {
  if (!v) return;
  try { sm.value = summary(); } catch (e) { console.error('[AmanUI] summary', e); sm.value = null; }
  auto.value = getDash().summary;
}, { immediate: true });
watch(auto, (v) => { if (props.open && getDash().summary !== v) setDash({ summary: v }); });

const hi = computed(() => {
  let n = ''; try { n = (typeof CU !== 'undefined' && CU && CU.name) ? '، ' + CU.name : ''; } catch (e) { /* لا شيء */ }
  return window.a9 && window.a9.dx ? window.a9.dx.greet() + n : 'مرحبًا' + n;
});
const num = n => fm(n), exTxt = expiryText;
function go(p) { emit('close'); try { nv(p); } catch (e) { console.error('[AmanUI]', e); } }
</script>

<template>
  <DashModal :open="open" title="ملخص اليوم" @close="emit('close')">
    <template v-if="sm">
      <p class="dv-sm-hi"><b>{{ hi }}</b><span class="mut"> — {{ sm.date }}</span></p>
      <p v-if="sm.empty" class="dv-ok">كل شيء سليم اليوم: لا مهام متأخرة ولا طلبات معلّقة ولا مستندات قاربت على الانتهاء. 🎉</p>

      <div class="dv-sm-grid">
        <button type="button" class="dv-sm-k" :class="sm.late.length ? 'r' : ''" @click="go('asst')"><b>{{ num(sm.late.length) }}</b><span>مهمة متأخرة</span></button>
        <button type="button" class="dv-sm-k" :class="sm.today.length ? 'w' : ''" @click="go('asst')"><b>{{ num(sm.today.length) }}</b><span>مهمة اليوم</span></button>
        <button type="button" class="dv-sm-k" :class="sm.pend ? 'w' : ''" @click="go('req')"><b>{{ num(sm.pend) }}</b><span>طلب دخول بانتظار الاعتماد</span></button>
        <button type="button" class="dv-sm-k" :class="sm.expN ? 'r' : ''" @click="go('cars')"><b>{{ num(sm.expN) }}</b><span>مستند ينتهي خلال ٣٠ يومًا</span></button>
      </div>

      <template v-if="sm.late.length || sm.today.length">
        <h5 class="dv-sm-h">المهام</h5>
        <button v-for="t in [...sm.late.slice(0, 3), ...sm.today.slice(0, 4)]" :key="t.id" type="button" class="dv-sm-r" @click="go('asst')">
          <span class="tag" :class="sm.late.some(x => x.id === t.id) ? 'r' : 'w'">{{ sm.late.some(x => x.id === t.id) ? 'متأخرة' : 'اليوم' }}</span>
          <span class="n">{{ t.title }}</span><small v-if="t.time" class="mut">{{ t.time }}</small>
        </button>
      </template>
      <p v-else-if="sm.next" class="mut">أقرب موعد قادم: «{{ sm.next.title }}» بتاريخ {{ sm.next.due }}.</p>

      <template v-if="sm.exp.length">
        <h5 class="dv-sm-h">مستندات السيارات</h5>
        <button v-for="x in sm.exp" :key="x.id" type="button" class="dv-sm-r" @click="go('cars')">
          <span class="tag" :class="x.sev">{{ exTxt(x.days) }}</span><span class="n">{{ x.what }} — {{ x.plate }}</span>
        </button>
      </template>

      <p class="dv-sm-f mut">
        <template v-if="sm.alerts">{{ num(sm.alerts) }} تنبيه نشط</template><template v-if="sm.alerts && sm.review"> · </template>
        <template v-if="sm.review">{{ num(sm.review) }} ملف يحتاج مراجعة</template><template v-if="sm.hires || sm.leaves"> · هذا الشهر: +{{ num(sm.hires) }} التحاق / −{{ num(sm.leaves) }} خروج</template>
      </p>
    </template>
    <p v-else class="mut">تعذر تحميل الملخص.</p>
    <template #foot>
      <label class="dv-chk"><input v-model="auto" type="checkbox" /> اعرض الملخص تلقائيًا عند فتح النظام (مرة في اليوم)</label>
      <button type="button" class="btn s" @click="emit('close')">إغلاق</button>
    </template>
  </DashModal>
</template>
