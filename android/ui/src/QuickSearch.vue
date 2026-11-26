<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useDataVersion, usePrefs } from './core/bridge.js';
import { pushHistory, removeHistory, clearHistory } from './core/prefs.js';
import { navItems, norm } from './core/legacy.js';

// (46) بحث فوري مع التنقل بالأسهم، و(48) تاريخ البحث. نفس مصادر بيانات gs() القديمة (موظفون، شركات، طلبات، سيارات، مهام، صفحات).
const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);
const ver = useDataVersion();
const prefs = usePrefs();
const q = ref('');
const active = ref(0);
const input = ref(null);
const list = ref(null);
const svg = (n) => (typeof ic === 'function' ? ic(n, 17) : '');

watch(() => props.open, (v) => { if (v) { q.value = ''; active.value = 0; nextTick(() => input.value && input.value.focus()); } });
watch(q, () => { active.value = 0; });

const items = computed(() => {
  ver.value;
  const out = [];
  const t = q.value.trim();
  if (!t) {
    navItems().forEach(x => out.push({ k: 'p' + x.id, icon: x.icon, title: x.title, sub: 'صفحة', run: () => nv(x.id) }));
    return out;
  }
  const nq = norm(t);
  const has = (o) => hay(o).includes(nq);
  byRecent(S.emps.filter(has)).slice(0, 8).forEach(e => out.push({ k: 'e' + e.id, icon: 'user', title: e.name, sub: cn(e.cid) + ' · ' + (e.code || ''), run: () => prof(e.id) }));
  S.companies.filter(has).forEach(c => out.push({ k: 'c' + c.id, icon: 'building', title: c.name, sub: 'شركة', run: () => empOf(c.id) }));
  byRecent(Q().filter(has)).slice(0, 5).forEach(r => out.push({ k: 'q' + r.id, icon: 'clip', title: r.name, sub: 'طلب دخول', run: () => nv('req') }));
  CS().filter(has).slice(0, 5).forEach(c => out.push({ k: 'k' + c.id, icon: 'car', title: c.plate, sub: 'سيارة', run: () => nv('cars') }));
  TS().filter(has).slice(0, 5).forEach(x => out.push({ k: 't' + x.id, icon: 'clock', title: x.title, sub: 'مهمة', run: () => nv('asst') }));
  return out;
});

function choose(i) {
  const it = items.value[i == null ? active.value : i];
  if (!it) return;
  pushHistory(q.value);
  emit('close');
  it.run();
}
function move(d) {
  const n = items.value.length; if (!n) return;
  active.value = (active.value + d + n) % n;
  nextTick(() => { const el = list.value && list.value.querySelector('.is-on'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); });
}
function useHist(t) { q.value = t; nextTick(() => input.value && input.value.focus()); }
</script>

<template>
  <div v-if="open" class="at-ov" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div class="at-dlg at-qs" role="dialog" aria-label="بحث سريع">
      <div class="sbox"><span v-html="svg('search')"></span>
        <input ref="input" v-model="q" placeholder="ابحث عن موظف أو شركة أو صفحة…" autocomplete="off"
               @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="choose()" @keydown.esc="emit('close')" />
      </div>
      <div v-if="!q.trim() && prefs.search.length" class="at-hist-row">
        <span class="mut">عمليات بحث سابقة:</span>
        <span v-for="h in prefs.search" :key="h" class="at-chip"><button type="button" @click="useHist(h)">{{ h }}</button><button type="button" class="at-chx" aria-label="حذف" @click="removeHistory(h)">×</button></span>
        <button type="button" class="at-link" @click="clearHistory()">مسح الكل</button>
      </div>
      <div ref="list" class="gr">
        <button v-for="(it, i) in items" :key="it.k" class="gi" :class="{ 'is-on': i === active }" @mousemove="active = i" @click="choose(i)">
          <span v-html="svg(it.icon)"></span><span>{{ it.title }}</span><small>{{ it.sub }}</small>
        </button>
        <p v-if="!items.length" class="mut">لا توجد نتائج</p>
      </div>
      <p class="at-note">↑ ↓ للتنقل · Enter للفتح · Esc للإغلاق</p>
    </div>
  </div>
</template>
