import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchDailyStats } from '../services/api'

/**
 * 給「多貓總覽」抽屜用：直接把 /api/stats/daily?date= 回傳的全部貓咪清單原樣交出去，
 * 不像 useDailyStats 那樣篩選單一 catId。
 * queryKey 用 'all' 取代 catId，跟 useDailyStats 的 key 區隔開，避免互相覆蓋快取，
 * enabled 交由呼叫端控制（例如只在抽屜打開時才查）。
 */
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
