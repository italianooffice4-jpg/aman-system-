<script setup>
import { SHORTCUTS } from './core/shortcuts.js';
defineProps({ open: Boolean });
const emit = defineEmits(['close']);
</script>

<template>
  <div v-if="open" class="at-ov" @click.self="emit('close')">
    <div class="at-dlg" role="dialog" aria-label="اختصارات لوحة المفاتيح">
      <div class="at-dh"><h3>اختصارات لوحة المفاتيح</h3><button class="at-x" aria-label="إغلاق" @click="emit('close')">×</button></div>
      <div class="at-sc">
        <div v-for="(s, i) in SHORTCUTS" :key="i" class="at-sr">
          <span class="at-keys"><kbd v-for="(k, j) in s.keys" :key="j">{{ k }}</kbd></span>
          <span>{{ s.desc }}</span>
        </div>
      </div>
      <p class="at-note">الاختصارات لا تعمل أثناء الكتابة داخل حقل، وتعمل مع لوحة المفاتيح العربية.</p>
    </div>
  </div>
</template>
