<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    elevated?: boolean
    // scoped CSS 無法修改子元件 root，因此允許呼叫端注入 panel class。
    panelClass?: string
  }>(),
  {
    elevated: false,
    panelClass: undefined,
  },
)

const emit = defineEmits<{
  cancel: []
}>()

const titleId = useId()

const backdropClass = computed(() => ({
  'sheet-backdrop--elevated': props.elevated,
  show: props.open,
}))

const panelStateClass = computed(() => ({
  'sheet-panel--elevated': props.elevated,
  show: props.open,
}))
</script>

<template>
  <div class="sheet-backdrop" :class="backdropClass" @click="emit('cancel')" />
  <div class="sheet-panel" :class="[panelStateClass, props.panelClass]" role="dialog" aria-modal="true" :aria-labelledby="titleId">
    <div class="sheet-handle" aria-hidden="true" />
    <h2 :id="titleId">{{ title }}</h2>
    <div class="sheet-content">
      <slot />
    </div>
    <div v-if="$slots.actions" class="sheet-actions-fixed">
      <slot name="actions" />
    </div>
  </div>
</template>
