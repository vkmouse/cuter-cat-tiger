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
    <button
      type="button"
      class="add-cat-btn"
      aria-label="新增貓咪"
      title="新增貓咪"
      @click="emit('addCat')"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    </button>
  </div>
</template>

<style scoped>
.cat-tabs {
  display: flex;
  gap: 4px;
  padding: 10px 16px 2px;
  overflow-x: auto;
  overflow-y: hidden; /* 避免橫向滑動時產生垂直捲軸 */
  scrollbar-width: none; /* 保留橫向滑動但隱藏捲軸 */
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--paper);
  background-image: radial-gradient(circle at 1px 1px, rgba(38, 48, 42, 0.06) 1px, transparent 0);
  background-size: 16px 16px;
}

.cat-tabs::-webkit-scrollbar {
  display: none; /* 保留橫向滑動但隱藏捲軸 */
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

/* 新增按鈕刻意弱化，避免搶走目前貓咪的視覺焦點。 */
.add-cat-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  align-self: center;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.add-cat-btn:hover {
  border-color: var(--water);
  color: var(--water);
}
</style>
