<script setup>
// خط مصغّر (sparkline) — المحور يبدأ من الصفر كما في اللوحة القديمة حتى لا يظهر الفرق الصغير كصعود حاد.
import { computed } from 'vue';
const props = defineProps({ values: { type: Array, default: () => [] }, color: { type: String, default: '#0d9488' }, height: { type: Number, default: 46 } });
let uid = 0;
const gid = 'sg' + (++uid) + Math.random().toString(36).slice(2, 6);
const W = 140;
const geo = computed(() => {
  const v = props.values.length ? props.values : [0, 0];
  const h = props.height, mx = Math.max(...v, 1), rg = mx || 1, st = W / ((v.length - 1) || 1);
  const pts = v.map((x, i) => [i * st, h - 6 - (x / rg) * (h - 16)]);
  let d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], cx = (p[0] + q[0]) / 2; d += ' C' + cx + ',' + p[1] + ' ' + cx + ',' + q[1] + ' ' + q[0] + ',' + q[1]; }
  return { d, area: d + ' L' + W + ',' + h + ' L0,' + h + ' Z' };
});
</script>

<template>
  <svg class="sp" :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="color" stop-opacity=".45" />
        <stop offset="1" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="geo.area" :fill="`url(#${gid})`" />
    <path :d="geo.d" fill="none" :stroke="color" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linecap="round" />
  </svg>
</template>
