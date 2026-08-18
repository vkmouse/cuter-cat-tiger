import * as catRepository from '../repositories/catRepository.js'
import type { CatRow } from '../repositories/catRepository.js'
import * as recordRepository from '../repositories/recordRepository.js'
import { requireDateParam } from '../utils/validation.js'

/** 對外 API 契約，對齊 shared-spec.md 第 4 節的 DailyStat 型別。 */
export interface DailyStat {
  catId: number
  name: string
  waterMl: number
  foodG: number
}

export async function getDailyStats(db: D1Database, dateRaw: string | null): Promise<DailyStat[]> {
  const date = requireDateParam(dateRaw, 'date')

  const [cats, sums] = await Promise.all([
    catRepository.listCats(db),
    recordRepository.sumAmountsByDate(db, date),
  ])

  // catId -> { waterMl, foodG }，先建索引再套用到每隻貓咪，沒有紀錄的組合維持 0
  const totalsByCat = new Map<number, { waterMl: number; foodG: number }>()
  for (const sum of sums) {
    const entry = totalsByCat.get(sum.cat_id) ?? { waterMl: 0, foodG: 0 }
    if (sum.type === 'water') {
      entry.waterMl = sum.total
    } else {
      entry.foodG = sum.total
    }
    totalsByCat.set(sum.cat_id, entry)
  }

  return cats.map((cat: CatRow) => {
    const totals = totalsByCat.get(cat.id) ?? { waterMl: 0, foodG: 0 }
    return {
      catId: cat.id,
      name: cat.name,
      waterMl: totals.waterMl,
      foodG: totals.foodG,
    }
  })
}
