<script setup>
// (30) مقارنة الاشتراكات (الالتحاقات) والخروج شهريًا + صافي الحركة. الضغط على شهر يفتح تفاصيله (نفس نافذة اللوحة القديمة).
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Chart, palette, onTheme, tooltipBase } from './core/charts.js';
import { compare } from './core/dash.js';

const props = defineProps({ tick: { type: Number, default: 0 }, co: { type: String, default: '' }, per: { type: Number, default: 12 } });
const C = computed(() => { props.tick; return compare(props.co, props.per); });
const cv = ref(null), failed = ref(false);
let chart = null, offTheme = null;
const num = n => fm(n), ico = n => ic(n, 18);
const netTxt = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fm(Math.abs(n));

function cfg() {
  const p = palette(), c = C.value, dx = window.a9.dx;
  return {
    type: 'bar',
    data: {
      labels: c.labels,
      datasets: [
        { type: 'bar', label: 'التحاقات (اشتراكات جديدة)', data: c.hires, backgroundColor: '#0d9488', borderRadius: 6, maxBarThickness: 22, order: 2 },
        { type: 'bar', label: 'خروج', data: c.leaves, backgroundColor: '#ef4444', borderRadius: 6, maxBarThickness: 22, order: 2 },
        { type: 'line', label: 'الصافي', data: c.net, borderColor: '#6366f1', backgroundColor: '#6366f1', borderWidth: 2, tension: 0.35, pointRadius: 3, pointHoverRadius: 6, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, locale: 'ar-EG',
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: p.mut, usePointStyle: true, boxWidth: 8 } },
        tooltip: { ...tooltipBase(p), callbacks: { title: it => dx.mlabL(c.D[it[0].dataIndex].mo), label: x => ' ' + x.dataset.label + ': ' + (x.dataset.type === 'line' ? netTxt(x.parsed.y) : fm(x.parsed.y)) } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: p.mut, maxRotation: 0 } },
        y: { grid: { color: p.bd }, border: { display: false }, ticks: { color: p.mut, precision: 0 }, suggestedMin: 0 }
      },
      onClick: (e, els) => { if (els.length) window.a9.chOpen(c.D[els[0].index].mo); },
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
const sig = computed(() => JSON.stringify([props.per, C.value.hires, C.value.leaves, C.value.D.map(x => x.mo)]));
watch(sig, () => nextTick(render));
onMounted(() => { render(); offTheme = onTheme(() => nextTick(render)); });
onBeforeUnmount(() => { if (offTheme) offTheme(); if (chart) { chart.destroy(); chart = null; } });
</script>

<template>
  <div>
    <h4><span v-html="ico('swap')"></span> الاشتراكات والخروج شهريًا <small class="mut">· آخر {{ num(per) }} شهر</small></h4>
    <div class="dv-chips">
      <span class="tag a">+{{ num(C.sumH) }} التحاق</span>
      <span class="tag r">−{{ num(C.sumL) }} خروج</span>
      <span class="tag" :class="C.sumH - C.sumL >= 0 ? 'a' : 'r'">الصافي {{ netTxt(C.sumH - C.sumL) }}</span>
    </div>
    <div class="dv-cv dv-cv-s"><canvas v-if="!failed" ref="cv" role="img" aria-label="مقارنة الاشتراكات والخروج شهريًا"></canvas><p v-else class="mut">تعذر رسم المقارنة.</p></div>
  </div>
</template>
