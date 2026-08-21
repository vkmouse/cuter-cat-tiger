<script setup lang="ts">
import BaseSheet from './BaseSheet.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
    saving?: boolean
  }>(),
  {
    message: '',
    confirmText: '確定',
    cancelText: '取消',
    danger: false,
    saving: false,
  },
)

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <BaseSheet :open="open" :title="title" elevated panel-class="confirm-sheet-panel sheet-panel--compact" @cancel="emit('cancel')">
    <p v-if="message" class="message">{{ message }}</p>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" @click="emit('cancel')">{{ cancelText }}</button>
      <button type="button" class="btn primary" :class="{ danger }" :disabled="saving" @click="emit('confirm')">
        {{ saving ? '處理中…' : confirmText }}
      </button>
    </div>
  </BaseSheet>
</template>

<style>
/* h2 屬於 BaseSheet，需使用非 scoped CSS。 */
.confirm-sheet-panel h2 {
  margin: 0 0 8px;
}
</style>

<style scoped>
.message {
  font-size: 0.88rem;
  color: var(--ink-soft);
  margin: 0 0 18px;
  line-height: 1.5;
}

.btn.primary.danger {
  background: #B3432F;
}
</style>
