<script setup lang="ts">
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
  <div class="sheet-backdrop sheet-backdrop--elevated" :class="{ show: open }" @click="emit('cancel')" />
  <div class="sheet-panel sheet-panel--elevated confirm-sheet" :class="{ show: open }" role="dialog" aria-modal="true" aria-labelledby="confirmSheetTitle">
    <div class="sheet-handle" aria-hidden="true" />
    <h2 id="confirmSheetTitle">{{ title }}</h2>
    <p v-if="message" class="message">{{ message }}</p>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" @click="emit('cancel')">{{ cancelText }}</button>
      <button type="button" class="btn primary" :class="{ danger }" :disabled="saving" @click="emit('confirm')">
        {{ saving ? '處理中…' : confirmText }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.confirm-sheet h2 {
  margin: 0 0 8px;
}

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
