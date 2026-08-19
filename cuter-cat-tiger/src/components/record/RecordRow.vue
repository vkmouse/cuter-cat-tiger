<script setup lang="ts">
import { computed } from 'vue'
import type { CatRecord } from '../../types'
import { formatTimeLabel } from '../../utils/date'
import { round1 } from '../../utils/number'
import RecordTypeIcon from './RecordTypeIcon.vue'

const props = defineProps<{
  record: CatRecord
}>()

const emit = defineEmits<{
  edit: [record: CatRecord]
  remove: [id: number]
}>()

const timeLabel = computed(() => formatTimeLabel(props.record.occurredAt))

// pee/poop 不量化（amount 固定為 0），跟 water/food 那種「數字 + 單位」不是同一種資訊，
// 原本放數量的位置改放紀錄類型文字（決策點2：沿用 badge 版型，只是右側改文字）。
const LITTER_LABEL: Record<string, string> = { pee: '尿尿', poop: '大便' }
const isLitter = computed(() => props.record.type === 'pee' || props.record.type === 'poop')
const amountLabel = computed(() =>
  isLitter.value ? LITTER_LABEL[props.record.type] : `${round1(props.record.amount)} ${props.record.unit}`,
)
</script>

<template>
  <div class="record-row" :class="[record.type, { litter: isLitter }]">
    <div class="badge">
      <RecordTypeIcon :type="record.type" :size="isLitter ? 15 : 16" />
    </div>
    <div class="record-main">
      <div class="record-top">
        <span class="record-time">{{ timeLabel }}</span>
        <span class="record-amount">{{ amountLabel }}</span>
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

.record-row.litter .badge {
  background: var(--litter-soft);
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

.record-row.litter .record-amount {
  color: var(--litter);
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
