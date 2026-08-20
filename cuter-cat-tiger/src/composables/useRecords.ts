import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createRecord, deleteRecord, fetchRecords, updateRecord } from '../services/api'
import type { CreateRecordPayload, UpdateRecordPayload } from '../types'

export function useRecords(
  catId: MaybeRefOrGetter<number | null | undefined>,
  date: MaybeRefOrGetter<string>,
) {
  const queryClient = useQueryClient()

  const recordsQuery = useQuery({
    queryKey: computed(() => ['records', toValue(catId), toValue(date)]),
    queryFn: () => fetchRecords(toValue(catId) as number, toValue(date)),
    enabled: computed(() => toValue(catId) != null),
  })

  const records = computed(() => recordsQuery.data.value ?? [])
  const loading = computed(() => recordsQuery.isPending.value)
  const error = computed(() => toErrorMessage(recordsQuery.error.value))

  // occurredAt 可能跨日變更，因此兩類快取都需一起作廢。
  function invalidateRelated() {
    queryClient.invalidateQueries({ queryKey: ['records'] })
    queryClient.invalidateQueries({ queryKey: ['dailyStats'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateRecordPayload) => createRecord(payload),
    onSuccess: invalidateRelated,
  })

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; payload: UpdateRecordPayload }) => updateRecord(vars.id, vars.payload),
    onSuccess: invalidateRelated,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(id),
    onSuccess: invalidateRelated,
  })

  async function addRecord(payload: CreateRecordPayload) {
    return createMutation.mutateAsync(payload)
  }

  async function editRecord(id: number, payload: UpdateRecordPayload) {
    return updateMutation.mutateAsync({ id, payload })
  }

  async function removeRecord(id: number) {
    return deleteMutation.mutateAsync(id)
  }

  return {
    records,
    loading,
    error,
    addRecord,
    editRecord,
    removeRecord,
    saving: computed(() => createMutation.isPending.value || updateMutation.isPending.value),
    deleting: computed(() => deleteMutation.isPending.value),
  }
}

function toErrorMessage(err: unknown): string | null {
  if (!err) return null
  return err instanceof Error ? err.message : String(err)
}
