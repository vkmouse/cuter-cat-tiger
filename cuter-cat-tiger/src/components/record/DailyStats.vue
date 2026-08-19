<script setup lang="ts">
defineProps<{
  waterMl: number
  foodG: number
  peeCount: number
  poopCount: number
  loading?: boolean
}>()

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
</script>

<template>
  <div class="stats">
    <div class="stat water">
      <div class="num">{{ loading ? '—' : round1(waterMl) }}<span class="unit"> ml</span></div>
      <div class="lbl">當日喝水量</div>
    </div>
    <div class="stat food">
      <div class="num">{{ loading ? '—' : round1(foodG) }}<span class="unit"> g</span></div>
      <div class="lbl">當日飼料量</div>
    </div>
    <div class="stat litter">
      <div class="num">{{ loading ? '—' : peeCount }}<span class="unit"> 次</span></div>
      <div class="lbl">今日尿尿</div>
    </div>
    <div class="stat litter">
      <div class="num">{{ loading ? '—' : poopCount }}<span class="unit"> 次</span></div>
      <div class="lbl">今日大便</div>
    </div>
  </div>
</template>

<style scoped>
/* 從 2 個數字（水/飼料）變成 4 個（多了尿尿/大便次數），一排放不下，
   改成 2x2 grid；跟決策點1（快速記錄按鈕）採同一種「兩排兩欄」排版邏輯，維持視覺一致。 */
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}

.stat {
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
</style>
