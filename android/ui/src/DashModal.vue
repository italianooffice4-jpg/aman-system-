<script setup>
// نافذة منبثقة خفيفة لتفاصيل اللوحة (قوائم المؤشرات والملخص اليومي). تُغلق بـ Esc أو بالضغط خارجها.
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
const props = defineProps({ open: Boolean, title: { type: String, default: '' }, wide: Boolean });
const emit = defineEmits(['close']);
const box = ref(null);
const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); emit('close'); } };
watch(() => props.open, async (v) => {
  if (v) { window.addEventListener('keydown', onKey, true); await nextTick(); if (box.value) box.value.focus(); }
  else window.removeEventListener('keydown', onKey, true);
}, { immediate: true });
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="aman-ui dv-modal" @mousedown.self="emit('close')">
      <div ref="box" class="dv-mbox" :class="{ wide }" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1">
        <div class="dv-mh"><b>{{ title }}</b><button type="button" class="dv-x" aria-label="إغلاق" @click="emit('close')">×</button></div>
        <div class="dv-mb"><slot /></div>
        <div v-if="$slots.foot" class="dv-mf"><slot name="foot" /></div>
      </div>
    </div>
  </Teleport>
</template>
