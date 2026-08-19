<script setup lang="ts">
import { computed } from 'vue'
import { formatDateLabel, isTodayDateKey, weekdayLabel } from '../../utils/date'

const props = defineProps<{
  date: string
}>()

const emit = defineEmits<{
  prevDay: []
  nextDay: []
  openAllCatsStats: []
}>()

const dateLabel = computed(() => formatDateLabel(props.date))
const dateSub = computed(() => {
  const w = weekdayLabel(props.date)
  return isTodayDateKey(props.date) ? `${w} · 今天` : w
})
</script>

<template>
  <div class="date-nav">
    <div class="nav-side left">
      <button class="nav-arrow" aria-label="前一天" @click="emit('prevDay')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18" /></svg>
      </button>
    </div>
    <div class="date-center">
      <div class="date-label">{{ dateLabel }}</div>
      <div class="date-sub">{{ dateSub }}</div>
    </div>
    <div class="nav-side right">
      <button class="nav-arrow" aria-label="後一天" @click="emit('nextDay')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
      </button>
      <button class="allcats-stats-btn" aria-label="多貓總覽" title="多貓總覽" @click="emit('openAllCatsStats')">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.date-nav {
  /* 用 grid 而非 flex + space-between：右側多了「總覽」鈕後兩側寬度不再對稱，
     grid 的兩側各佔 1fr、內容分別靠左/靠右對齊，中間日期才能維持真正置中。 */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.nav-side {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-side.left {
  justify-content: flex-start;
}

.nav-side.right {
  justify-content: flex-end;
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

.allcats-stats-btn {
  background: var(--paper);
  border: 1px solid var(--line);
  cursor: pointer;
  color: var(--water);
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.allcats-stats-btn:hover {
  background: var(--water);
  color: #fff;
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
