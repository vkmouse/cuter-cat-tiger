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
  /** 當日（date 參數指定那天）的如廁次數。 */
  peeCount: number
  poopCount: number
  /**
   * 最後一次 pee/poop 的時間，「不分日期」，即使 date 參數翻到別天，這兩個欄位仍然是
   * 距離現在最新的一筆（沒記錄過則為 null）。跟其他欄位的「當日」語意不同，使用端要注意。
   */
  lastPeeAt: string | null
  lastPoopAt: string | null
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

  // catId -> 當日各項總量／次數，先建索引再套用到每隻貓咪，沒有紀錄的組合維持 0
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

  // catId -> 不分日期的最後一次 pee/poop 時間
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
    }
  })
}
