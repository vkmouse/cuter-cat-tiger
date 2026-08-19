<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CatRecord, RecordType } from '../../types'
import { nowDateTimeLocalValue, isoToDateTimeLocalValue } from '../../utils/date'

const props = defineProps<{
  open: boolean
  mode: 'add' | 'edit'
  type: RecordType
  catName: string
  record?: CatRecord | null
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: { amount: number; timeValue: string; note: string }]
}>()

const amount = ref('')
const timeValue = ref('')
const note = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    if (props.mode === 'edit' && props.record) {
      amount.value = String(props.record.amount)
      timeValue.value = isoToDateTimeLocalValue(props.record.occurredAt)
      note.value = props.record.note ?? ''
    } else {
      amount.value = ''
      timeValue.value = nowDateTimeLocalValue()
      note.value = ''
    }
  },
  { immediate: true },
)

const title = () => {
  const action = props.mode === 'add' ? (props.type === 'water' ? '記錄喝水' : '記錄飼料') : props.type === 'water' ? '修改喝水紀錄' : '修改飼料紀錄'
  return `${action} · ${props.catName}`
}

const amountLabel = () => (props.type === 'water' ? '數量 (ml)' : '數量 (g)')

function handleSubmit() {
  const n = parseFloat(amount.value)
  if (Number.isNaN(n) || n < 0) return
  if (!timeValue.value) return
  emit('save', { amount: n, timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <div class="sheet-backdrop" :class="{ show: open }" @click="emit('cancel')" />
  <div class="sheet-panel" :class="{ show: open }" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
    <div class="sheet-handle" aria-hidden="true" />
    <h2 id="sheetTitle">{{ title() }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label for="fAmount">{{ amountLabel() }}</label>
        <input id="fAmount" v-model="amount" type="number" step="0.1" min="0" required />
      </div>
      <div class="field">
        <label for="fTime">時間</label>
        <input id="fTime" v-model="timeValue" type="datetime-local" required />
      </div>
      <div class="field">
        <label for="fNote">備註</label>
        <textarea id="fNote" v-model="note" placeholder="例如：湯罐加水" />
      </div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="submit" class="btn primary" :class="{ food: type === 'food' }" :disabled="saving">
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* iOS Safari 對 datetime-local 預設套用原生外觀，這個外觀自帶一段內距，
   不受 CSS padding 或 ::-webkit-datetime-edit 影響，導致文字比其他欄位偏右。
   先關掉原生外觀，讓自訂 padding 生效，跟其他欄位對齊 */
.field input[type='datetime-local'] {
  -webkit-appearance: none;
  appearance: none;
  min-height: 40px;
  line-height: 1.3;
  text-align: left;
}

.field input[type='datetime-local']::-webkit-date-and-time-value {
  text-align: left;
  margin: 0;
  padding: 0;
}

.field input[type='datetime-local']::-webkit-datetime-edit {
  text-align: left;
  padding: 0;
  margin: 0;
}
</style>
