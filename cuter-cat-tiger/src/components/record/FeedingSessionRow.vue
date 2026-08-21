<script setup lang="ts">
import { computed } from 'vue'
import type { FeedingSession } from '../../types'
import { formatSinceLabel } from '../../utils/date'
import { round1 } from '../../utils/number'
import RecordTypeIcon from './RecordTypeIcon.vue'

const props = defineProps<{
  session: FeedingSession
}>()

const emit = defineEmits<{
  complete: [session: FeedingSession]
  edit: [session: FeedingSession]
  cancel: [session: FeedingSession]
}>()

const sinceLabel = computed(() => formatSinceLabel(props.session.givenAt))
const amountLabel = computed(() => `${round1(props.session.givenAmount)} ${props.session.unit}`)
</script>

<template>
  <div class="session-row" :class="session.type">
    <div class="badge">
      <RecordTypeIcon :type="session.type" :size="16" />
    </div>
    <div class="session-main">
      <div class="session-top">
        <span class="session-amount">已給 {{ amountLabel }}</span>
        <span class="session-since">{{ sinceLabel }}</span>
      </div>
      <div class="session-hint">還沒量測剩下多少</div>
    </div>
    <div class="session-actions">
      <button type="button" class="icon-btn" aria-label="修改給的量" @click="emit('edit', session)">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      </button>
      <button type="button" class="icon-btn" aria-label="取消" @click="emit('cancel', session)">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <button type="button" class="btn primary complete-btn" :class="{ food: session.type === 'food' }" @click="emit('complete', session)">
        完成
      </button>
    </div>
  </div>
</template>

<style scoped>
.session-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  border-bottom: 1px dashed var(--line);
  background: var(--water-soft);
}

.session-row.food {
  background: var(--food-soft);
}

.session-row:last-child {
  border-bottom: none;
}

.badge {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--card);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--water);
}

.session-row.food .badge {
  color: var(--food);
}

.session-main {
  flex: 1;
  min-width: 0;
}

.session-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.session-amount {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--water);
}

.session-row.food .session-amount {
  color: var(--food);
}

.session-since {
  font-size: 0.76rem;
  color: var(--ink-soft);
}

.session-hint {
  font-size: 0.76rem;
  color: var(--ink-soft);
  margin-top: 1px;
}

.session-actions {
  display: flex;
  align-items: center;
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
  background: var(--card);
  color: var(--ink);
}

.complete-btn {
  padding: 6px 14px;
  font-size: 0.82rem;
  border-radius: 50px;
}
</style>
