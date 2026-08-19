<script setup lang="ts">
// 抽出 4 個 Sheet（AddCatSheet / ConfirmSheet / OverviewSheet / RecordFormSheet）
// 共用的 backdrop + panel + handle + dialog 標籤結構。
// 樣式本身（.sheet-backdrop / .sheet-panel / .sheet-handle 等）已經是 base.css 的全域共用 class，
// 這裡只是把「重複寫 4 次」的標籤與 aria 屬性收斂成一個元件。
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    elevated?: boolean
    // 個別 Sheet 若需要調整 panel 本身的樣式（例如 OverviewSheet 的 max-height/捲動），
    // scoped CSS 碰不到子元件的 root 節點，因此開放傳入專屬 class 名稱讓呼叫端用非 scoped
    // style 處理，取代整段重複的 backdrop/panel 標籤。
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
    <slot />
  </div>
</template>
