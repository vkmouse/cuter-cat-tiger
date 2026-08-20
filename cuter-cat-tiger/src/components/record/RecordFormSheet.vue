<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CatRecord, RecordType } from '../../types'
import { nowDateTimeLocalValue, isoToDateTimeLocalValue } from '../../utils/date'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'

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
  save: [payload: { amount?: number; timeValue: string; note: string }]
}>()

const amount = ref('')
const timeValue = ref('')
const note = ref('')
// 快速備註 tag：每次開啟表單時，依當前 type 從 localStorage 重新讀取一次，
// 確保剛剛用過、次數剛好累積到門檻的文字也能即時出現。
const quickNotes = ref<string[]>([])

// pee/poop 不量化，表單不需要「數量」欄位（litter-record-spec.md 第4節）
const isLitter = (t: RecordType) => t === 'pee' || t === 'poop'

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
    quickNotes.value = getQuickNotes(props.type)
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
  const action = props.mode === 'add' ? TYPE_ACTION_LABEL[props.type] : TYPE_EDIT_LABEL[props.type]
  return `${action} · ${props.catName}`
})

const amountLabel = computed(() => (props.type === 'water' ? '數量 (ml)' : '數量 (g)'))

function handleSubmit() {
  if (!timeValue.value) return
  if (isLitter(props.type)) {
    emit('save', { timeValue: timeValue.value, note: note.value.trim() })
    return
  }
  const n = parseFloat(amount.value)
  if (Number.isNaN(n) || n < 0) return
  emit('save', { amount: n, timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div v-if="!isLitter(type)" class="field">
        <label for="fAmount">{{ amountLabel }}</label>
        <input id="fAmount" v-model="amount" type="number" inputmode="decimal" step="0.1" min="0" required />
      </div>
      <div class="field">
        <label for="fTime">時間</label>
        <input id="fTime" v-model="timeValue" type="datetime-local" required />
      </div>
      <div class="field">
        <label for="fNote">備註</label>
        <textarea id="fNote" v-model="note" placeholder="例如：湯罐加水" />
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
      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="submit" class="btn primary" :class="{ food: type === 'food', litter: isLitter(type) }" :disabled="saving">
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </form>
  </BaseSheet>
</template>

<style scoped>
/* 藥丸樣式本身已經抽到 base.css 的共用 .pill / .pill-group（跟 .btn 系列同一層級）。
   這裡只保留「備註欄位下方要留一點間距」這個屬於本元件排版脈絡的細節。 */
.quick-notes {
  margin-top: 8px;
}

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
