<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Cat, FeedingSession } from '../../types'
import { nowDateTimeLocalValue } from '../../utils/date'
import { round1 } from '../../utils/number'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'
import CalculatorPad from './CalculatorPad.vue'
import DateTimePicker from './DateTimePicker.vue'
import RecordTypeIcon from './RecordTypeIcon.vue'

/**
 * 「完成量測」的批次版本：一次列出所有貓咪目前進行中的餵食，共用一份 CalculatorPad 輸入剩餘量，
 * 完成時間也共用一份，預設「現在」套用到所有勾選的列（跟 StartFeedingSheet 批次版一樣，
 * 取消勾選只是這次跳過，不影響編輯）。
 */

interface Row {
  key: string
  session: FeedingSession
  catName: string
  remaining: string
  note: string
  checked: boolean
}

const props = withDefaults(
  defineProps<{ open: boolean; sessions: FeedingSession[]; cats: Cat[]; saving?: boolean }>(),
  { saving: false },
)

const emit = defineEmits<{
  cancel: []
  save: [
    payload: {
      items: Array<{ id: number; type: 'water' | 'food'; remainingAmount: number; note: string }>
      timeValue: string
    },
  ]
}>()

const rows = ref<Row[]>([])
const selectedKey = ref('')
const timeValue = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    rows.value = props.sessions.map((session) => ({
      key: String(session.id),
      session,
      catName: props.cats.find((c) => c.id === session.catId)?.name ?? '',
      remaining: '0',
      note: session.note ?? '',
      checked: true,
    }))
    selectedKey.value = rows.value[0]?.key ?? ''
    timeValue.value = nowDateTimeLocalValue()
  },
  { immediate: true },
)

const selectedRow = computed(() => rows.value.find((r) => r.key === selectedKey.value) ?? null)

const remaining = computed({
  get: () => selectedRow.value?.remaining ?? '0',
  set: (value: string) => {
    if (selectedRow.value) selectedRow.value.remaining = value
  },
})

const note = computed({
  get: () => selectedRow.value?.note ?? '',
  set: (value: string) => {
    if (selectedRow.value) selectedRow.value.note = value
  },
})

const quickNotes = computed(() => (selectedRow.value ? getQuickNotes(selectedRow.value.session.type) : []))
const amountUnit = computed(() => selectedRow.value?.session.unit ?? '')
const checkedCount = computed(() => rows.value.filter((r) => r.checked).length)
const canSave = computed(
  () => !!timeValue.value && rows.value.some((r) => r.checked && Number.isFinite(parseFloat(r.remaining)) && parseFloat(r.remaining) >= 0),
)

const consumedPreview = computed(() => {
  if (!selectedRow.value) return null
  const r = parseFloat(selectedRow.value.remaining)
  if (Number.isNaN(r)) return null
  return round1(selectedRow.value.session.givenAmount - r)
})

function selectRow(key: string) {
  selectedKey.value = key
}

function toggleRow(row: Row) {
  row.checked = !row.checked
}

function handleSubmit() {
  const items = rows.value
    .filter((r) => r.checked)
    .map((r) => ({ id: r.session.id, type: r.session.type, remainingAmount: parseFloat(r.remaining), note: r.note.trim() }))
    .filter((i) => Number.isFinite(i.remainingAmount) && i.remainingAmount >= 0)
  if (!items.length) return
  emit('save', { items, timeValue: timeValue.value })
}
</script>

<template>
  <BaseSheet :open="open" title="完成餵食" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <div v-if="rows.length" class="batch-row-list">
      <button
        v-for="row in rows"
        :key="row.key"
        type="button"
        class="batch-row"
        :class="[row.session.type, { selected: row.key === selectedKey, unchecked: !row.checked }]"
        @click="selectRow(row.key)"
      >
        <input
          class="batch-row-checkbox"
          type="checkbox"
          :checked="row.checked"
          aria-label="是否納入這次批次"
          @click.stop
          @change="toggleRow(row)"
        />
        <RecordTypeIcon :type="row.session.type" :size="15" />
        <span class="batch-row-label">{{ row.catName }} · {{ row.session.type === 'water' ? '水' : '飼料' }}</span>
        <span class="batch-row-amount">給 {{ round1(row.session.givenAmount) }} → 剩 {{ row.remaining || '0' }}</span>
      </button>
    </div>
    <p v-else class="batch-empty">目前沒有進行中的餵食。</p>

    <CalculatorPad
      v-if="selectedRow"
      :key="selectedKey"
      v-model="remaining"
      v-model:note="note"
      :type="selectedRow.session.type"
      :unit="amountUnit"
      :saving="saving"
      :quick-notes="quickNotes"
    >
      <template #given-amount>
        <span class="given-amount-label">給予量</span>
        <span class="given-amount-value">{{ round1(selectedRow.session.givenAmount) }} {{ amountUnit }}</span>
      </template>
      <template #datetime>
        <DateTimePicker v-model="timeValue" />
      </template>
    </CalculatorPad>
    <p v-if="consumedPreview !== null" class="consumed-preview" :class="{ negative: consumedPreview < 0 }">
      {{ consumedPreview < 0 ? '剩的比給的多，等於這次沒有淨消耗' : `這次吃了／喝了約 ${consumedPreview} ${amountUnit}` }}
    </p>

    <template #actions>
      <div v-if="rows.length" class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="button" class="btn primary" :disabled="saving || !canSave" @click="handleSubmit">
          {{ saving ? '儲存中…' : `完成（已選 ${checkedCount}）` }}
        </button>
      </div>
    </template>
  </BaseSheet>
</template>

<style scoped>
.batch-row-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.batch-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--water-soft);
  color: var(--ink);
  text-align: left;
  transition: box-shadow 0.15s ease, opacity 0.15s ease;
}

.batch-row.food {
  background: var(--food-soft);
}

.batch-row.selected {
  box-shadow: 0 0 0 2px var(--water) inset;
}

.batch-row.food.selected {
  box-shadow: 0 0 0 2px var(--food) inset;
}

.batch-row.unchecked {
  opacity: 0.5;
}

.batch-row-checkbox {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  accent-color: var(--water);
}

.batch-row.food .batch-row-checkbox {
  accent-color: var(--food);
}

.batch-row-label {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 0.86rem;
}

.batch-row-amount {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.batch-empty {
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.85rem;
  padding: 24px 0;
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
</style>
