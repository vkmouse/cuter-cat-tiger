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
  <BaseSheet :open="open" :title="title" elevated panel-class="confirm-sheet-panel" @cancel="emit('cancel')">
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
/* 不能加 scoped：原因同 OverviewSheet，h2 現在是 BaseSheet 的內部節點，
   scoped CSS 碰不到，這裡只是把原本的 8px 標題間距用專屬 class 保留下來。 */
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
