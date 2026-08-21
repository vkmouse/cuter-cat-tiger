<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CatRecord, FeedingSession, RecordType } from '../../types'
import { nowDateTimeLocalValue, isoToDateTimeLocalValue } from '../../utils/date'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'
import ExpandableField from '../ui/ExpandableField.vue'
import CalculatorPad from './CalculatorPad.vue'
import DateTimePicker from './DateTimePicker.vue'

const props = defineProps<{
  open: boolean
  mode: 'add' | 'edit'
  type: RecordType
  catName: string
  record?: CatRecord | null
  feedingSession?: FeedingSession | null
  action?: 'record' | 'feeding'
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [
    payload:
      | { action: 'record'; amount?: number; timeValue: string; note: string }
      | { action: 'feeding'; amount: number },
  ]
}>()

const amount = ref('')
const timeValue = ref('')
const note = ref('')
const action = ref<'record' | 'feeding'>('record')
const quickNotes = ref<string[]>([])
const calcExpanded = ref(false)
const formInstanceKey = ref(0)

const isLitter = (t: RecordType) => t === 'pee' || t === 'poop'
const isFeedingType = computed(() => props.type === 'water' || props.type === 'food')
const isFeedingEdit = computed(() => props.mode === 'edit' && !!props.feedingSession)
const toggleDisabled = computed(() => props.mode === 'edit')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    action.value = props.action ?? 'record'
    if (props.mode === 'edit' && props.feedingSession) {
      action.value = 'feeding'
      amount.value = String(props.feedingSession.givenAmount)
      timeValue.value = ''
      note.value = ''
      quickNotes.value = []
      calcExpanded.value = true
    } else if (props.mode === 'edit' && props.record) {
      amount.value = String(props.record.amount)
      timeValue.value = isoToDateTimeLocalValue(props.record.occurredAt)
      note.value = props.record.note ?? ''
      quickNotes.value = getQuickNotes(props.type)
      calcExpanded.value = !isLitter(props.type)
    } else {
      amount.value = ''
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

function selectAction(next: 'record' | 'feeding') {
  if (toggleDisabled.value || !isFeedingType.value) return
  action.value = next
  amount.value = ''
  calcExpanded.value = true
  if (next === 'record') {
    timeValue.value = nowDateTimeLocalValue()
    note.value = ''
    quickNotes.value = getQuickNotes(props.type)
  } else {
    quickNotes.value = []
  }
  formInstanceKey.value += 1
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
const TYPE_FEEDING_LABEL: Record<'water' | 'food', string> = {
  water: '水',
  food: '飼料',
}

const title = computed(() => {
  if (action.value === 'feeding' && isFeedingType.value) {
    const label = isFeedingEdit.value ? '修改給的量' : '開始餵'
    return `${label}${TYPE_FEEDING_LABEL[props.type as 'water' | 'food']} · ${props.catName}`
  }
  const label = props.mode === 'add' ? TYPE_ACTION_LABEL[props.type] : TYPE_EDIT_LABEL[props.type]
  return `${label} · ${props.catName}`
})

const amountLabel = computed(() => {
  if (action.value === 'feeding') {
    return props.type === 'water' ? '這次給多少 (ml)' : '這次給多少 (g)'
  }
  return props.type === 'water' ? '數量 (ml)' : '數量 (g)'
})
const amountUnit = computed(() => (props.type === 'water' ? 'ml' : 'g'))

function handleSubmit() {
  if (action.value === 'feeding') {
    const n = parseFloat(amount.value)
    if (Number.isNaN(n) || n <= 0) return
    emit('save', { action: 'feeding', amount: n })
    return
  }

  if (!timeValue.value) return
  if (isLitter(props.type)) {
    emit('save', { action: 'record', timeValue: timeValue.value, note: note.value.trim() })
    return
  }

  const n = parseFloat(amount.value)
  if (Number.isNaN(n)) return
  if (props.mode === 'add' && n <= 0) return
  emit('save', { action: 'record', amount: n, timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div v-if="isFeedingType" class="action-toggle" role="group" aria-label="紀錄方式">
        <button
          type="button"
          class="action-toggle-option"
          :class="{ active: action === 'record' }"
          :disabled="toggleDisabled"
          @click="selectAction('record')"
        >
          {{ type === 'water' ? '記錄喝水' : '記錄飼料' }}
        </button>
        <button
          type="button"
          class="action-toggle-option"
          :class="{ active: action === 'feeding' }"
          :disabled="toggleDisabled"
          @click="selectAction('feeding')"
        >
          {{ type === 'water' ? '開始餵水' : '開始餵飼料' }}
        </button>
      </div>

      <template v-if="!isLitter(type)">
        <div class="field">
          <ExpandableField v-model:expanded="calcExpanded">
            <template #summary>
              <span class="amount-summary-label">{{ amountLabel }}</span>
              <span class="amount-summary-value">
                {{ amount }}<span v-if="amount"> {{ amountUnit }}</span>
              </span>
            </template>
            <CalculatorPad
              :key="formInstanceKey"
              v-model="amount"
              :type="type === 'water' ? 'water' : 'food'"
              :unit="amountUnit"
              :saving="saving"
              :require-positive="mode === 'add' || action === 'feeding'"
            />
          </ExpandableField>
        </div>
      </template>

      <template v-if="action === 'record'">
        <div class="field">
          <label>時間</label>
          <DateTimePicker :key="formInstanceKey" v-model="timeValue" />
        </div>
        <div class="field">
          <label for="fNote">備註</label>
          <textarea id="fNote" v-model="note" />
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
      </template>

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


.amount-summary-label {
  font-size: 0.78rem;
  color: var(--ink-soft);
  display: block;
  margin-bottom: 2px;
}

.amount-summary-value {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.98rem;
}
</style>
