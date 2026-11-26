<script setup>
// (27) رسم اتجاه الأعداد والأجور والاشتراكات بـ Chart.js: تلميحات عند المرور، تبديل خطي/أعمدة، والضغط على أي شهر يفتح تفاصيله.
// الحسابات نفسها حسابات اللوحة القديمة (a9.dx) مع فلتر الشركة والفترة. لو تعذّر Chart.js يظهر رسم SVG القديم تلقائيًا.
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import TrendChartSvg from './TrendChartSvg.vue';
import { Chart, palette, onTheme, rgba, areaFill, tooltipBase } from './core/charts.js';
import { monthly, empsOf } from './core/dash.js';

const props = defineProps({ tick: { type: Number, default: 0 }, co: { type: String, default: '' }, per: { type: Number, default: 12 } });
const dx = window.a9.dx;
const st = reactive({ m: window.a9.chState.m, kind: 'line' });
watch(() => st.m, v => { window.a9.chState.m = v; });
watch(() => props.per, v => { window.a9.chState.n = v; }, { immediate: true });

const D = computed(() => { props.tick; return monthly(props.co, props.per); });
const hasPay = computed(() => D.value.some(x => x.hasPay));
const M = computed(() => (st.m === 'pay' && !hasPay.value ? 'wage' : st.m));
const cf = computed(() => dx.CHM[M.value]);
const noStart = computed(() => { props.tick; return empsOf(props.co).filter(e => !e.start).length; });
const tabs = computed(() => Object.keys(dx.CHM).filter(k => k !== 'pay' || hasPay.value).map(k => ({ v: k, l: dx.CHM[k].l.split(' (')[0] })));
const kinds = [{ v: 'line', l: 'خطي' }, { v: 'bar', l: 'أعمدة' }];
const title = computed(() => cf.value.l);

const series = computed(() => (M.value === 'pay'
  ? [{ k: 'act', l: 'المخصوم فعلياً (الكشوف)', col: '#f59e0b', dash: false }, { k: 'exp', l: 'المتوقع حسب السجلات', col: '#8b5cf6', dash: true }]
  : [{ k: M.value, l: cf.value.l, col: cf.value.col, dash: false }]));

const cv = ref(null), failed = ref(false);
let chart = null, offTheme = null;

const fmt = v => (v == null ? '—' : cf.value.money ? mny(v) : fm(v));
const ico = n => ic(n, 18), num = n => fm(n);   // دوال البرنامج القديم العامة لا تُرى مباشرة من القالب
const open = mo => window.a9.chOpen(mo);
const table = () => window.a9.chTable();

function build() {
  const p = palette(), d = D.value, bar = st.kind === 'bar';
  const datasets = series.value.map(s => ({
    label: s.l, data: d.map(x => x[s.k]), borderColor: s.col, borderWidth: 2.4, borderDash: s.dash ? [6, 5] : [],
    backgroundColor: bar ? rgba(s.col, s.dash ? 0.35 : 0.8) : areaFill(s.col, 0.3), fill: !bar && !s.dash, tension: 0.35, spanGaps: false,
    pointRadius: bar ? 0 : 3, pointHoverRadius: 6, pointBackgroundColor: p.card, pointBorderColor: s.col, pointBorderWidth: 2, borderRadius: bar ? 6 : 0, maxBarThickness: 36
  }));
  return {
    type: st.kind,
    data: { labels: d.map((x, i) => dx.mlabC(x.mo, i, props.per)), datasets },
    options: {
      responsive: true, maintainAspectRatio: false, locale: 'ar-EG',
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1, labels: { color: p.mut, usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          ...tooltipBase(p),
          callbacks: {
            title: it => dx.mlabL(d[it[0].dataIndex].mo),
            label: c => ' ' + c.dataset.label + ': ' + fmt(c.parsed.y),
            afterBody: it => { const x = d[it[0].dataIndex]; return ['التحاقات: ' + fm(x.hires.length) + ' · خروج: ' + fm(x.leaves.length)]; }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: p.mut, maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: true, grid: { color: p.bd }, border: { display: false }, ticks: { color: p.mut, precision: 0, callback: v => dx.compact(v, cf.value.money) } }
      },
      onClick: (e, els) => { if (els.length) open(d[els[0].index].mo); },
      onHover: (e, els) => { if (e.native && e.native.target) e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
    }
  };
}

function render() {
  if (failed.value || !cv.value) return;
  try {
    const cfg = build();
    if (chart && chart.config.type === cfg.type) { chart.data = cfg.data; chart.options = cfg.options; chart.update(); }
    else { if (chart) chart.destroy(); chart = new Chart(cv.value, cfg); }
  } catch (e) { console.error('[AmanUI] Chart.js', e); failed.value = true; if (chart) { try { chart.destroy(); } catch (x) { /* لا شيء */ } chart = null; } }
}

// إعادة الرسم فقط عند تغيّر الأرقام فعلًا (التحديث التلقائي كل دقيقة لا يُعيد حركة الرسم بلا داعٍ)
const sig = computed(() => JSON.stringify([M.value, st.kind, props.per, D.value.map(x => [x.mo, x.cnt, x.wage, x.tot, x.act, x.exp, x.hires.length, x.leaves.length])]));
watch(sig, () => nextTick(render));
onMounted(() => { render(); offTheme = onTheme(() => nextTick(render)); });
onBeforeUnmount(() => { if (offTheme) offTheme(); if (chart) { chart.destroy(); chart = null; } });
</script>

<template>
  <TrendChartSvg v-if="failed" :tick="tick" :co="co" :per="per" />
  <div v-else>
    <h4><span v-html="ico('trend')"></span> {{ title }} <small class="mut">· آخر {{ num(per) }} شهر</small></h4>
    <div class="ctabs2">
      <SelectButton :modelValue="M" @update:modelValue="v => v && (st.m = v)" :options="tabs" optionLabel="l" optionValue="v" :allowEmpty="false" size="small" />
      <span class="sp1"></span>
      <SelectButton v-model="st.kind" :options="kinds" optionLabel="l" optionValue="v" :allowEmpty="false" size="small" aria-label="نوع الرسم" />
    </div>
    <div class="dv-cv"><canvas ref="cv" role="img" :aria-label="title"></canvas></div>
    <div class="cfoot"><span>اضغط على أي شهر لعرض التفاصيل وسبب التغيّر</span><Button size="small" rounded outlined severity="secondary" label="جدول الشهور" @click="table" /></div>
    <div v-if="noStart" class="cnote"><b class="up2">تنبيه: {{ num(noStart) }} موظف بدون تاريخ التحاق ويُحسبون مؤمَّنين طوال المدة.</b></div>
  </div>
</template>
