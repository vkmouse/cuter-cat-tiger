// 對齊 shared-spec.md 第 4 節：對外 API 契約與前端型別一律用 camelCase。
// 這裡是唯一定義來源，後端 functions/services/*.ts 的 DTO 需與此對齊。

export type RecordType = 'water' | 'food'
export type RecordUnit = 'ml' | 'g'

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
  unit: RecordUnit // water → ml, food → g，由後端驗證兩者對應
  note: string | null
  occurredAt: string // ISO, UTC，可補登修改
  updatedAt: string | null
}

export interface DailyStat {
  catId: number
  name: string
  waterMl: number
  foodG: number
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
  amount: number
  unit: RecordUnit
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
