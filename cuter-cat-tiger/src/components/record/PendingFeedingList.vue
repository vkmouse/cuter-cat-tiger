<script setup lang="ts">
import type { FeedingSession } from '../../types'
import FeedingSessionRow from './FeedingSessionRow.vue'

defineProps<{
  sessions: FeedingSession[]
}>()

const emit = defineEmits<{
  complete: [session: FeedingSession]
  edit: [session: FeedingSession]
  cancel: [session: FeedingSession]
}>()
</script>

<template>
  <div v-if="sessions.length" class="pending-feeding-list">
    <div class="pending-feeding-heading">進行中的餵食</div>
    <FeedingSessionRow
      v-for="session in sessions"
      :key="session.id"
      :session="session"
      @complete="(s) => emit('complete', s)"
      @edit="(s) => emit('edit', s)"
      @cancel="(s) => emit('cancel', s)"
    />
  </div>
</template>

<style scoped>
.pending-feeding-list {
  border-bottom: 1px solid var(--line);
}

.pending-feeding-heading {
  padding: 10px 18px 4px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink-soft);
}
</style>
