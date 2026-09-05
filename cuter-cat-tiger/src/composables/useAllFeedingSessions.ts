import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { completeFeedingSession, createFeedingSession, fetchFeedingSessions } from '../services/api'
import type { CompleteFeedingSessionPayload, CreateFeedingSessionPayload } from '../types'

/**
 * 批次操作用：不綁定單一貓咪，一次取得所有貓咪目前進行中的餵食。
 * 跟 useFeedingSessions 共用 ['feedingSessions'] 前綴，任一邊的 mutation 都會讓彼此的快取一併作廢。
 */
export function useAllFeedingSessions() {
  const queryClient = useQueryClient()

  const sessionsQuery = useQuery({
    queryKey: ['feedingSessions', 'all'],
    queryFn: () => fetchFeedingSessions(),
  })

  const sessions = computed(() => sessionsQuery.data.value ?? [])
  const loading = computed(() => sessionsQuery.isPending.value)

  function invalidateSessions() {
    queryClient.invalidateQueries({ queryKey: ['feedingSessions'] })
  }

  const startBatchMutation = useMutation({
    mutationFn: (payloads: CreateFeedingSessionPayload[]) => Promise.all(payloads.map(createFeedingSession)),
    onSuccess: invalidateSessions,
  })

  const completeBatchMutation = useMutation({
    mutationFn: (items: Array<{ id: number; payload: CompleteFeedingSessionPayload }>) =>
      Promise.all(items.map((item) => completeFeedingSession(item.id, item.payload))),
    onSuccess: () => {
      invalidateSessions()
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['dailyStats'] })
    },
  })

  async function startBatch(payloads: CreateFeedingSessionPayload[]) {
    return startBatchMutation.mutateAsync(payloads)
  }

  async function completeBatch(items: Array<{ id: number; payload: CompleteFeedingSessionPayload }>) {
    return completeBatchMutation.mutateAsync(items)
  }

  return {
    sessions,
    loading,
    startBatch,
    completeBatch,
    starting: computed(() => startBatchMutation.isPending.value),
    completing: computed(() => completeBatchMutation.isPending.value),
  }
}
