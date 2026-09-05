<script setup lang="ts">
/**
 * 批次餵食的入口：跨貓咪、跨水/飼料，跟 DailyStats 上單隻貓的「開始餵水/開始餵飼料」分開，
 * 各自服務不同情境（單隻 vs 多隻一起）。
 */
withDefaults(defineProps<{ pendingCount?: number }>(), { pendingCount: 0 })

const emit = defineEmits<{
  'start-batch': []
  'complete-batch': []
}>()
</script>

<template>
  <div class="batch-feeding-bar">
    <button type="button" class="batch-bar-btn" @click="emit('start-batch')">批次開始餵食</button>
    <button type="button" class="batch-bar-btn" :disabled="!pendingCount" @click="emit('complete-batch')">
      批次完成餵食
      <span v-if="pendingCount" class="batch-bar-badge">{{ pendingCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.batch-feeding-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: 12px 16px 0;
}

.batch-bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--paper-dark);
  color: var(--ink);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.82rem;
}

.batch-bar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-bar-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-pill);
  background: var(--water);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
