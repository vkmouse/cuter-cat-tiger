<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FeedingSession } from '../../types'
import { nowDateTimeLocalValue } from '../../utils/date'
import { round1 } from '../../utils/number'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'
import CalculatorPad from './CalculatorPad.vue'
import DateTimePicker from './DateTimePicker.vue'
import AmountNoteBar from './AmountNoteBar.vue'

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
const formInstanceKey = ref(0)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen || !props.session) return
    remaining.value = '0'
    timeValue.value = nowDateTimeLocalValue()
    note.value = props.session.note ?? ''
    quickNotes.value = getQuickNotes(props.session.type)
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
      <AmountNoteBar
        :type="session.type"
        :amount="remaining"
        :unit="amountUnit"
        :note="note"
        @update:note="note = $event"
      />

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

      <CalculatorPad
        :key="formInstanceKey"
        v-model="remaining"
        :type="session.type"
        :unit="amountUnit"
        :saving="saving"
      >
        <template #datetime>
          <DateTimePicker :key="formInstanceKey" v-model="timeValue" />
        </template>
      </CalculatorPad>
      <p v-if="consumedPreview !== null" class="consumed-preview" :class="{ negative: consumedPreview < 0 }">
        {{ consumedPreview < 0 ? '剩的比給的多，等於這次沒有淨消耗' : `這次吃了／喝了約 ${consumedPreview} ${amountUnit}` }}
      </p>

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
.consumed-preview {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
  text-align: right;
}

.consumed-preview.negative {
  color: #b3452f;
}
</style>
