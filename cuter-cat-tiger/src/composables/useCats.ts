import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createCat, deleteCat, fetchCats, updateCat as updateCatApi } from '../services/api'
import type { UpdateCatPayload } from '../types'

export function useCats() {
  const queryClient = useQueryClient()

  const catsQuery = useQuery({
    queryKey: ['cats'],
    queryFn: fetchCats,
  })

  const cats = computed(() => catsQuery.data.value ?? [])
  const loading = computed(() => catsQuery.isPending.value)
  const error = computed(() => toErrorMessage(catsQuery.error.value))

  const createMutation = useMutation({
    mutationFn: createCat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cats'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; patch: UpdateCatPayload }) => updateCatApi(vars.id, vars.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cats'] })
      // 目標值變動會影響「今日總覽」的達標判斷，一併作廢。
      queryClient.invalidateQueries({ queryKey: ['dailyStats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCat(id),
    onSuccess: () => {
      // 刪除會連帶影響紀錄與統計，因此一起作廢相關快取。
      queryClient.invalidateQueries({ queryKey: ['cats'] })
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['dailyStats'] })
    },
  })

  async function addCat(name: string, targetWater?: number, targetFood?: number) {
    return createMutation.mutateAsync({ name, targetWater, targetFood })
  }

  async function updateCat(id: number, patch: UpdateCatPayload) {
    return updateMutation.mutateAsync({ id, patch })
  }

  async function removeCat(id: number) {
    return deleteMutation.mutateAsync(id)
  }

  return {
    cats,
    loading,
    error,
    addCat,
    updateCat,
    removeCat,
  }
}

function toErrorMessage(err: unknown): string | null {
  if (!err) return null
  return err instanceof Error ? err.message : String(err)
}
