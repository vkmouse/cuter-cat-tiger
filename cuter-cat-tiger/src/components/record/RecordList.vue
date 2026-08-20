<script setup lang="ts">
import { computed } from 'vue'
import type { CatRecord } from '../../types'
import RecordRow from './RecordRow.vue'

const props = defineProps<{
  records: CatRecord[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  edit: [record: CatRecord]
  remove: [id: number]
}>()

const sorted = computed(() =>
  [...props.records].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
)
</script>

<template>
  <div class="record-list">
    <div v-if="loading" class="empty-state">載入中…</div>
    <div v-else-if="error" class="empty-state error-state">{{ error }}</div>
    <div v-else-if="sorted.length === 0" class="empty-state">這天還沒有紀錄，點上面的按鈕新增一筆吧。</div>
    <template v-else>
      <RecordRow
        v-for="record in sorted"
        :key="record.id"
        :record="record"
        @edit="(r) => emit('edit', r)"
        @remove="(id) => emit('remove', id)"
      />
    </template>
  </div>
</template>

<style scoped>
.record-list {
  padding: 4px 0;
}

.empty-state {
  padding: 30px 20px 34px;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.88rem;
}

.error-state {
  color: #b3452f;
}
</style>
