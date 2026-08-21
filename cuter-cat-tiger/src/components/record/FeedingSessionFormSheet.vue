<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FeedingSession } from '../../types'
import BaseSheet from '../ui/BaseSheet.vue'
import ExpandableField from '../ui/ExpandableField.vue'
import CalculatorPad from './CalculatorPad.vue'

const props = defineProps<{
  open: boolean
  mode: 'start' | 'edit'
  type: 'water' | 'food'
  catName: string
  session?: FeedingSession | null
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [amount: number]
}>()

const amount = ref('')
const calcExpanded = ref(true)
const formInstanceKey = ref(0)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    amount.value = props.mode === 'edit' && props.session ? String(props.session.givenAmount) : ''
    calcExpanded.value = true
    formInstanceKey.value += 1
  },
  { immediate: true },
)

const TYPE_LABEL: Record<'water' | 'food', string> = { water: '喝水', food: '飼料' }

const title = computed(() => {
  const action = props.mode === 'start' ? '開始餵' : '修改給的量'
  return `${action}${TYPE_LABEL[props.type]} · ${props.catName}`
})

const amountLabel = computed(() => (props.type === 'water' ? '這次給多少 (ml)' : '這次給多少 (g)'))
const amountUnit = computed(() => (props.type === 'water' ? 'ml' : 'g'))

function handleConfirm() {
  const n = parseFloat(amount.value)
  if (Number.isNaN(n) || n <= 0) return
  emit('save', n)
}
</script>

<template>
  <BaseSheet :open="open" :title="title" @cancel="emit('cancel')">
    <div class="field">
      <ExpandableField v-model:expanded="calcExpanded">
        <template #summary>
          <span class="amount-summary-label">{{ amountLabel }}</span>
          <span class="amount-summary-value">
            {{ amount || '尚未輸入' }}<span v-if="amount"> {{ amountUnit }}</span>
          </span>
        </template>
        <CalculatorPad
          :key="formInstanceKey"
          v-model="amount"
          :type="type"
          :unit="amountUnit"
          :saving="saving"
          require-positive
          @confirm="handleConfirm"
        />
      </ExpandableField>
    </div>
    <div class="sheet-actions minimal">
      <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
    </div>
  </BaseSheet>
</template>

<style scoped>
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
