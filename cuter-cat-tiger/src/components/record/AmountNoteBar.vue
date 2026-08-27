<script setup lang="ts">
import type { RecordType } from '../../types'
import RecordTypeIcon from './RecordTypeIcon.vue'

/**
 * 「圖示 + 數量 + 備註」單一圓角列，取代原本 RecordFeedingSheet／StartFeedingSheet／
 * CompleteFeedingSheet 各自重複的「數量」欄位 + 「備註」欄位（兩個 label + 兩個框）。
 * 數量本身不可編輯（純顯示，實際輸入交給下方的 CalculatorPad），備註則是可輸入的 input，
 * 三個 Sheet 共用同一份樣式，避免各自長出一套 CSS。
 */
withDefaults(
  defineProps<{
    type: RecordType
    amount: string
    unit: string
    note: string
    notePlaceholder?: string
    noteAriaLabel?: string
  }>(),
  {
    notePlaceholder: '在此輸入備註',
    noteAriaLabel: '備註',
  },
)

const emit = defineEmits<{
  'update:note': [value: string]
}>()
</script>

<template>
  <div class="amount-note-bar" :class="type">
    <RecordTypeIcon :type="type" :size="18" class="amount-note-icon" />
    <span class="amount-note-value">
      {{ amount || '0' }}<span class="amount-note-unit"> {{ unit }}</span>
    </span>
    <input
      class="amount-note-input"
      type="text"
      :value="note"
      :placeholder="notePlaceholder"
      :aria-label="noteAriaLabel"
      @input="emit('update:note', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<style scoped>
.amount-note-bar.water { --bar-accent: var(--water); }
.amount-note-bar.food { --bar-accent: var(--food); }
.amount-note-bar.pee { --bar-accent: var(--litter); }
.amount-note-bar.poop { --bar-accent: var(--litter); }

.amount-note-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--card);
  box-shadow: var(--shadow-raised-active);
}

.amount-note-icon {
  flex-shrink: 0;
  color: var(--bar-accent);
}

.amount-note-value {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 1rem;
  color: var(--ink);
  padding-right: var(--space-2);
  border-right: 1px solid var(--line);
}

.amount-note-unit {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink-soft);
}

.amount-note-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--ink);
  padding: 0;
}

.amount-note-input::placeholder {
  color: var(--ink-soft);
}

.amount-note-input:focus {
  outline: none;
}
</style>
