<script setup lang="ts">
import { computed } from 'vue'
import { formatDateLabel, formatSinceLabel } from '../../utils/date'
import { round1 } from '../../utils/number'
import type { DailyStat } from '../../types'
import RecordTypeIcon from '../record/RecordTypeIcon.vue'
import BaseSheet from '../ui/BaseSheet.vue'

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

// 只有存在可比較的差異時才標示最低值，避免單一或同量資料造成誤導。
const lowestWaterCatId = computed(() => {
  if (props.stats.length < 2) return null
  const sorted = [...props.stats].sort((a, b) => a.waterMl - b.waterMl)
  const lowest = sorted[0]!
  if (lowest.waterMl === sorted[sorted.length - 1]!.waterMl) return null
  return lowest.catId
})

// 長條相對「目標值」呈現：達標時整條變成達標色，滿版即代表達標（不再是貓咪之間互相比較）。
function pct(value: number, target: number): number {
  return Math.min(100, Math.round((value / Math.max(target, 0.0001)) * 100))
}

function achieved(value: number, target: number): boolean {
  return value >= target
}

function handleSelect(catId: number) {
  emit('selectCat', catId)
}
</script>

<template>
  <BaseSheet
    :open="open"
    :title="`今日總覽 · ${formatDateLabel(date)}`"
    elevated
    panel-class="allcats-stats-panel"
    @cancel="emit('cancel')"
  >
    <div v-if="loading" class="state-msg">載入中…</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <div v-else-if="stats.length === 0" class="state-msg">還沒有貓咪資料。</div>

    <ul v-else class="stats-list">
      <li
        v-for="stat in stats"
        :key="stat.catId"
        class="stats-row"
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
              <div
                class="bar-fill water"
                :class="{ achieved: achieved(stat.waterMl, stat.targetWater) }"
                :style="{ width: pct(stat.waterMl, stat.targetWater) + '%' }"
              />
            </div>
            <span class="bar-val water">{{ round1(stat.waterMl) }} / {{ round1(stat.targetWater) }} ml</span>
          </div>
          <div class="bar-line">
            <div class="bar-track">
              <div
                class="bar-fill food"
                :class="{ achieved: achieved(stat.foodG, stat.targetFood) }"
                :style="{ width: pct(stat.foodG, stat.targetFood) + '%' }"
              />
            </div>
            <span class="bar-val food">{{ round1(stat.foodG) }} / {{ round1(stat.targetFood) }} g</span>
          </div>
          <div class="litter-row">
            <span class="litter-item">
              <RecordTypeIcon type="pee" :size="12" />
              尿尿 {{ stat.peeCount }} 次 · <span class="since">{{ formatSinceLabel(stat.lastPeeAt) }}</span>
            </span>
            <span class="litter-item">
              <RecordTypeIcon type="poop" :size="12" />
              大便 {{ stat.poopCount }} 次 · <span class="since">{{ formatSinceLabel(stat.lastPoopAt) }}</span>
            </span>
          </div>
        </div>
      </li>
    </ul>
  </BaseSheet>
</template>

<style>
/* sheet-panel 是 BaseSheet 的 root，因此需要非 scoped CSS。 */
.allcats-stats-panel {
  max-height: 72vh;
  padding: 10px 18px calc(20px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.allcats-stats-panel h2 {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1.1rem;
  margin: 0 0 14px;
}
</style>

<style scoped>
.state-msg {
  color: var(--ink-soft);
  font-size: 0.85rem;
  padding: 16px 0 24px;
  text-align: center;
}

.state-msg.error {
  color: #B3432F;
}

.stats-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 6px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.stats-row:hover,
.stats-row:focus-visible {
  background: var(--paper);
  outline: none;
}

.stats-row.active {
  background: var(--water-soft);
}

.stats-row .name {
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

/* 達標時整條變成達標色，取代原本的 water/food 主色，作為主要的達標訊號。 */
.bar-fill.achieved {
  background: var(--good);
}

.bar-val {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  color: var(--ink-soft);
  width: 76px;
  flex-shrink: 0;
  text-align: right;
}

/* pee/poop 沒有可比較的數量，因此改用文字呈現。 */
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
