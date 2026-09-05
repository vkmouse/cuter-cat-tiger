<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Cat } from '../../types'
import BaseSheet from '../ui/BaseSheet.vue'
import CalculatorPad from './CalculatorPad.vue'
import RecordTypeIcon from './RecordTypeIcon.vue'
import { getQuickNotes } from '../../composables/useQuickNotes'

/**
 * 「開始餵食」的批次版本：把所有貓咪 × 水/飼料攤成一份清單，共用同一份 CalculatorPad。
 * 點列切換「正在調整」的目標，量與備註都跟著那一列走；勾選只決定送出時要不要包含這一列，
 * 不影響能不能編輯（取消勾選後仍可點回來調整，方便下次重新勾選時數字還在）。
 */

interface Row {
  key: string
  catId: number
  catName: string
  type: 'water' | 'food'
  amount: string
  note: string
  checked: boolean
}

const props = withDefaults(defineProps<{ open: boolean; cats: Cat[]; saving?: boolean }>(), { saving: false })

const emit = defineEmits<{
  cancel: []
  save: [rows: Array<{ catId: number; type: 'water' | 'food'; amount: number; note: string }>]
}>()

const rows = ref<Row[]>([])
const selectedKey = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    rows.value = props.cats.flatMap((cat) =>
      (['water', 'food'] as const).map((type) => ({
        key: `${cat.id}-${type}`,
        catId: cat.id,
        catName: cat.name,
        type,
        amount: '0',
        note: '',
        checked: true,
      })),
    )
    selectedKey.value = rows.value[0]?.key ?? ''
  },
  { immediate: true },
)

const selectedRow = computed(() => rows.value.find((r) => r.key === selectedKey.value) ?? null)

const amount = computed({
  get: () => selectedRow.value?.amount ?? '0',
  set: (value: string) => {
    if (selectedRow.value) selectedRow.value.amount = value
  },
})

const note = computed({
  get: () => selectedRow.value?.note ?? '',
  set: (value: string) => {
    if (selectedRow.value) selectedRow.value.note = value
  },
})

const quickNotes = computed(() => (selectedRow.value ? getQuickNotes(selectedRow.value.type) : []))
const amountUnit = computed(() => (selectedRow.value?.type === 'water' ? 'ml' : 'g'))
const checkedCount = computed(() => rows.value.filter((r) => r.checked).length)
const canSave = computed(() => rows.value.some((r) => r.checked && parseFloat(r.amount) > 0))

function selectRow(key: string) {
  selectedKey.value = key
}

function toggleRow(row: Row) {
  row.checked = !row.checked
}

function handleSubmit() {
  const payload = rows.value
    .filter((r) => r.checked && parseFloat(r.amount) > 0)
    .map((r) => ({ catId: r.catId, type: r.type, amount: parseFloat(r.amount), note: r.note.trim() }))
  if (!payload.length) return
  emit('save', payload)
}
</script>

<template>
  <BaseSheet :open="open" title="開始餵食" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <div class="batch-row-list">
      <button
        v-for="row in rows"
        :key="row.key"
        type="button"
        class="batch-row"
        :class="[row.type, { selected: row.key === selectedKey, unchecked: !row.checked }]"
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
        <RecordTypeIcon :type="row.type" :size="15" />
        <span class="batch-row-label">{{ row.catName }} · {{ row.type === 'water' ? '水' : '飼料' }}</span>
        <span class="batch-row-amount">{{ row.amount || '0' }}{{ row.type === 'water' ? 'ml' : 'g' }}</span>
      </button>
    </div>

    <CalculatorPad
      v-if="selectedRow"
      :key="selectedKey"
      v-model="amount"
      v-model:note="note"
      :type="selectedRow.type"
      :unit="amountUnit"
      :saving="saving"
      require-positive
      :quick-notes="quickNotes"
    />

    <template #actions>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="button" class="btn primary" :disabled="saving || !canSave" @click="handleSubmit">
          {{ saving ? '儲存中…' : `開始餵食（已選 ${checkedCount}）` }}
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
  font-size: 0.86rem;
  flex-shrink: 0;
}
</style>
