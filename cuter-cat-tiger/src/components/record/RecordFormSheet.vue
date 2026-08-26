<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CatRecord, RecordType } from '../../types'
import { nowDateTimeLocalValue, isoToDateTimeLocalValue } from '../../utils/date'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'
import ExpandableField from '../ui/ExpandableField.vue'
import CalculatorPad from './CalculatorPad.vue'
import DateTimePicker from './DateTimePicker.vue'

/**
 * 一般紀錄表單：喝水/飼料/尿尿/大便的單次記錄 + 編輯。
 * 「開始餵食」（先給後測）已拆到 StartFeedingSheet，這裡不再處理 feedingSession，
 * 也不再需要 action 這個維度——payload 形狀單純只有一種。
 * 新增模式下 water/food 類型仍保留可以切去「開始餵」的 pill，
 * 這裡 emit switch-to-feeding(amount)，把目前輸入的量帶出去，實際換開哪個 sheet、
 * 要不要延續這個量交給呼叫端決定。
 */

const props = defineProps<{
  open: boolean
  mode: 'add' | 'edit'
  type: RecordType
  catName: string
  record?: CatRecord | null
  saving?: boolean
  // 從 StartFeedingSheet 透過切換 pill 過來時，帶著對方當下輸入的量延續顯示；
  // 只在 mode === 'add' 時採用，edit 模式一律以 record 本身的量為準。
  initialAmount?: string
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: { amount?: number; timeValue: string; note: string }]
  // 帶上目前輸入的量，讓呼叫端可以原封不動延續到 StartFeedingSheet。
  'switch-to-feeding': [amount: string]
}>()

const amount = ref('')
const timeValue = ref('')
const note = ref('')
const quickNotes = ref<string[]>([])
const calcExpanded = ref(false)
const formInstanceKey = ref(0)

const isLitter = (t: RecordType) => t === 'pee' || t === 'poop'
const isFeedingType = computed(() => props.type === 'water' || props.type === 'food')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    if (props.mode === 'edit' && props.record) {
      amount.value = String(props.record.amount)
      timeValue.value = isoToDateTimeLocalValue(props.record.occurredAt)
      note.value = props.record.note ?? ''
      quickNotes.value = getQuickNotes(props.type)
      calcExpanded.value = !isLitter(props.type)
    } else {
      amount.value = props.initialAmount ?? ''
      timeValue.value = nowDateTimeLocalValue()
      note.value = ''
      quickNotes.value = getQuickNotes(props.type)
      calcExpanded.value = isFeedingType.value
    }

    formInstanceKey.value += 1
  },
  { immediate: true },
)

function applyQuickNote(text: string) {
  note.value = text
}

const TYPE_ACTION_LABEL: Record<RecordType, string> = {
  water: '記錄喝水',
  food: '記錄飼料',
  pee: '記錄尿尿',
  poop: '記錄大便',
}
const TYPE_EDIT_LABEL: Record<RecordType, string> = {
  water: '修改喝水紀錄',
  food: '修改飼料紀錄',
  pee: '修改尿尿紀錄',
  poop: '修改大便紀錄',
}

const title = computed(() => {
  const label = props.mode === 'add' ? TYPE_ACTION_LABEL[props.type] : TYPE_EDIT_LABEL[props.type]
  return `${label} · ${props.catName}`
})

const amountUnit = computed(() => (props.type === 'water' ? 'ml' : 'g'))

function handleSubmit() {
  if (!timeValue.value) return
  if (isLitter(props.type)) {
    emit('save', { timeValue: timeValue.value, note: note.value.trim() })
    return
  }

  const n = parseFloat(amount.value)
  if (Number.isNaN(n)) return
  if (props.mode === 'add' && n <= 0) return
  emit('save', { amount: n, timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div v-if="mode === 'add' && isFeedingType" class="action-toggle" role="group" aria-label="紀錄方式">
        <button type="button" class="action-toggle-option active" disabled>
          {{ type === 'water' ? '記錄喝水' : '記錄飼料' }}
        </button>
        <button type="button" class="action-toggle-option" @click="emit('switch-to-feeding', amount)">
          {{ type === 'water' ? '開始餵水' : '開始餵飼料' }}
        </button>
      </div>

      <template v-if="!isLitter(type)">
        <div class="field">
          <ExpandableField v-model:expanded="calcExpanded">
            <template #summary>
              <span class="amount-summary-value" :class="{ placeholder: !amount }">
                {{ amount || amountUnit }}<span v-if="amount"> {{ amountUnit }}</span>
              </span>
            </template>
            <CalculatorPad
              :key="formInstanceKey"
              v-model="amount"
              :type="type === 'water' ? 'water' : 'food'"
              :unit="amountUnit"
              :saving="saving"
              :require-positive="mode === 'add'"
              @collapse="calcExpanded = false"
            />
          </ExpandableField>
        </div>
      </template>

      <div class="field">
        <label>時間</label>
        <DateTimePicker :key="formInstanceKey" v-model="timeValue" />
      </div>
      <div class="field">
        <label for="fNote">備註</label>
        <input id="fNote" v-model="note" type="text" />
        <div
          v-if="quickNotes.length"
          class="pill-group quick-notes"
          :class="{ food: type === 'food', litter: isLitter(type) }"
        >
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
      </div>

      <template v-if="!isLitter(type)">
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
      </template>

      <div v-else class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="submit" class="btn primary litter" :disabled="saving">
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
  margin-bottom: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  gap: 4px;
}

.action-toggle-option {
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.action-toggle-option.active {
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
}

.action-toggle-option:disabled {
  cursor: default;
}

.quick-notes {
  margin-top: 8px;
}


.amount-summary-value {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.98rem;
}

.amount-summary-value.placeholder {
  color: var(--ink-soft);
  font-weight: 500;
}
</style>
