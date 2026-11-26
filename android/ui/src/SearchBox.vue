<script setup>
import { ref, computed, watch } from 'vue';
import InputText from 'primevue/inputtext';
import { suggestions } from './core/search.js';
import { pushHistory, removeHistory } from './core/prefs.js';
import { debounce } from './core/util.js';

// (40) إكمال اسم الموظف، (46) بحث فوري (تأخير 120ms فقط لتخفيف الحساب)، (48) تاريخ البحث واقتراح أسماء
const props = defineProps({ modelValue: { type: String, default: '' }, placeholder: { type: String, default: 'بحث…' } });
const emit = defineEmits(['update:modelValue', 'commit']);

const text = ref(props.modelValue);
const open = ref(false);
const active = ref(-1);
watch(() => props.modelValue, (v) => { if (v !== text.value) text.value = v; });

const push = debounce((v) => emit('update:modelValue', v), 120);
function onInput(v) {
  text.value = v == null ? '' : String(v);
  active.value = -1; open.value = true;
  if (text.value === '') push.flush(''); else push(text.value);
}
const items = computed(() => (open.value ? suggestions(text.value, 8) : []));

function pick(it) {
  text.value = it.text; push.flush(it.text); pushHistory(it.text);
  open.value = false; active.value = -1;
  emit('commit', it.text);
}
function onKey(e) {
  const n = items.value.length;
  if (e.key === 'ArrowDown') { if (n) { e.preventDefault(); open.value = true; active.value = (active.value + 1) % n; } }
  else if (e.key === 'ArrowUp') { if (n) { e.preventDefault(); active.value = (active.value - 1 + n) % n; } }
  else if (e.key === 'Enter') {
    if (active.value >= 0 && items.value[active.value]) { e.preventDefault(); pick(items.value[active.value]); }
    else { push.flush(text.value); pushHistory(text.value); open.value = false; emit('commit', text.value); }
  }
  else if (e.key === 'Escape') { if (open.value) { open.value = false; e.stopPropagation(); } }
}
function onBlur() {
  setTimeout(() => { open.value = false; if (text.value.trim().length >= 3) pushHistory(text.value); }, 150);
}
function drop(it) { removeHistory(it.text); }
</script>

<template>
  <div class="at-sb">
    <InputText :modelValue="text" :placeholder="placeholder" autocomplete="off" @update:modelValue="onInput"
               @focus="open = true" @blur="onBlur" @keydown="onKey" />
    <ul v-if="open && items.length" class="at-sg" role="listbox">
      <li v-for="(it, i) in items" :key="it.kind + it.text" :class="{ 'is-on': i === active }" role="option">
        <button type="button" @mousedown.prevent="pick(it)">
          <span class="at-sgk">{{ it.kind === 'hist' ? '🕘' : '👤' }}</span>
          <span class="at-sgt">{{ it.text }}</span>
        </button>
        <button v-if="it.kind === 'hist'" type="button" class="at-sgx" aria-label="حذف من السجل" @mousedown.prevent="drop(it)">×</button>
      </li>
    </ul>
  </div>
</template>
