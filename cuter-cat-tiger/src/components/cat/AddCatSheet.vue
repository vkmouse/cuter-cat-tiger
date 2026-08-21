<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import BaseSheet from '../ui/BaseSheet.vue'

const props = defineProps<{
  open: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [name: string]
}>()

const name = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = ''
    nextTick(() => inputRef.value?.focus())
  },
  { immediate: true },
)

function handleSubmit() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  emit('save', trimmed)
}
</script>

<template>
  <BaseSheet :open="open" title="新增貓咪" @cancel="emit('cancel')">
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label for="fCatName">貓咪名字</label>
        <input id="fCatName" ref="inputRef" v-model="name" type="text" required />
      </div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="submit" class="btn primary" :disabled="saving || !name.trim()">
          {{ saving ? '新增中…' : '新增' }}
        </button>
      </div>
    </form>
  </BaseSheet>
</template>
