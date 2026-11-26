<script setup>
import { computed } from 'vue';
import { useHistory, useDataVersion } from './core/bridge.js';
import { clearHistory, markAllRead } from './core/notify.js';
import { openAlertTarget, actionLabel } from './core/alerts.js';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);
const hist = useHistory();
const ver = useDataVersion();

// تنبيهات النظام الحيّة (نفس دالة alerts() القديمة)، وتتجدد مع أي تغيّر في البيانات
const alertList = computed(() => {
  ver.value; props.open;
  try { return typeof alerts === 'function' ? alerts() : []; } catch (e) { return []; }
});
const svg = (n) => (typeof ic === 'function' ? ic(n, 18) : '');

function openAlert(i) {
  emit('close');
  const a = alertList.value[i];
  AL = alerts();            // aGo القديمة تقرأ AL
  if (a) openAlertTarget(a); else aGo(i);
}
const TL = { success: 'تم', error: 'خطأ', warn: 'تنبيه', info: 'معلومة' };
const when = (t) => new Date(t).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
function clearAll() { clearHistory(); }
defineExpose({ markAllRead });
</script>

<template>
  <div v-if="open" class="at-bell" @keydown.esc="emit('close')">
    <div class="at-bh"><b>التنبيهات</b><span class="at-n">{{ alertList.length }}</span></div>
    <div v-if="!alertList.length" class="at-empty">لا توجد تنبيهات 🎉</div>
    <button v-for="(a, i) in alertList" :key="'a' + i" class="al" :class="a.s" @click="openAlert(i)">
      <i v-html="svg(a.i)"></i><span>{{ a.t }}</span><small class="at-go">{{ actionLabel(a) }} ←</small>
    </button>
    <div class="at-bh at-bh2"><b>آخر الإشعارات</b>
      <button v-if="hist.length" class="at-link" @click="clearAll">مسح السجل</button>
    </div>
    <div v-if="!hist.length" class="at-empty">لا توجد إشعارات حديثة</div>
    <div v-for="h in hist" :key="h.id" class="at-row at-hist" :class="{ 'at-unread': !h.read }">
      <span class="at-tag" :class="'at-' + h.type">{{ TL[h.type] }}</span>
      <span class="at-t">{{ h.msg }}<i v-if="h.count > 1"> ×{{ h.count }}</i></span>
      <small>{{ when(h.at) }}</small>
    </div>
  </div>
</template>
