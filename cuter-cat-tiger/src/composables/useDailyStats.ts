import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchDailyStats } from '../services/api'

export function useDailyStats(
  catId: MaybeRefOrGetter<number | null | undefined>,
  date: MaybeRefOrGetter<string>,
) {
  const statsQuery = useQuery({
    queryKey: computed(() => ['dailyStats', toValue(catId), toValue(date)]),
    queryFn: () => fetchDailyStats(toValue(date)),
    enabled: computed(() => toValue(catId) != null),
  })

  const stat = computed(() => {
    const cid = toValue(catId)
    const list = statsQuery.data.value
    if (cid == null || !list) return null
    return list.find((s) => s.catId === cid) ?? null
  })

  const waterMl = computed(() => stat.value?.waterMl ?? 0)
  const foodG = computed(() => stat.value?.foodG ?? 0)
  const peeCount = computed(() => stat.value?.peeCount ?? 0)
  const poopCount = computed(() => stat.value?.poopCount ?? 0)
  const loading = computed(() => statsQuery.isPending.value)
  const error = computed(() => toErrorMessage(statsQuery.error.value))

  return {
    stat,
    waterMl,
    foodG,
    peeCount,
    poopCount,
    loading,
    error,
  }
}

function toErrorMessage(err: unknown): string | null {
  if (!err) return null
  return err instanceof Error ? err.message : String(err)
}
