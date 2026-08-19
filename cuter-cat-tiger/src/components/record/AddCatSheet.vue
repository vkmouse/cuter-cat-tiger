<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

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
  <div class="sheet-backdrop" :class="{ show: open }" @click="emit('cancel')" />
  <div class="sheet-panel" :class="{ show: open }" role="dialog" aria-modal="true" aria-labelledby="addCatSheetTitle">
    <div class="sheet-handle" aria-hidden="true" />
    <h2 id="addCatSheetTitle">新增貓咪</h2>
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label for="fCatName">貓咪名字</label>
        <input id="fCatName" ref="inputRef" v-model="name" type="text" placeholder="例如：小橘" required />
      </div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
        <button type="submit" class="btn primary" :disabled="saving || !name.trim()">
          {{ saving ? '新增中…' : '新增' }}
        </button>
      </div>
    </form>
  </div>
</template>
