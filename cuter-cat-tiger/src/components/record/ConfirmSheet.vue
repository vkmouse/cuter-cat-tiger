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
  <div class="confirm-backdrop" :class="{ show: open }" @click="emit('cancel')" />
  <div class="confirm-sheet" :class="{ show: open }" role="dialog" aria-modal="true" aria-labelledby="confirmSheetTitle">
    <div class="handle" aria-hidden="true" />
    <h2 id="confirmSheetTitle">{{ title }}</h2>
    <p v-if="message" class="message">{{ message }}</p>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" @click="emit('cancel')">{{ cancelText }}</button>
      <button type="button" class="btn confirm" :class="{ danger }" :disabled="saving" @click="emit('confirm')">
        {{ saving ? '處理中…' : confirmText }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(38, 48, 42, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: 12;
}

.confirm-backdrop.show {
  opacity: 1;
  pointer-events: auto;
}

.confirm-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 420px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -10px 30px rgba(38, 48, 42, 0.25);
  padding: 10px 22px 26px;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 13;
}

.confirm-sheet.show {
  transform: translateY(0);
}

.handle {
  width: 40px;
  height: 4px;
  background: var(--line);
  border-radius: 4px;
  margin: 8px auto 14px;
}

.confirm-sheet h2 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  margin: 0 0 8px;
}

.message {
  font-size: 0.88rem;
  color: var(--ink-soft);
  margin: 0 0 18px;
  line-height: 1.5;
}

.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn.ghost {
  background: var(--paper-dark);
  color: var(--ink-soft);
}

.btn.confirm {
  background: var(--water);
  color: #fff;
}

.btn.confirm.danger {
  background: #B3432F;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
