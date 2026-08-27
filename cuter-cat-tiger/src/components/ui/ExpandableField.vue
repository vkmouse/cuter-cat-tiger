<script setup lang="ts">
/**
 * 通用的「點一下展開、點一下摺疊」欄位外殼。
 * summary slot 永遠顯示（點擊整列即可切換），預設 slot 只在展開時渲染，
 * 給 DateTimePicker（日曆+時間）跟 RecordFeedingSheet 裡的 CalculatorPad 共用同一套互動與樣式。
 */
defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  'update:expanded': [value: boolean]
}>()
</script>

<template>
  <div class="expandable-field" :class="{ expanded }">
    <button
      type="button"
      class="expandable-summary"
      :aria-expanded="expanded"
      @click="emit('update:expanded', !expanded)"
    >
      <span class="expandable-summary-content"><slot name="summary" /></span>
      <svg
        class="expandable-chevron"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    <div v-if="expanded" class="expandable-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.expandable-field {
  border-radius: var(--radius-md);
  background: var(--paper);
  overflow: hidden;
  transition: background 0.15s ease;
}

.expandable-field.expanded {
  background: var(--paper-dark);
}

.expandable-summary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  color: var(--ink);
  text-align: left;
}

.expandable-summary-content {
  flex: 1;
  min-width: 0;
}

.expandable-chevron {
  flex-shrink: 0;
  color: var(--ink-soft);
  transition: transform 0.2s ease;
}

.expandable-field.expanded .expandable-chevron {
  transform: rotate(180deg);
}

/* 展開內容用同一塊底色的內凹卡片承接，不用線條切開，
   靠 card 跟 paper-dark 的明度差自然分出「摘要列」與「展開區」兩層。 */
.expandable-body {
  margin: 0 8px 8px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--card);
}
</style>
