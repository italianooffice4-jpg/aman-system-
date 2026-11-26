<script setup>
import { useToasts } from './core/bridge.js';
import { dismiss, pause, resume, runAction } from './core/notify.js';
const toasts = useToasts();
const ICON = { success: '✓', error: '✕', warn: '!', info: 'i' };
</script>

<template>
  <div class="at-stack" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="at-toast" :class="'at-' + t.type" role="status"
         @mouseenter="pause(t.id)" @mouseleave="resume(t.id)">
      <span class="at-ic">{{ ICON[t.type] }}</span>
      <span class="at-msg">{{ t.msg }}</span>
      <span v-if="t.count > 1" class="at-cnt">×{{ t.count }}</span>
      <button v-if="t.action" class="at-act" @click="runAction(t.id)">{{ t.action.label }}</button>
      <button class="at-x" aria-label="إغلاق" @click="dismiss(t.id)">×</button>
    </div>
  </div>
</template>
