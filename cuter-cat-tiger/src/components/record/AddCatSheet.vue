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
  <div class="add-cat-backdrop" :class="{ show: open }" @click="emit('cancel')" />
  <div class="add-cat-sheet" :class="{ show: open }" role="dialog" aria-modal="true" aria-labelledby="addCatSheetTitle">
    <div class="handle" aria-hidden="true" />
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

<style scoped>
.add-cat-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(38, 48, 42, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: 10;
}

.add-cat-backdrop.show {
  opacity: 1;
  pointer-events: auto;
}

.add-cat-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 420px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -10px 30px rgba(38, 48, 42, 0.25);
  padding: 10px 22px calc(26px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 11;
}

.add-cat-sheet.show {
  transform: translateY(0);
}

.handle {
  width: 40px;
  height: 4px;
  background: var(--line);
  border-radius: 4px;
  margin: 8px auto 14px;
}

.add-cat-sheet h2 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  margin: 0 0 16px;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 0.78rem;
  color: var(--ink-soft);
  margin-bottom: 5px;
  font-weight: 500;
}

.field input {
  width: 100%;
  font-family: var(--font-body);
  font-size: 16px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  color: var(--ink);
}

.field input:focus {
  outline: 2px solid var(--water);
  outline-offset: 1px;
}

.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn.ghost {
  background: var(--paper-dark);
  color: var(--ink-soft);
}

.btn.primary {
  background: var(--water);
  color: #fff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
