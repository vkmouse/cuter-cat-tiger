<script setup lang="ts">
import { computed } from 'vue'
import type { CatRecord } from '../../types'
import { formatTimeLabel } from '../../utils/date'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

const props = defineProps<{
  record: CatRecord
}>()

const emit = defineEmits<{
  edit: [record: CatRecord]
  remove: [id: number]
}>()

const timeLabel = computed(() => formatTimeLabel(props.record.occurredAt))
</script>

<template>
  <div class="record-row" :class="record.type">
    <div class="badge">
      <svg v-if="record.type === 'water'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4.2 5 7 8.6 7 12.2A7 7 0 1 1 5 15.2C5 11.6 7.8 8 12 3z" /></svg>
      <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16" /><path d="M5 11a7 6.2 0 0 0 14 0" /><path d="M9 11c.4-1.8 1.4-2.8 3-2.8s2.6 1 3 2.8" /></svg>
    </div>
    <div class="record-main">
      <div class="record-top">
        <span class="record-time">{{ timeLabel }}</span>
        <span class="record-amount">{{ round1(record.amount) }} {{ record.unit }}</span>
      </div>
      <div v-if="record.note" class="record-note">{{ record.note }}</div>
    </div>
    <div class="record-actions">
      <button class="icon-btn" aria-label="修改" @click="emit('edit', record)">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      </button>
      <button class="icon-btn" aria-label="刪除" @click="emit('remove', record.id)">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.record-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 18px;
  border-bottom: 1px dashed var(--line);
  position: relative;
}

.record-row:last-child {
  border-bottom: none;
}

.record-row::before,
.record-row::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--paper);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  border: 1px solid var(--line);
}

.record-row::before {
  left: -8px;
}

.record-row::after {
  right: -8px;
}

.badge {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--water-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.record-row.food .badge {
  background: var(--food-soft);
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.record-time {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.record-amount {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.98rem;
}

.record-row.food .record-amount {
  color: var(--food);
}

.record-row.water .record-amount {
  color: var(--water);
}

.record-note {
  font-size: 0.8rem;
  color: var(--ink-soft);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
}

.record-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: var(--paper-dark);
  color: var(--ink);
}
</style>
