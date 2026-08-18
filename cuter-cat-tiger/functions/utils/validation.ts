/**
 * 共用欄位驗證與錯誤處理。
 * api/*.ts 統一 catch ApiError 並轉成 { error: string } + 對應狀態碼。
 */

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.error(err)
  return Response.json({ error: '伺服器發生錯誤' }, { status: 500 })
}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, `${field} 為必填字串`)
  }
  return value
}

export function requireFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(400, `${field} 必須為數字`)
  }
  return value
}

export function requirePositiveInt(value: unknown, field: string): number {
  const num = typeof value === 'string' ? Number(value) : value
  if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0) {
    throw new ApiError(400, `${field} 必須為正整數`)
  }
  return num
}

/** 解析路由參數（例如 :id），格式錯誤視為 400。 */
export function parseIdParam(raw: string | undefined, field = 'id'): number {
  if (raw === undefined) {
    throw new ApiError(400, `缺少 ${field}`)
  }
  return requirePositiveInt(raw, field)
}

export type RecordType = 'water' | 'food'
export type RecordUnit = 'ml' | 'g'

export const RECORD_TYPE_UNIT: Record<RecordType, RecordUnit> = {
  water: 'ml',
  food: 'g',
}

export function requireRecordType(value: unknown): RecordType {
  if (value !== 'water' && value !== 'food') {
    throw new ApiError(400, "type 僅接受 'water' 或 'food'")
  }
  return value
}

/** 驗證 unit 是否與 type 對應。 */
export function requireUnitForType(type: RecordType, unit: unknown): RecordUnit {
  const expected = RECORD_TYPE_UNIT[type]
  if (unit !== expected) {
    throw new ApiError(400, `type 為 '${type}' 時，unit 必須為 '${expected}'`)
  }
  return expected
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 驗證 YYYY-MM-DD 格式的日期字串（代表 UTC+8 當天）。 */
export function requireDateParam(raw: string | null, field = 'date'): string {
  if (!raw || !DATE_RE.test(raw)) {
    throw new ApiError(400, `${field} 格式錯誤，需為 YYYY-MM-DD`)
  }
  return raw
}

/** 驗證並正規化 ISO 時間字串，回傳 UTC ISO 字串。 */
export function requireIsoDateTime(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, `${field} 必須為 ISO 時間字串`)
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${field} 不是合法的時間字串`)
  }
  return parsed.toISOString()
}

/** 與 requireIsoDateTime 相同，但允許省略（回傳 undefined）。 */
export function optionalIsoDateTime(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  return requireIsoDateTime(value, field)
}

export async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('not an object')
    }
    return body as Record<string, unknown>
  } catch {
    throw new ApiError(400, '請求 body 必須為合法 JSON 物件')
  }
}
