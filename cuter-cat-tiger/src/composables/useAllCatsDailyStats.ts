import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchDailyStats } from '../services/api'

export function useAllCatsDailyStats(
  date: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const statsQuery = useQuery({
    queryKey: computed(() => ['dailyStats', 'all', toValue(date)]),
    queryFn: () => fetchDailyStats(toValue(date)),
    enabled: computed(() => toValue(enabled)),
  })

  const stats = computed(() => statsQuery.data.value ?? [])
  const loading = computed(() => statsQuery.isPending.value)
  const error = computed(() => toErrorMessage(statsQuery.error.value))

  return { stats, loading, error }
}

function toErrorMessage(err: unknown): string | null {
  if (!err) return null
  return err instanceof Error ? err.message : String(err)
}
