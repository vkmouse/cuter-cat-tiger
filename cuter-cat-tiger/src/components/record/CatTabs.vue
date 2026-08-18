<script setup lang="ts">
import type { Cat } from '../../types'

defineProps<{
  cats: Cat[]
  activeCatId: number | null
}>()

const emit = defineEmits<{
  select: [catId: number]
  addCat: []
}>()
</script>

<template>
  <div class="cat-tabs">
    <div
      v-for="cat in cats"
      :key="cat.id"
      class="cat-tab"
      :class="{ active: cat.id === activeCatId }"
      role="button"
      tabindex="0"
      @click="emit('select', cat.id)"
      @keydown.enter="emit('select', cat.id)"
    >
      {{ cat.name }}
    </div>
    <div class="cat-tab add" role="button" tabindex="0" @click="emit('addCat')" @keydown.enter="emit('addCat')">
      + 新增貓咪
    </div>
  </div>
</template>

<style scoped>
.cat-tabs {
  display: flex;
  gap: 4px;
  padding: 10px 16px 2px;
  overflow-x: auto;
  overflow-y: hidden; /* 只設定 overflow-x 會讓瀏覽器隱性把 overflow-y 也變成 auto，因而冒出不必要的垂直捲軸 */
  scrollbar-width: none; /* Firefox：橫向多貓咪時仍可滑動，但不顯示捲軸樣式 */
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--paper);
  background-image: radial-gradient(circle at 1px 1px, rgba(38, 48, 42, 0.06) 1px, transparent 0);
  background-size: 16px 16px;
}

.cat-tabs::-webkit-scrollbar {
  display: none; /* Chrome/Safari：同上 */
}

.cat-tab {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.95rem;
  padding: 10px 16px 9px;
  background: var(--paper-dark);
  color: var(--ink-soft);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  position: relative;
  top: 2px;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, top 0.15s ease;
}

.cat-tab.active {
  background: var(--card);
  color: var(--ink);
  top: 0;
  box-shadow: 0 -2px 0 var(--water) inset;
}

.cat-tab.add {
  color: var(--ink-soft);
  font-weight: 500;
  background: transparent;
  border-style: dashed;
}
</style>
