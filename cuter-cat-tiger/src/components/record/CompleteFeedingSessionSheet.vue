<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FeedingSession } from '../../types'
import { nowDateTimeLocalValue } from '../../utils/date'
import { round1 } from '../../utils/number'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'
import ExpandableField from '../ui/ExpandableField.vue'
import CalculatorPad from './CalculatorPad.vue'
import DateTimePicker from './DateTimePicker.vue'

const props = defineProps<{
  open: boolean
  catName: string
  session: FeedingSession | null
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: { remainingAmount: number; timeValue: string; note: string }]
}>()

const remaining = ref('')
const timeValue = ref('')
const note = ref('')
const quickNotes = ref<string[]>([])
const calcExpanded = ref(true)
const formInstanceKey = ref(0)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen || !props.session) return
    remaining.value = ''
    timeValue.value = nowDateTimeLocalValue()
    note.value = ''
    quickNotes.value = getQuickNotes(props.session.type)
    calcExpanded.value = true
    formInstanceKey.value += 1
  },
  { immediate: true },
)

function applyQuickNote(text: string) {
  note.value = text
}

const TYPE_LABEL: Record<'water' | 'food', string> = { water: '喝水', food: '飼料' }

const title = computed(() => `完成量測 · ${props.catName}${props.session ? ` ${TYPE_LABEL[props.session.type]}` : ''}`)
const amountUnit = computed(() => props.session?.unit ?? '')
const givenAmount = computed(() => props.session?.givenAmount ?? 0)

// 純預覽用，實際存進資料庫的 consumed 一律由伺服器用 given_amount 重新計算，不信任這裡算出的值。
const canSave = computed(() => {
  const r = parseFloat(remaining.value)
  return Number.isFinite(r) && r >= 0 && !!timeValue.value
})

const consumedPreview = computed(() => {
  const r = parseFloat(remaining.value)
  if (Number.isNaN(r)) return null
  return round1(givenAmount.value - r)
})

function handleConfirm() {
  const r = parseFloat(remaining.value)
  if (Number.isNaN(r) || r < 0) return
  emit('save', { remainingAmount: r, timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <template v-if="session">
      <p class="given-context">這次給了 {{ round1(session.givenAmount) }} {{ session.unit }}</p>

      <div class="field">
        <label>量測時間</label>
        <DateTimePicker :key="formInstanceKey" v-model="timeValue" />
      </div>

      <div class="field">
        <label for="fRemainingNote">備註</label>
        <input id="fRemainingNote" v-model="note" type="text" />
        <div v-if="quickNotes.length" class="pill-group quick-notes" :class="{ food: session.type === 'food' }">
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

      <div class="field">
        <ExpandableField v-model:expanded="calcExpanded">
          <template #summary>
            <span class="amount-summary-label">剩下多少 ({{ amountUnit }})</span>
            <span class="amount-summary-value">
              {{ remaining }}<span v-if="remaining"> {{ amountUnit }}</span>
            </span>
          </template>
          <CalculatorPad
            :key="formInstanceKey"
            v-model="remaining"
            :type="session.type"
            :unit="amountUnit"
            :saving="saving"
            @collapse="calcExpanded = false"
          />
        </ExpandableField>
        <p v-if="consumedPreview !== null" class="consumed-preview" :class="{ negative: consumedPreview < 0 }">
          {{ consumedPreview < 0 ? '剩的比給的多，等於這次沒有淨消耗' : `這次吃了／喝了約 ${consumedPreview} ${amountUnit}` }}
        </p>
      </div>

      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button
          type="button"
          class="btn primary"
          :class="{ food: session.type === 'food' }"
          :disabled="saving || !canSave"
          @click="handleConfirm"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </template>
  </BaseSheet>
</template>

<style scoped>
.given-context {
  margin: -4px 0 14px;
  font-size: 0.84rem;
  color: var(--ink-soft);
}

.quick-notes {
  margin-top: 8px;
}

.consumed-preview {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
  text-align: right;
}

.consumed-preview.negative {
  color: #b3452f;
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
