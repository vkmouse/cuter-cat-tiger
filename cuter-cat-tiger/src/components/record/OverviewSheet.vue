<script setup lang="ts">
import { computed } from 'vue'
import { formatDateLabel, formatSinceLabel } from '../../utils/date'
import type { DailyStat } from '../../types'

const props = withDefaults(
  defineProps<{
    open: boolean
    date: string
    stats: DailyStat[]
    activeCatId: number | null
    loading?: boolean
    error?: string | null
  }>(),
  {
    loading: false,
    error: null,
  },
)

const emit = defineEmits<{
  cancel: []
  selectCat: [catId: number]
}>()

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// 每隻貓的水量/飼料量 bar 用「同一批貓咪裡的最大值」當作滿格基準，
// 純粹讓彼此的量一眼比得出來，不是什麼「目標值」（目前資料模型沒有每隻貓的目標量）。
const maxWater = computed(() => Math.max(1, ...props.stats.map((s) => s.waterMl)))
const maxFood = computed(() => Math.max(1, ...props.stats.map((s) => s.foodG)))

// 只有多隻貓咪、且水量彼此有落差時，才標出當天喝最少的那隻，避免資料只有一隻貓或全部同量時誤導。
const lowestWaterCatId = computed(() => {
  if (props.stats.length < 2) return null
  const sorted = [...props.stats].sort((a, b) => a.waterMl - b.waterMl)
  const lowest = sorted[0]!
  if (lowest.waterMl === sorted[sorted.length - 1]!.waterMl) return null
  return lowest.catId
})

function pct(value: number, max: number): number {
  return Math.min(100, Math.round((value / max) * 100))
}

function handleSelect(catId: number) {
  emit('selectCat', catId)
}
</script>

<template>
  <div class="sheet-backdrop sheet-backdrop--elevated" :class="{ show: open }" @click="emit('cancel')" />
  <div class="sheet-panel sheet-panel--elevated overview-sheet" :class="{ show: open }" role="dialog" aria-modal="true" aria-labelledby="overviewSheetTitle">
    <div class="sheet-handle" aria-hidden="true" />
    <h2 id="overviewSheetTitle">今日總覽 · {{ formatDateLabel(date) }}</h2>

    <div v-if="loading" class="state-msg">載入中…</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <div v-else-if="stats.length === 0" class="state-msg">還沒有貓咪資料。</div>

    <ul v-else class="overview-list">
      <li
        v-for="stat in stats"
        :key="stat.catId"
        class="overview-row"
        :class="{ active: stat.catId === activeCatId }"
        role="button"
        tabindex="0"
        @click="handleSelect(stat.catId)"
        @keydown.enter="handleSelect(stat.catId)"
      >
        <div class="name">
          {{ stat.name }}
          <span v-if="stat.catId === lowestWaterCatId" class="low-tag">今日喝水較少</span>
        </div>
        <div class="bars">
          <div class="bar-line">
            <div class="bar-track">
              <div class="bar-fill water" :style="{ width: pct(stat.waterMl, maxWater) + '%' }" />
            </div>
            <span class="bar-val water">{{ round1(stat.waterMl) }} ml</span>
          </div>
          <div class="bar-line">
            <div class="bar-track">
              <div class="bar-fill food" :style="{ width: pct(stat.foodG, maxFood) + '%' }" />
            </div>
            <span class="bar-val food">{{ round1(stat.foodG) }} g</span>
          </div>
          <div class="litter-row">
            <span class="litter-item">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4c2.6 3.2 4.4 5.6 4.4 8.2A4.4 4.4 0 1 1 7.6 12.2C7.6 9.6 9.4 7.2 12 4z" /><circle cx="12" cy="13" r="1.4" /></svg>
              尿尿 {{ stat.peeCount }} 次 · <span class="since">{{ formatSinceLabel(stat.lastPeeAt) }}</span>
            </span>
            <span class="litter-item">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20c-4.4 0-7-1.4-7-3.4 0-1.3 1-2.1 2.3-2.5-.6-.6-1-1.4-1-2.3 0-1.7 1.5-2.9 3.2-2.8-.2-.5-.3-1-.3-1.6 0-1.9 1.6-3.4 3.5-3.4 1.7 0 3.1 1.2 3.4 2.8 1.6 0 2.9 1.2 2.9 2.7 0 .8-.3 1.5-.9 2 1.3.4 2.3 1.3 2.3 2.6 0 2-2.6 3.4-7 3.4-.5.3-1 .5-1.4.5s-.9-.2-1-.5z" /></svg>
              大便 {{ stat.poopCount }} 次 · <span class="since">{{ formatSinceLabel(stat.lastPoopAt) }}</span>
            </span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 貓咪數量多時內容可能超過畫面高度，限制 max-height 並可捲動 */
.overview-sheet {
  max-height: 72vh;
  padding: 10px 18px calc(20px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.overview-sheet h2 {
  font-size: 1.1rem;
  margin: 0 0 14px;
}

.state-msg {
  color: var(--ink-soft);
  font-size: 0.85rem;
  padding: 16px 0 24px;
  text-align: center;
}

.state-msg.error {
  color: #B3432F;
}

.overview-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.overview-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 6px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.overview-row:hover,
.overview-row:focus-visible {
  background: var(--paper);
  outline: none;
}

.overview-row.active {
  background: var(--water-soft);
}

.overview-row .name {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.9rem;
  width: 64px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.low-tag {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 0.62rem;
  color: var(--food);
}

.bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-track {
  flex: 1;
  height: 6px;
  border-radius: 4px;
  background: var(--paper-dark);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
}

.bar-fill.water {
  background: var(--water);
}

.bar-fill.food {
  background: var(--food);
}

.bar-val {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  color: var(--ink-soft);
  width: 52px;
  flex-shrink: 0;
  text-align: right;
}

/* 每隻貓的「今天次數」+「距離上次多久」，跟上面 water/food 的 bar 分開一行，
   因為 pee/poop 不量化，沒有可以畫 bar 的「量」，用文字並排呈現即可。 */
.litter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 2px;
}

.litter-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.66rem;
  color: var(--ink-soft);
}

.litter-item svg {
  color: var(--litter);
  flex-shrink: 0;
}

.litter-item .since {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--litter);
}
</style>
