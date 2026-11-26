<script setup>
// نسخة SVG الاحتياطية للرسم البياني (v14): تظهر تلقائيًا لو تعذّر Chart.js. الحسابات نفسها؛ وتحترم فلتر الشركة/الفترة. الحسابات نفسها حسابات اللوحة القديمة (تُقرأ من a9.dx)،
// ونافذة تفاصيل الشهر وجدول الشهور تبقى القديمة (a9.chSel / a9.chTable) فلا تغيير في المنطق.
import { ref, reactive, computed, watch } from 'vue';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import { monthly, empsOf } from './core/dash.js';

const props = defineProps({ tick: { type: Number, default: 0 }, co: { type: String, default: '' }, per: { type: Number, default: 12 } });
const dx = window.a9.dx;
const st = reactive({ m: window.a9.chState.m, n: props.per });
watch(() => props.per, v => { st.n = v; });
watch(st, v => { window.a9.chState.m = v.m; window.a9.chState.n = v.n; }, { immediate: true });   // نفس الحالة المحفوظة للشكل القديم

const D = computed(() => { props.tick; return monthly(props.co, st.n); });
const hasPay = computed(() => D.value.some(x => x.hasPay));
const M = computed(() => (st.m === 'pay' && !hasPay.value ? 'wage' : st.m));
const cf = computed(() => dx.CHM[M.value]);
const noStart = computed(() => { props.tick; return empsOf(props.co).filter(e => !e.start).length; });

const tabs = computed(() => Object.keys(dx.CHM).filter(k => k !== 'pay' || hasPay.value).map(k => ({ v: k, l: dx.CHM[k].l.split(' (')[0] })));

const series = computed(() => (M.value === 'pay'
  ? [{ k: 'act', l: 'المخصوم فعلياً (الكشوف)', col: '#f59e0b', dash: false }, { k: 'exp', l: 'المتوقع حسب السجلات', col: '#8b5cf6', dash: true }]
  : [{ k: M.value, l: cf.value.l, col: cf.value.col, dash: false }]));

const W = 680, H = 190, L = 46, R_ = 14, T = 16, B = 26, iw = W - L - R_, ih = H - T - B;
let uid = 0;
const gid = 'tc' + Math.random().toString(36).slice(2, 7);

const geo = computed(() => {
  const d = D.value, vals = series.value.flatMap(s => d.map(x => x[s.k])).filter(v => v != null);
  const mx = Math.max(...vals, 0), step = dx.niceStep(mx), top = Math.max(step * Math.ceil(mx / step), step), ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const X = i => L + (d.length > 1 ? i * iw / (d.length - 1) : iw / 2), Y = v => T + ih - (v / top) * ih;
  const band = d.length > 1 ? iw / (d.length - 1) : iw;
  const grid = ticks.map(v => ({ y: Y(v), z: v === 0, t: dx.compact(v, cf.value.money) }));
  const xl = d.map((x, i) => ({ x: X(i), t: dx.mlabC(x.mo, i, st.n) }));
  const lines = series.value.map((s, si) => {
    const pts = d.map((x, i) => (x[s.k] == null ? null : [X(i), Y(x[s.k])]));
    let path = '', pen = false, prev = null;
    pts.forEach(q => {
      if (!q) { pen = false; prev = null; return; }
      if (!pen) path += ' M' + q[0] + ',' + q[1];
      else { const cx = (prev[0] + q[0]) / 2; path += ' C' + cx + ',' + prev[1] + ' ' + cx + ',' + q[1] + ' ' + q[0] + ',' + q[1]; }
      pen = true; prev = q;
    });
    const ok = pts.filter(Boolean);
    const area = (!s.dash && ok.length > 1) ? `${path} L${ok[ok.length - 1][0]},${Y(0)} L${ok[0][0]},${Y(0)} Z` : '';
    const dots = d.map((x, i) => { const v = x[s.k]; if (v == null) return null; const last = i === d.length - 1; return { x: X(i), y: Y(v), last, label: (last && !s.dash) ? dx.compact(v, cf.value.money) : '' }; }).filter(Boolean);
    return { ...s, path, area, dots, gid: gid + si };
  });
  const hits = d.map((x, i) => ({ mo: x.mo, x: X(i) - band / 2, w: band, title: dx.mlabL(x.mo) + ' — اضغط للتفاصيل' }));
  return { grid, xl, lines, hits };
});

const open = mo => window.a9.chSel(mo);
const table = () => window.a9.chTable();
const title = computed(() => cf.value.l);
const fmN = n => fm(n);
const ico = n => ic(n, 18);
</script>

<template>
  <div>
    <h4><span v-html="ico('trend')"></span> {{ title }} <small class="mut">· آخر {{ fmN(st.n) }} شهر</small></h4>
    <div class="ctabs2">
      <SelectButton :modelValue="M" @update:modelValue="v => v && (st.m = v)" :options="tabs" optionLabel="l" optionValue="v" :allowEmpty="false" size="small" />
      <span class="sp1"></span>
    </div>
    <div v-if="series.length > 1" class="clg"><span v-for="s in series" :key="s.k"><i :style="{ background: s.col }"></i>{{ s.l }}</span></div>

    <svg class="cht" :viewBox="`0 0 ${W} ${H}`" width="100%" role="img" :aria-label="title">
      <g v-for="(g, i) in geo.grid" :key="'g' + i">
        <line :x1="L" :x2="W - R_" :y1="g.y" :y2="g.y" :class="['gl', { z: g.z }]" />
        <text :x="L - 8" :y="g.y + 3.5" text-anchor="end" class="ax">{{ g.t }}</text>
      </g>
      <text v-for="(x, i) in geo.xl" :key="'x' + i" :x="x.x" :y="H - 8" text-anchor="middle" class="ax">{{ x.t }}</text>
      <g v-for="s in geo.lines" :key="s.k">
        <defs>
          <linearGradient :id="s.gid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" :stop-color="s.col" stop-opacity=".28" />
            <stop offset="1" :stop-color="s.col" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path v-if="s.area" :d="s.area" :fill="`url(#${s.gid})`" />
        <path :d="s.path" fill="none" :stroke="s.col" stroke-width="2.4" :stroke-dasharray="s.dash ? '6 5' : null" stroke-linejoin="round" stroke-linecap="round" />
        <g v-for="(p, i) in s.dots" :key="i">
          <circle :cx="p.x" :cy="p.y" :r="p.last ? 5 : 3" :fill="p.last ? s.col : 'var(--card)'" :stroke="s.col" stroke-width="2" />
          <text v-if="p.label" :x="p.x" :y="p.y - 10" text-anchor="end" class="vl">{{ p.label }}</text>
        </g>
      </g>
      <rect v-for="h in geo.hits" :key="h.mo" class="hit" :x="h.x" :y="T - 6" :width="h.w" :height="ih + B + 6" @click="open(h.mo)"><title>{{ h.title }}</title></rect>
    </svg>

    <div class="cfoot"><span>اضغط على أي شهر لعرض التفاصيل وسبب التغيّر</span><Button size="small" rounded outlined severity="secondary" label="جدول الشهور" @click="table" /></div>
    <div v-if="noStart" class="cnote"><b class="up2">تنبيه: {{ fmN(noStart) }} موظف بدون تاريخ التحاق ويُحسبون مؤمَّنين طوال المدة.</b></div>
  </div>
</template>
