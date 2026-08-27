<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FeedingSession } from '../../types'
import BaseSheet from '../ui/BaseSheet.vue'
import CalculatorPad from './CalculatorPad.vue'
import { getQuickNotes } from '../../composables/useQuickNotes'

/**
 * 先給後測流程 step 1：只記下「給了多少」，建立/編輯一筆 FeedingSession。
 * 從 RecordFormSheet 拆出來（原本用內部 action state 切換），
 * 拆開後跟一般紀錄完全獨立：沒有時間、沒有 litter 分支；備註跟數量現在都收在 CalculatorPad
 * 同一塊「輸入工作區」裡，跟 RecordFeedingSheet 共用同一套視覺群組（只是沒有 #datetime slot）。
 * 量一律要求 > 0（先給後測不會有「這次給了 0」的情境）。
 *
 * 新增模式下畫面頂端仍保留跟「記錄」切換的 pill：
 * 這裡不是切內部狀態，而是 emit('switch-to-record', amount) 交給呼叫端關掉這個 sheet、
 * 換開 RecordFeedingSheet，並把目前輸入的量帶過去延續顯示。
 */

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'add' | 'edit'
    type: 'water' | 'food'
    catName: string
    feedingSession?: FeedingSession | null
    saving?: boolean
    // 從 RecordFeedingSheet 透過切換 pill 過來時，帶著對方當下輸入的量延續顯示；
    // 只在 mode === 'add' 時採用，edit 模式一律以 feedingSession 本身的量為準。
    initialAmount?: string
  }>(),
  { saving: false, feedingSession: null },
)

const emit = defineEmits<{
  cancel: []
  save: [payload: { amount: number; note: string }]
  // 帶上目前輸入的量，讓呼叫端可以原封不動延續到 RecordFeedingSheet。
  'switch-to-record': [amount: string]
}>()

const amount = ref('')
const note = ref('')
const quickNotes = ref<string[]>([])
const formInstanceKey = ref(0)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    if (props.mode === 'edit' && props.feedingSession) {
      amount.value = String(props.feedingSession.givenAmount)
      note.value = props.feedingSession.note ?? ''
    } else {
      note.value = ''
      amount.value = props.initialAmount ?? '0'
    }
    quickNotes.value = getQuickNotes(props.type)
    formInstanceKey.value += 1
  },
  { immediate: true },
)

const TYPE_FEEDING_LABEL: Record<'water' | 'food', string> = { water: '水', food: '飼料' }

const title = computed(() => {
  const label = props.mode === 'edit' ? '修改給的量' : '開始餵'
  return `${label}${TYPE_FEEDING_LABEL[props.type]} · ${props.catName}`
})

const amountUnit = computed(() => (props.type === 'water' ? 'ml' : 'g'))

function handleSubmit() {
  const n = parseFloat(amount.value)
  if (Number.isNaN(n) || n <= 0) return
  emit('save', { amount: n, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div v-if="mode === 'add'" class="action-toggle" role="group" aria-label="紀錄方式">
        <button type="button" class="action-toggle-option" @click="emit('switch-to-record', amount)">
          {{ type === 'water' ? '記錄喝水' : '記錄飼料' }}
        </button>
        <button type="button" class="action-toggle-option active" disabled>
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
        require-positive
        :quick-notes="quickNotes"
      />
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
