<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CatRecord } from '../../types'
import { nowDateTimeLocalValue, isoToDateTimeLocalValue } from '../../utils/date'
import { getQuickNotes } from '../../composables/useQuickNotes'
import BaseSheet from '../ui/BaseSheet.vue'
import DateTimePicker from './DateTimePicker.vue'

/**
 * 記錄尿尿/大便的單次記錄 + 編輯，從 RecordFormSheet 拆出來。
 * litter 沒有數量、不需要計算機，也沒有「開始餵」的 pill 可以切換，
 * 所以拆開後就是最單純的時間 + 備註表單。
 */

const props = defineProps<{
  open: boolean
  mode: 'add' | 'edit'
  type: 'pee' | 'poop'
  catName: string
  record?: CatRecord | null
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: { timeValue: string; note: string }]
}>()

const timeValue = ref('')
const note = ref('')
const quickNotes = ref<string[]>([])

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    if (props.mode === 'edit' && props.record) {
      timeValue.value = isoToDateTimeLocalValue(props.record.occurredAt)
      note.value = props.record.note ?? ''
    } else {
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

const TYPE_ACTION_LABEL: Record<'pee' | 'poop', string> = {
  pee: '記錄尿尿',
  poop: '記錄大便',
}
const TYPE_EDIT_LABEL: Record<'pee' | 'poop', string> = {
  pee: '修改尿尿紀錄',
  poop: '修改大便紀錄',
}

const title = computed(() => {
  const label = props.mode === 'add' ? TYPE_ACTION_LABEL[props.type] : TYPE_EDIT_LABEL[props.type]
  return `${label} · ${props.catName}`
})

function handleSubmit() {
  if (!timeValue.value) return
  emit('save', { timeValue: timeValue.value, note: note.value.trim() })
}
</script>

<template>
  <BaseSheet :open="open" :title="title" panel-class="sheet-panel--full" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label>時間</label>
        <DateTimePicker v-model="timeValue" />
      </div>

      <div class="field">
        <label for="fNote">備註</label>
        <input id="fNote" v-model="note" type="text" />
        <div v-if="quickNotes.length" class="pill-group quick-notes litter">
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
        <button type="submit" class="btn primary litter" :disabled="saving">
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </form>
  </BaseSheet>
</template>

<style scoped>
.quick-notes {
  margin-top: var(--space-2);
}
</style>
