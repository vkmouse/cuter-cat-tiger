<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CatRecord, RecordType } from '../../types'
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
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: { amount?: number; timeValue: string; note: string }]
}>()

const amount = ref('')
const timeValue = ref('')
const note = ref('')
// 每次開啟時重新讀取，確保剛達到門檻的備註能立即出現。
const quickNotes = ref<string[]>([])
// 計算機一律預設收合，點一下才展開；DateTimePicker 的展開狀態是它自己內部管理的，
// 這裡改用 formInstanceKey 讓它每次開啟時整個重新掛載，藉此把內部的展開狀態一併重置。
const calcExpanded = ref(false)
const formInstanceKey = ref(0)

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
    calcExpanded.value = false
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
  const action = props.mode === 'add' ? TYPE_ACTION_LABEL[props.type] : TYPE_EDIT_LABEL[props.type]
  return `${action} · ${props.catName}`
})

const amountLabel = computed(() => (props.type === 'water' ? '數量 (ml)' : '數量 (g)'))
const amountUnit = computed(() => (props.type === 'water' ? 'ml' : 'g'))

function handleSubmit() {
  if (!timeValue.value) return
  if (isLitter(props.type)) {
    emit('save', { timeValue: timeValue.value, note: note.value.trim() })
    return
  }
  const n = parseFloat(amount.value)
  if (Number.isNaN(n)) return
  // 新增走 POST /api/records，後端規則是「amount 必須 > 0」，這裡先擋掉避免打一次無效的請求。
  // 編輯（PATCH）則不能用同一條規則：這筆紀錄如果是「先給後測」量測完成算出來的，
  // amount 本來就可能是 0 或負數，編輯時（哪怕只是想改備註）不能因此被擋下來。
  if (props.mode === 'add' && n <= 0) return
  emit('save', { amount: n, timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label>時間</label>
        <DateTimePicker :key="formInstanceKey" v-model="timeValue" />
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

      <!-- 水/飼料：用計算機鍵盤輸入數量，按「確定」兩次才會真的送出
           （第一次算出結果、第二次才是儲存），因此這裡不再另外放「儲存」按鈕。 -->
      <template v-if="!isLitter(type)">
        <div class="field">
          <ExpandableField v-model:expanded="calcExpanded">
            <template #summary>
              <span class="amount-summary-label">{{ amountLabel }}</span>
              <span class="amount-summary-value">
                {{ amount || '尚未輸入' }}<span v-if="amount"> {{ amountUnit }}</span>
              </span>
            </template>
            <CalculatorPad
              v-model="amount"
              :type="type === 'water' ? 'water' : 'food'"
              :unit="amountUnit"
              :saving="saving"
              :require-positive="mode === 'add'"
              @confirm="handleSubmit"
            />
          </ExpandableField>
        </div>
        <div class="sheet-actions minimal">
          <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
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
.quick-notes {
  margin-top: 8px;
}

/* 水/飼料表單沒有另外的「儲存」鍵（計算機的確定鍵兼任），取消鍵改成置中的次要按鈕。 */
.sheet-actions.minimal {
  justify-content: center;
}

.sheet-actions.minimal .btn {
  flex: none;
  min-width: 120px;
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
