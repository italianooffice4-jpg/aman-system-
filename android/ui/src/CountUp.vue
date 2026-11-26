<script setup>
// رقم يعدّ تصاعديًا (نفس حركة اللوحة القديمة: 700ms) — بدون لمس الـ DOM يدويًا.
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
const props = defineProps({ value: { type: Number, default: 0 }, money: { type: Boolean, default: false } });
const shown = ref(0);
let raf = 0;
function run(from, to) {
  cancelAnimationFrame(raf);
  const t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / 700, 1);
    shown.value = from + (to - from) * (1 - Math.pow(1 - p, 3));
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}
onMounted(() => run(0, Math.round(props.value)));
watch(() => props.value, (n, o) => run(shown.value, Math.round(n)));
onBeforeUnmount(() => cancelAnimationFrame(raf));
const txt = () => (props.money ? mny(shown.value) : fm(shown.value));
</script>

<template>{{ txt() }}</template>
