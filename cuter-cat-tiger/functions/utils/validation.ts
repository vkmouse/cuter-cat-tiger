
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

export function requirePositiveInt(value: unknown, field: string): number {
  const num = typeof value === 'string' ? Number(value) : value
  if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0) {
    throw new ApiError(400, `${field} 必須為正整數`)
  }
  return num
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
