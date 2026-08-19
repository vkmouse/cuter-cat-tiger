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
  <div id="backdrop" :class="{ show: open }" @click="emit('cancel')" />
  <div id="sheet" :class="{ show: open }" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
    <div class="handle" aria-hidden="true" />
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
#backdrop {
  position: fixed;
  inset: 0;
  background: rgba(38, 48, 42, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: 10;
}

#backdrop.show {
  opacity: 1;
  pointer-events: auto;
}

#sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 420px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -10px 30px rgba(38, 48, 42, 0.25);
  padding: 10px 22px calc(26px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 11;
}

#sheet.show {
  transform: translateY(0);
}

.handle {
  width: 40px;
  height: 4px;
  background: var(--line);
  border-radius: 4px;
  margin: 8px auto 14px;
}

#sheet h2 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  margin: 0 0 16px;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 0.78rem;
  color: var(--ink-soft);
  margin-bottom: 5px;
  font-weight: 500;
}

.field input,
.field textarea {
  width: 100%;
  font-family: var(--font-body);
  font-size: 16px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  color: var(--ink);
}

.field input:focus,
.field textarea:focus {
  outline: 2px solid var(--water);
  outline-offset: 1px;
}

/* iOS Safari 會用自己的樣式渲染 datetime-local，文字置中且內距跟其他欄位不同，
   導致跑版，這裡強制文字靠左、統一高度，讓它跟其他輸入框看起來一致 */
.field input[type='datetime-local'] {
  min-height: 40px;
  line-height: 1.3;
  text-align: left;
}

.field input[type='datetime-local']::-webkit-date-and-time-value {
  text-align: left;
  margin: 0;
}

.field input[type='datetime-local']::-webkit-datetime-edit {
  text-align: left;
  padding: 0;
}

.field textarea {
  resize: none;
  min-height: 54px;
}

.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn.ghost {
  background: var(--paper-dark);
  color: var(--ink-soft);
}

.btn.primary {
  background: var(--water);
  color: #fff;
}

.btn.primary.food {
  background: var(--food);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
