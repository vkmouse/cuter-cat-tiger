<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FeedingSession } from '../../types'
import BaseSheet from '../ui/BaseSheet.vue'
import CalculatorPad from './CalculatorPad.vue'
import { getQuickNotes } from '../../composables/useQuickNotes'

/**
 * 先給後測流程 step 1：只記下「給了多少」，建立/編輯一筆 FeedingSession。
 * 從 RecordFormSheet 拆出來（原本用內部 action state 切換），
 * 拆開後跟一般紀錄完全獨立：沒有時間、沒有 litter 分支；備註欄位沿用一般紀錄的樣式，跟數量並排顯示。
 * 量一律要求 > 0（先給後測不會有「這次給了 0」的情境）。
 *
 * 新增模式下畫面頂端仍保留跟「記錄」切換的 pill：
 * 這裡不是切內部狀態，而是 emit('switch-to-record', amount) 交給呼叫端關掉這個 sheet、
 * 換開 RecordFeedingSheet，並把目前輸入的量帶過去延續顯示。
 */

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'add' | 'edit'
    type: 'water' | 'food'
    catName: string
    feedingSession?: FeedingSession | null
    saving?: boolean
    // 從 RecordFeedingSheet 透過切換 pill 過來時，帶著對方當下輸入的量延續顯示；
    // 只在 mode === 'add' 時採用，edit 模式一律以 feedingSession 本身的量為準。
    initialAmount?: string
  }>(),
  { saving: false, feedingSession: null },
)

const emit = defineEmits<{
  cancel: []
  save: [payload: { amount: number; note: string }]
  // 帶上目前輸入的量，讓呼叫端可以原封不動延續到 RecordFeedingSheet。
  'switch-to-record': [amount: string]
}>()

const amount = ref('')
const note = ref('')
const quickNotes = ref<string[]>([])
const formInstanceKey = ref(0)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    if (props.mode === 'edit' && props.feedingSession) {
      amount.value = String(props.feedingSession.givenAmount)
      note.value = props.feedingSession.note ?? ''
    } else {
      note.value = ''
      amount.value = props.initialAmount ?? '0'
    }
    quickNotes.value = getQuickNotes(props.type)
    formInstanceKey.value += 1
  },
  { immediate: true },
)

const TYPE_FEEDING_LABEL: Record<'water' | 'food', string> = { water: '水', food: '飼料' }

const title = computed(() => {
  const label = props.mode === 'edit' ? '修改給的量' : '開始餵'
  return `${label}${TYPE_FEEDING_LABEL[props.type]} · ${props.catName}`
})

const amountUnit = computed(() => (props.type === 'water' ? 'ml' : 'g'))

function applyQuickNote(text: string) {
  note.value = text
}

function handleSubmit() {
  const n = parseFloat(amount.value)
  if (Number.isNaN(n) || n <= 0) return
  emit('save', { amount: n, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div v-if="mode === 'add'" class="action-toggle" role="group" aria-label="紀錄方式">
        <button type="button" class="action-toggle-option" @click="emit('switch-to-record', amount)">
          {{ type === 'water' ? '記錄喝水' : '記錄飼料' }}
        </button>
        <button type="button" class="action-toggle-option active" disabled>
          {{ type === 'water' ? '開始餵水' : '開始餵飼料' }}
        </button>
      </div>

      <div class="amount-note-row">
        <div class="field">
          <label>數量</label>
          <div class="amount-display" :class="{ placeholder: !amount }">
            {{ amount || '0' }}<span class="amount-unit"> {{ amountUnit }}</span>
          </div>
        </div>
        <div class="field">
          <label for="fStartFeedingNote">備註</label>
          <input id="fStartFeedingNote" v-model="note" type="text" />
        </div>
      </div>

      <div v-if="quickNotes.length" class="field pill-group quick-notes" :class="{ food: type === 'food' }">
        <button
          v-for="text in quickNotes"
          :key="text"
          type="button"
          class="pill"
          :class="{ active: note === text }"
          @click="applyQuickNote(text)"
        >
          {{ text }}
        </button>
      </div>

      <div class="field">
        <CalculatorPad
          :key="formInstanceKey"
          v-model="amount"
          :type="type"
          :unit="amountUnit"
          :saving="saving"
          require-positive
          @collapse="() => {}"
        />
      </div>

      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button
          type="button"
          class="btn primary"
          :class="{ food: type === 'food' }"
          :disabled="saving"
          @click="handleSubmit"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </form>
  </BaseSheet>
</template>

<style scoped>
.action-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  margin-bottom: var(--space-5);
  border-radius: var(--radius-md);
  background: var(--paper);
  box-shadow: var(--shadow-raised-active);
  gap: 4px;
}

.action-toggle-option {
  min-height: 40px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.action-toggle-option.active {
  background: var(--card);
  color: var(--ink);
  box-shadow: var(--shadow-raised);
}

.action-toggle-option:disabled {
  cursor: default;
}

.quick-notes {
  margin-top: var(--space-2);
}

.amount-note-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.amount-note-row .field {
  margin-bottom: 0;
}

.amount-display {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 1.05rem;
  padding: 12px 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--paper);
  box-shadow: var(--shadow-raised-active);
  color: var(--ink);
  text-align: right;
}

.amount-display.placeholder {
  color: var(--ink-soft);
  font-weight: 500;
}

.amount-unit {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-soft);
}
</style>
