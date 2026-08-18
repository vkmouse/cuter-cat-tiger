<script setup lang="ts">
import { computed } from 'vue'
import { formatDateLabel, isTodayDateKey, weekdayLabel } from '../../utils/date'

const props = defineProps<{
  date: string
}>()

const emit = defineEmits<{
  prevDay: []
  nextDay: []
}>()

const dateLabel = computed(() => formatDateLabel(props.date))
const dateSub = computed(() => {
  const w = weekdayLabel(props.date)
  return isTodayDateKey(props.date) ? `${w} · 今天` : w
})
</script>

<template>
  <div class="date-nav">
    <button class="nav-arrow" aria-label="前一天" @click="emit('prevDay')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18" /></svg>
    </button>
    <div class="date-center">
      <div class="date-label">{{ dateLabel }}</div>
      <div class="date-sub">{{ dateSub }}</div>
    </div>
    <button class="nav-arrow" aria-label="後一天" @click="emit('nextDay')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
    </button>
  </div>
</template>

<style scoped>
.date-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.nav-arrow {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-soft);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.nav-arrow:hover {
  background: var(--paper-dark);
}

.date-center {
  text-align: center;
}

.date-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.date-sub {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--ink-soft);
}
</style>
