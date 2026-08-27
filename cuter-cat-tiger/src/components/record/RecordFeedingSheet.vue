<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CatRecord } from '../../types'
import { nowDateTimeLocalValue, isoToDateTimeLocalValue } from '../../utils/date'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'
import CalculatorPad from './CalculatorPad.vue'
import DateTimePicker from './DateTimePicker.vue'

/**
 * 記錄喝水/飼料的單次量測 + 編輯，從 RecordFormSheet 拆出來。
 * 尿尿/大便已改用 RecordLitterFormSheet，這裡不再需要 litter 分支。
 * 新增模式下保留可以切去「開始餵」的 pill，emit switch-to-feeding(amount) 把目前
 * 輸入的量帶出去，實際換開哪個 sheet 交給呼叫端決定。
 *
 * 日期、數量+備註、快速備註、鍵盤現在是同一個視覺群組，全部收在 CalculatorPad 裡
 * （日期時間透過 #datetime slot 傳入，狀態仍留在這個 Sheet 管理）。
 */

const props = defineProps<{
  open: boolean
  mode: 'add' | 'edit'
  type: 'water' | 'food'
  catName: string
  record?: CatRecord | null
  saving?: boolean
  // 從 StartFeedingSheet 透過切換 pill 過來時，帶著對方當下輸入的量延續顯示；
  // 只在 mode === 'add' 時採用，edit 模式一律以 record 本身的量為準。
  initialAmount?: string
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: { amount: number; timeValue: string; note: string }]
  // 帶上目前輸入的量，讓呼叫端可以原封不動延續到 StartFeedingSheet。
  'switch-to-feeding': [amount: string]
}>()

const amount = ref('')
const timeValue = ref('')
const note = ref('')
const quickNotes = ref<string[]>([])
const formInstanceKey = ref(0)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    if (props.mode === 'edit' && props.record) {
      amount.value = String(props.record.amount)
      timeValue.value = isoToDateTimeLocalValue(props.record.occurredAt)
      note.value = props.record.note ?? ''
    } else {
      amount.value = props.initialAmount ?? '0'
      timeValue.value = nowDateTimeLocalValue()
      note.value = ''
    }
    quickNotes.value = getQuickNotes(props.type)

    formInstanceKey.value += 1
  },
  { immediate: true },
)

const TYPE_ACTION_LABEL: Record<'water' | 'food', string> = {
  water: '記錄喝水',
  food: '記錄飼料',
}
const TYPE_EDIT_LABEL: Record<'water' | 'food', string> = {
  water: '修改喝水紀錄',
  food: '修改飼料紀錄',
}

const title = computed(() => {
  const label = props.mode === 'add' ? TYPE_ACTION_LABEL[props.type] : TYPE_EDIT_LABEL[props.type]
  return `${label} · ${props.catName}`
})

const amountUnit = computed(() => (props.type === 'water' ? 'ml' : 'g'))

function handleSubmit() {
  if (!timeValue.value) return
  const n = parseFloat(amount.value)
  if (Number.isNaN(n)) return
  if (props.mode === 'add' && n <= 0) return
  emit('save', { amount: n, timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div v-if="mode === 'add'" class="action-toggle" role="group" aria-label="紀錄方式">
        <button type="button" class="action-toggle-option active" disabled>
          {{ type === 'water' ? '記錄喝水' : '記錄飼料' }}
        </button>
        <button type="button" class="action-toggle-option" @click="emit('switch-to-feeding', amount)">
          {{ type === 'water' ? '開始餵水' : '開始餵飼料' }}
        </button>
      </div>

      <CalculatorPad
        :key="formInstanceKey"
        v-model="amount"
        v-model:note="note"
        :type="type"
        :unit="amountUnit"
        :saving="saving"
        :require-positive="mode === 'add'"
        :quick-notes="quickNotes"
      >
        <template #datetime>
          <DateTimePicker :key="formInstanceKey" v-model="timeValue" />
        </template>
      </CalculatorPad>
    </form>

    <template #actions>
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
  </BaseSheet>
</template>
