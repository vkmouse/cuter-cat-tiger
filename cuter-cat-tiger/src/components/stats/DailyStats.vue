<script setup lang="ts">
import { round1 } from '../../utils/number'
import type { RecordType } from '../../types'

/**
 * 統計數字本身就是入口：右上角「+」直接記一筆，水/飼料下面另外放
 * 明確標示的「開始餵」按鈕，避免整張卡片可點但意圖不明。
 */
defineProps<{
  waterMl: number
  foodG: number
  peeCount: number
  poopCount: number
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'quick-record': [type: RecordType]
  'start-feeding': [type: 'water' | 'food']
}>()
</script>

<template>
  <div class="stats">
    <div class="stat water">
      <button class="quick-btn" :disabled="disabled" aria-label="直接記錄喝水" @click="emit('quick-record', 'water')">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <div class="num">{{ loading ? '—' : round1(waterMl) }}<span class="unit"> ml</span></div>
      <div class="lbl">當日喝水量</div>
      <button class="feed-btn" :disabled="disabled" @click="emit('start-feeding', 'water')">開始餵水</button>
    </div>
    <div class="stat food">
      <button class="quick-btn" :disabled="disabled" aria-label="直接記錄飼料" @click="emit('quick-record', 'food')">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <div class="num">{{ loading ? '—' : round1(foodG) }}<span class="unit"> g</span></div>
      <div class="lbl">當日飼料量</div>
      <button class="feed-btn" :disabled="disabled" @click="emit('start-feeding', 'food')">開始餵飼料</button>
    </div>
    <div class="stat litter">
      <button class="quick-btn" :disabled="disabled" aria-label="直接記錄尿尿" @click="emit('quick-record', 'pee')">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <div class="num">{{ loading ? '—' : peeCount }}<span class="unit"> 次</span></div>
      <div class="lbl">今日尿尿</div>
    </div>
    <div class="stat litter">
      <button class="quick-btn" :disabled="disabled" aria-label="直接記錄大便" @click="emit('quick-record', 'poop')">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <div class="num">{{ loading ? '—' : poopCount }}<span class="unit"> 次</span></div>
      <div class="lbl">今日大便</div>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}

.stat {
  position: relative;
  background: var(--water-soft);
  border-radius: var(--radius-md);
  padding: 11px 14px;
}

.stat.food {
  background: var(--food-soft);
}

.stat.litter {
  background: var(--litter-soft);
}

.stat .num {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 1.3rem;
  color: var(--water);
}

.stat.food .num {
  color: var(--food);
}

.stat.litter .num {
  color: var(--litter);
}

.stat .unit {
  font-size: 0.8rem;
  font-weight: 500;
}

.stat .lbl {
  font-size: 0.7rem;
  color: var(--ink-soft);
  margin-top: 2px;
}

/* 每張卡片右上角統一放「+」，代表「直接記一筆」，四種類型意義都相同。 */
.quick-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--water);
  color: var(--water-soft);
  cursor: pointer;
}

.stat.food .quick-btn {
  background: var(--food);
  color: var(--food-soft);
}

.stat.litter .quick-btn {
  background: var(--litter);
  color: var(--litter-soft);
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 「開始餵」是獨立標示的動作，跟上面的「+」分開，不會讓人誤以為點卡片就是開始餵。 */
.feed-btn {
  width: 100%;
  margin-top: 8px;
  padding: 6px 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--water);
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.78rem;
  cursor: pointer;
}

.stat.food .feed-btn {
  background: var(--food);
}

.feed-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
