/** 前後端 API 型別的唯一前端定義來源。 */

export type RecordType = 'water' | 'food' | 'pee' | 'poop'
export type RecordUnit = 'ml' | 'g' | ''

export interface Cat {
  id: number
  name: string
  // 命名故意不帶單位（不是 targetWaterMl / targetFoodG），跟後端 catService 的 DTO 對齊。
  targetWater: number
  targetFood: number
  createdAt: string // ISO, UTC
}

export interface CatRecord {
  id: number
  catId: number
  type: RecordType
  amount: number
  unit: RecordUnit // water → ml, food → g；pee/poop 不量化，固定為 0 / ''
  note: string | null
  occurredAt: string // ISO, UTC，可補登修改
  updatedAt: string | null
}

export interface DailyStat {
  catId: number
  name: string
  waterMl: number
  foodG: number
  peeCount: number
  poopCount: number
  // 不受查詢日期影響，代表全部歷史中的最新時間。
  lastPeeAt: string | null
  lastPoopAt: string | null
  targetWater: number
  targetFood: number
}


export interface CreateCatPayload {
  name: string
  targetWater?: number
  targetFood?: number
}

export interface UpdateCatPayload {
  // PATCH 語意：至少要帶一個欄位，因此三個都是可選。
  name?: string
  targetWater?: number
  targetFood?: number
}

export interface CreateRecordPayload {
  catId: number
  type: RecordType
  amount?: number
  unit?: RecordUnit
  note?: string | null
  occurredAt?: string
}

export interface UpdateRecordPayload {
  amount?: number
  occurredAt?: string
  note?: string | null
}

export interface ApiErrorBody {
  error: string
}

/** 先給後測：給水/飼料時先記下給了多少，等一段時間量出剩多少後才轉成一筆 CatRecord。 */
export interface FeedingSession {
  id: number
  catId: number
  type: 'water' | 'food'
  givenAmount: number
  unit: RecordUnit
  givenAt: string // ISO, UTC
  updatedAt: string | null
}

export interface CreateFeedingSessionPayload {
  catId: number
  type: 'water' | 'food'
  amount: number
  unit: RecordUnit
}

export interface UpdateFeedingSessionPayload {
  amount: number
}

export interface CompleteFeedingSessionPayload {
  // 送「剩下多少」而不是前端自己算好的「吃了多少」，consumed 一律由伺服器用 given_amount 重新算出，
  // 避免前端算錯或被竄改。
  remainingAmount: number
  occurredAt?: string
  note?: string | null
}
