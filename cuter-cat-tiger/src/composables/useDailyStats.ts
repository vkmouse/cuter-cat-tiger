import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchDailyStats } from '../services/api'

/**
 * queryKey: ['dailyStats', catId, date]（frontend-spec.md 第4節）
 * 後端 /api/stats/daily?date= 一次回傳「所有貓咪」當日統計（backend-spec.md 第4.3節），
 * 這裡實際打 API 時只帶 date，回來後在前端依 catId 取出該貓咪那一筆。
 */
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
