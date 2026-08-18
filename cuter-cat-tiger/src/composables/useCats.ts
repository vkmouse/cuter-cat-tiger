import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createCat, deleteCat, fetchCats, updateCat } from '../services/api'

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

  const renameMutation = useMutation({
    mutationFn: (vars: { id: number; name: string }) => updateCat(vars.id, { name: vars.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCat(id),
    onSuccess: () => {
      // 刪除貓咪是 CASCADE，連同紀錄一起刪除（shared-spec.md 第3節），
      // 因此連 records / dailyStats 的快取也要一併作廢。
      queryClient.invalidateQueries({ queryKey: ['cats'] })
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['dailyStats'] })
    },
  })

  async function addCat(name: string) {
    return createMutation.mutateAsync({ name })
  }

  async function renameCat(id: number, name: string) {
    return renameMutation.mutateAsync({ id, name })
  }

  async function removeCat(id: number) {
    return deleteMutation.mutateAsync(id)
  }

  return {
    cats,
    loading,
    error,
    addCat,
    renameCat,
    removeCat,
  }
}

function toErrorMessage(err: unknown): string | null {
  if (!err) return null
  return err instanceof Error ? err.message : String(err)
}
