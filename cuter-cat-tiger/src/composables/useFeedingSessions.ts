import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  cancelFeedingSession,
  completeFeedingSession,
  createFeedingSession,
  fetchFeedingSessions,
  updateFeedingSession,
} from '../services/api'
import type {
  CompleteFeedingSessionPayload,
  CreateFeedingSessionPayload,
  UpdateFeedingSessionPayload,
} from '../types'

export function useFeedingSessions(catId: MaybeRefOrGetter<number | null | undefined>) {
  const queryClient = useQueryClient()

  const sessionsQuery = useQuery({
    queryKey: computed(() => ['feedingSessions', toValue(catId)]),
    queryFn: () => fetchFeedingSessions(toValue(catId) as number),
    enabled: computed(() => toValue(catId) != null),
  })

  const sessions = computed(() => sessionsQuery.data.value ?? [])
  const loading = computed(() => sessionsQuery.isPending.value)
  const error = computed(() => toErrorMessage(sessionsQuery.error.value))

  function invalidateSessions() {
    queryClient.invalidateQueries({ queryKey: ['feedingSessions'] })
  }

  // 完成量測會轉成一筆 records，records / dailyStats 的快取也要一併作廢，
  // 跟 useRecords 裡 addRecord 之後的 invalidate 範圍一致。
  function invalidateAfterComplete() {
    invalidateSessions()
    queryClient.invalidateQueries({ queryKey: ['records'] })
    queryClient.invalidateQueries({ queryKey: ['dailyStats'] })
  }

  const startMutation = useMutation({
    mutationFn: (payload: CreateFeedingSessionPayload) => createFeedingSession(payload),
    onSuccess: invalidateSessions,
  })

  const editMutation = useMutation({
    mutationFn: (vars: { id: number; payload: UpdateFeedingSessionPayload }) =>
      updateFeedingSession(vars.id, vars.payload),
    onSuccess: invalidateSessions,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelFeedingSession(id),
    onSuccess: invalidateSessions,
  })

  const completeMutation = useMutation({
    mutationFn: (vars: { id: number; payload: CompleteFeedingSessionPayload }) =>
      completeFeedingSession(vars.id, vars.payload),
    onSuccess: invalidateAfterComplete,
  })

  async function startSession(payload: CreateFeedingSessionPayload) {
    return startMutation.mutateAsync(payload)
  }

  async function editSession(id: number, payload: UpdateFeedingSessionPayload) {
    return editMutation.mutateAsync({ id, payload })
  }

  async function cancelSession(id: number) {
    return cancelMutation.mutateAsync(id)
  }

  async function completeSession(id: number, payload: CompleteFeedingSessionPayload) {
    return completeMutation.mutateAsync({ id, payload })
  }

  return {
    sessions,
    loading,
    error,
    startSession,
    editSession,
    cancelSession,
    completeSession,
    starting: computed(() => startMutation.isPending.value || editMutation.isPending.value),
    cancelling: computed(() => cancelMutation.isPending.value),
    completing: computed(() => completeMutation.isPending.value),
  }
}

function toErrorMessage(err: unknown): string | null {
  if (!err) return null
  return err instanceof Error ? err.message : String(err)
}
