<script setup>
// (31) توزيع المشتركين حسب المنشأة — دائرة Chart.js تفاعلية؛ الضغط على جزء (أو على اسم في القائمة) يفتح قائمة موظفي هذه المنشأة.
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Chart, palette, onTheme, tooltipBase } from './core/charts.js';

const props = defineProps({ items: { type: Array, default: () => [] }, total: { type: Number, default: 0 }, centerLabel: { type: String, default: 'مؤمن عليه' } });
const emit = defineEmits(['pick']);
const cv = ref(null), failed = ref(false);
let chart = null, offTheme = null;
const num = n => fm(n);
const pct = v => (props.total ? Math.round(v / props.total * 100) : 0);

function cfg() {
  const p = palette(), it = props.items;
  return {
    type: 'doughnut',
    data: { labels: it.map(x => x.name), datasets: [{ data: it.map(x => x.v), backgroundColor: it.map(x => x.color), borderColor: p.card, borderWidth: 3, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%', locale: 'ar-EG',
      plugins: { legend: { display: false }, tooltip: { ...tooltipBase(p), callbacks: { label: c => ' ' + c.label + ': ' + fm(c.parsed) + ' (' + pct(c.parsed) + '٪)' } } },
      onClick: (e, els) => { if (els.length) emit('pick', it[els[0].index].id); },
      onHover: (e, els) => { if (e.native && e.native.target) e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
    }
  };
}
function render() {
  if (failed.value || !cv.value) return;
  try {
    const c = cfg();
    if (chart) { chart.data = c.data; chart.options = c.options; chart.update(); } else chart = new Chart(cv.value, c);
  } catch (e) { console.error('[AmanUI] Chart.js', e); failed.value = true; }
}
const sig = computed(() => JSON.stringify(props.items.map(x => [x.id, x.v])));
watch(sig, () => nextTick(render));
onMounted(() => { render(); offTheme = onTheme(() => nextTick(render)); });
onBeforeUnmount(() => { if (offTheme) offTheme(); if (chart) { chart.destroy(); chart = null; } });
</script>

<template>
  <div v-if="!items.length" class="mut dv-empty">لا توجد بيانات للعرض.</div>
  <div v-else class="dv-don2">
    <div class="dv-dcv">
      <canvas v-if="!failed" ref="cv" role="img" aria-label="توزيع المؤمن عليهم"></canvas>
      <div v-else class="mut">تعذر رسم الدائرة</div>
      <div class="dv-dc"><b>{{ num(total) }}</b><small>{{ centerLabel }}</small></div>
    </div>
    <ul class="dv-dl">
      <li v-for="x in items" :key="x.id">
        <button type="button" @click="emit('pick', x.id)" :title="'عرض ' + x.name"><i :style="{ background: x.color }"></i><span class="n">{{ x.name }}</span><b>{{ num(x.v) }}</b><small>{{ num(pct(x.v)) }}٪</small></button>
      </li>
    </ul>
  </div>
</template>
