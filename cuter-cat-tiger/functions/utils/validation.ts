
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** MCP 工具回報給呼叫端的錯誤；code 讓 AI 判斷下一步，details 帶可供修正的資訊。 */
export class ToolError extends Error {
  code: string
  details?: Record<string, unknown>

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.details = details
  }
}

export interface ToolErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

/** 既有驗證函式丟的 ApiError 一律視為 INVALID_VALUE，其餘未預期的例外只回通用訊息。 */
export function toToolErrorBody(err: unknown): ToolErrorBody {
  if (err instanceof ToolError) {
    return { code: err.code, message: err.message, details: err.details }
  }
  if (err instanceof ApiError) {
    return { code: 'INVALID_VALUE', message: err.message }
  }
  console.error(err)
  return { code: 'INTERNAL_ERROR', message: '伺服器發生錯誤' }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.error(err)
  return Response.json({ error: '伺服器發生錯誤' }, { status: 500 })
}

export function withErrorHandling<Env = unknown>(
  handler: PagesFunction<Env>,
): PagesFunction<Env> {
  return async (context) => {
    try {
      return await handler(context)
    } catch (err) {
      return errorResponse(err)
    }
  }
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

export function requirePositiveNumber(value: unknown, field: string): number {
  const num = requireFiniteNumber(value, field)
  if (num <= 0) {
    throw new ApiError(400, `${field} 必須大於 0`)
  }
  return num
}

export function requireNonNegativeNumber(value: unknown, field: string): number {
  const num = requireFiniteNumber(value, field)
  if (num < 0) {
    throw new ApiError(400, `${field} 不能小於 0`)
  }
  return num
}

export function requirePositiveInt(value: unknown, field: string): number {
  const num = typeof value === 'string' ? Number(value) : value
  if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0) {
    throw new ApiError(400, `${field} 必須為正整數`)
  }
  return num
}

export function requireIntInRange(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, `${field} 必須為 ${min} 到 ${max} 的整數`)
  }
  return value
}

export function parseIdParam(raw: string | undefined, field = 'id'): number {
  if (raw === undefined) {
    throw new ApiError(400, `缺少 ${field}`)
  }
  return requirePositiveInt(raw, field)
}

export type RecordType = 'water' | 'food' | 'pee' | 'poop'
export type RecordUnit = 'ml' | 'g' | ''

/** 只有 water / food 需要數量。 */
export const QUANTIFIED_RECORD_TYPES: RecordType[] = ['water', 'food']

export function isQuantifiedType(type: RecordType): type is 'water' | 'food' {
  return type === 'water' || type === 'food'
}

export const RECORD_TYPE_UNIT: Record<RecordType, RecordUnit> = {
  water: 'ml',
  food: 'g',
  pee: '',
  poop: '',
}

export function requireRecordType(value: unknown): RecordType {
  if (value !== 'water' && value !== 'food' && value !== 'pee' && value !== 'poop') {
    throw new ApiError(400, "type 僅接受 'water'、'food'、'pee' 或 'poop'")
  }
  return value
}

/** feeding session 只有先給後測的 water/food 情境會用到，沒有 pee/poop。 */
export function requireFeedingSessionType(value: unknown): 'water' | 'food' {
  const type = requireRecordType(value)
  if (!isQuantifiedType(type)) {
    throw new ApiError(400, "type 僅接受 'water' 或 'food'")
  }
  return type
}

export function requireUnitForType(type: 'water' | 'food', unit: unknown): RecordUnit {
  const expected = RECORD_TYPE_UNIT[type]
  if (unit !== expected) {
    throw new ApiError(400, `type 為 '${type}' 時，unit 必須為 '${expected}'`)
  }
  return expected
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 日期代表 UTC+8 的日曆日。 */
export function requireDateParam(raw: string | null, field = 'date'): string {
  if (!raw || !DATE_RE.test(raw)) {
    throw new ApiError(400, `${field} 格式錯誤，需為 YYYY-MM-DD`)
  }
  return raw
}

/** 正規化為 UTC ISO 字串。 */
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
