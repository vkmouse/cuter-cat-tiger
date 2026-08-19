// 對齊 shared-spec.md 第 4 節：對外 API 契約與前端型別一律用 camelCase。
// 這裡是唯一定義來源，後端 functions/services/*.ts 的 DTO 需與此對齊。

export type RecordType = 'water' | 'food' | 'pee' | 'poop'
export type RecordUnit = 'ml' | 'g' | ''

export interface Cat {
  id: number
  name: string
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
  // 不分日期，全部歷史裡最後一次 pee/poop 的時間；永遠是「距離現在最新一筆」，不受查詢的 date 影響。沒記錄過為 null。
  lastPeeAt: string | null
  lastPoopAt: string | null
}

// ---- API 請求 payload ----

export interface CreateCatPayload {
  name: string
}

export interface UpdateCatPayload {
  name: string
}

export interface CreateRecordPayload {
  catId: number
  type: RecordType
  // water/food 為必填；pee/poop 不量化，不需要帶這兩個欄位（帶了後端也會忽略、強制存 0 / ''）
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
