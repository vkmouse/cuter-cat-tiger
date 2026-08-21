<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Cat } from '../../types'
import BaseSheet from '../ui/BaseSheet.vue'

const props = defineProps<{
  open: boolean
  cat: Cat | null
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: { name: string; targetWater: number; targetFood: number }]
}>()

const name = ref('')
const targetWater = ref('')
const targetFood = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// 每次開啟時用當前貓咪的資料重新填入，確保改的是最新值。
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = props.cat?.name ?? ''
    targetWater.value = props.cat ? String(props.cat.targetWater) : ''
    targetFood.value = props.cat ? String(props.cat.targetFood) : ''
    nextTick(() => inputRef.value?.focus())
  },
  { immediate: true },
)

function handleSubmit() {
  const trimmedName = name.value.trim()
  const water = parseFloat(targetWater.value)
  const food = parseFloat(targetFood.value)
  if (!trimmedName || Number.isNaN(water) || water <= 0 || Number.isNaN(food) || food <= 0) return
  emit('save', { name: trimmedName, targetWater: water, targetFood: food })
}
</script>

<template>
  <BaseSheet :open="open" title="編輯貓咪" panel-class="sheet-panel--compact" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label for="fEditCatName">貓咪名字</label>
        <input id="fEditCatName" ref="inputRef" v-model="name" type="text" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="fEditTargetWater">目標喝水量 (ml)</label>
          <input
            id="fEditTargetWater"
            v-model="targetWater"
            type="number"
            inputmode="decimal"
            step="1"
            min="1"
            required
          />
        </div>
        <div class="field">
          <label for="fEditTargetFood">目標飼料量 (g)</label>
          <input
            id="fEditTargetFood"
            v-model="targetFood"
            type="number"
            inputmode="decimal"
            step="1"
            min="1"
            required
          />
        </div>
      </div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="submit" class="btn primary" :disabled="saving || !name.trim()">
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </form>
  </BaseSheet>
</template>

<style scoped>
/* 兩個目標值欄位並排，跟單獨的貓咪名字欄位做出區隔。 */
.field-row {
  display: flex;
  gap: 10px;
}

.field-row .field {
  flex: 1;
}
</style>
