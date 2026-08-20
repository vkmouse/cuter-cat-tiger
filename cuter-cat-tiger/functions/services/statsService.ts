import * as catRepository from '../repositories/catRepository.js'
import type { CatRow } from '../repositories/catRepository.js'
import * as recordRepository from '../repositories/recordRepository.js'
import { requireDateParam } from '../utils/validation.js'

export interface DailyStat {
  catId: number
  name: string
  waterMl: number
  foodG: number
  peeCount: number
  poopCount: number
  /** 最新一筆 pee/poop，不受查詢日期影響。 */
  lastPeeAt: string | null
  lastPoopAt: string | null
  // 讓「今日總覽」可以直接判斷有沒有達標，不用另外打一次 /api/cats。
  targetWater: number
  targetFood: number
}

interface DailyTotals {
  waterMl: number
  foodG: number
  peeCount: number
  poopCount: number
}

export async function getDailyStats(db: D1Database, dateRaw: string | null): Promise<DailyStat[]> {
  const date = requireDateParam(dateRaw, 'date')

  const [cats, sums, lastLitter] = await Promise.all([
    catRepository.listCats(db),
    recordRepository.sumAmountsByDate(db, date),
    recordRepository.findLastLitterOccurredAt(db),
  ])

  const totalsByCat = new Map<number, DailyTotals>()
  for (const sum of sums) {
    const entry = totalsByCat.get(sum.cat_id) ?? { waterMl: 0, foodG: 0, peeCount: 0, poopCount: 0 }
    if (sum.type === 'water') {
      entry.waterMl = sum.total
    } else if (sum.type === 'food') {
      entry.foodG = sum.total
    } else if (sum.type === 'pee') {
      entry.peeCount = sum.count
    } else {
      entry.poopCount = sum.count
    }
    totalsByCat.set(sum.cat_id, entry)
  }

  const lastByCat = new Map<number, { lastPeeAt: string | null; lastPoopAt: string | null }>()
  for (const row of lastLitter) {
    const entry = lastByCat.get(row.cat_id) ?? { lastPeeAt: null, lastPoopAt: null }
    if (row.type === 'pee') {
      entry.lastPeeAt = row.last_occurred_at
    } else {
      entry.lastPoopAt = row.last_occurred_at
    }
    lastByCat.set(row.cat_id, entry)
  }

  return cats.map((cat: CatRow) => {
    const totals = totalsByCat.get(cat.id) ?? { waterMl: 0, foodG: 0, peeCount: 0, poopCount: 0 }
    const last = lastByCat.get(cat.id) ?? { lastPeeAt: null, lastPoopAt: null }
    return {
      catId: cat.id,
      name: cat.name,
      waterMl: totals.waterMl,
      foodG: totals.foodG,
      peeCount: totals.peeCount,
      poopCount: totals.poopCount,
      lastPeeAt: last.lastPeeAt,
      lastPoopAt: last.lastPoopAt,
      targetWater: cat.target_water,
      targetFood: cat.target_food,
    }
  })
}
