<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
// لوحة منسدلة بسيطة: تُغلق بالنقر خارجها أو Esc. أي عنصر عليه data-dp-trigger لا يُعدّ «خارجها» (الزر يتحكم بنفسه).
const props = defineProps({ open: Boolean, width: { type: String, default: '320px' } });
const emit = defineEmits(['close']);
const root = ref(null);
const onDoc = (e) => {
  if (!props.open || !root.value) return;
  const t = e.target;
  if (root.value.contains(t) || (t.closest && t.closest('[data-dp-trigger]'))) return;
  emit('close');
};
const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close'); };
onMounted(() => { document.addEventListener('mousedown', onDoc, true); document.addEventListener('keydown', onKey); });
onBeforeUnmount(() => { document.removeEventListener('mousedown', onDoc, true); document.removeEventListener('keydown', onKey); });
</script>

<template>
  <div v-if="open" ref="root" class="dp" :style="{ width: width }"><slot /></div>
</template>
