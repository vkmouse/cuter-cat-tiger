<script setup lang="ts">
/**
 * 通用的「點一下展開、點一下摺疊」欄位外殼。
 * summary slot 永遠顯示（點擊整列即可切換），預設 slot 只在展開時渲染，
 * 給 DateTimePicker（日曆+時間）跟 RecordFormSheet 裡的 CalculatorPad 共用同一套互動與樣式。
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
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--card);
  overflow: hidden;
}

.expandable-summary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
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

.expandable-body {
  padding: 0 12px 12px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}
</style>
