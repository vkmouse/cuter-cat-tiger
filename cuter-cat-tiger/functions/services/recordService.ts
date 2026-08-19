import * as catRepository from '../repositories/catRepository.js'
import * as recordRepository from '../repositories/recordRepository.js'
import type { RecordRow, UpdateRecordInput } from '../repositories/recordRepository.js'
import {
  ApiError,
  isQuantifiedType,
  parseJsonBody,
  requireDateParam,
  requireFiniteNumber,
  requireIsoDateTime,
  requirePositiveInt,
  requireRecordType,
  requireUnitForType,
  optionalIsoDateTime,
} from '../utils/validation.js'
import { sqliteUtcToIso } from '../utils/datetime.js'

/** 對外 API 契約，對齊 shared-spec.md 第 4 節的 Record 型別。 */
export interface RecordDto {
  id: number
  catId: number
  type: 'water' | 'food' | 'pee' | 'poop'
  amount: number
  unit: string
  note: string | null
  occurredAt: string
  updatedAt: string | null
}

function toDto(row: RecordRow): RecordDto {
  return {
    id: row.id,
    catId: row.cat_id,
    type: row.type,
    amount: row.amount,
    unit: row.unit,
    note: row.note,
    occurredAt: row.occurred_at,
    updatedAt: row.updated_at ? sqliteUtcToIso(row.updated_at) : null,
  }
}

function requireAmount(value: unknown): number {
  const amount = requireFiniteNumber(value, 'amount')
  if (amount <= 0) {
    throw new ApiError(400, 'amount 必須大於 0')
  }
  return amount
}

export async function listRecords(
  db: D1Database,
  catIdRaw: string | null,
  dateRaw: string | null,
): Promise<RecordDto[]> {
  if (!catIdRaw) {
    throw new ApiError(400, '缺少 catId')
  }
  const catId = requirePositiveInt(catIdRaw, 'catId')
  const date = requireDateParam(dateRaw, 'date')

  const rows = await recordRepository.listRecordsByCatAndDate(db, catId, date)
  return rows.map(toDto)
}

export async function createRecord(db: D1Database, request: Request): Promise<RecordDto> {
  const body = await parseJsonBody(request)

  const catId = requirePositiveInt(body.catId, 'catId')
  const type = requireRecordType(body.type)

  // pee/poop 不量化：即使 client 手滑帶了 amount/unit 也安靜忽略，一律強制存 0 / ''。
  let amount: number
  let unit: string
  if (isQuantifiedType(type)) {
    amount = requireAmount(body.amount)
    unit = requireUnitForType(type, body.unit)
  } else {
    amount = 0
    unit = ''
  }

  const note = body.note === undefined || body.note === null ? null : String(body.note)
  const occurredAt = optionalIsoDateTime(body.occurredAt, 'occurredAt') ?? new Date().toISOString()

  const cat = await catRepository.findCatById(db, catId)
  if (!cat) {
    throw new ApiError(404, `找不到 id=${catId} 的貓咪`)
  }

  const row = await recordRepository.insertRecord(db, {
    cat_id: catId,
    type,
    amount,
    unit,
    note,
    occurred_at: occurredAt,
  })
  return toDto(row)
}

export async function updateRecord(
  db: D1Database,
  id: number,
  request: Request,
): Promise<RecordDto> {
  const body = await parseJsonBody(request)

  const existing = await recordRepository.findRecordById(db, id)
  if (!existing) {
    throw new ApiError(404, `找不到 id=${id} 的紀錄`)
  }

  const patch: UpdateRecordInput = {}

  // pee/poop 不量化：amount/unit 永遠是 0 / ''，即使 body 帶了值也安靜忽略，不寫入 patch。
  if (isQuantifiedType(existing.type)) {
    if (body.amount !== undefined) {
      patch.amount = requireAmount(body.amount)
    }
    if (body.unit !== undefined) {
      // type 不可改，unit 若要改也必須維持與既有 type 對應（water → ml, food → g）
      patch.unit = requireUnitForType(existing.type, body.unit)
    }
  }
  if (body.note !== undefined) {
    patch.note = body.note === null ? null : String(body.note)
  }
  if (body.occurredAt !== undefined) {
    patch.occurred_at = requireIsoDateTime(body.occurredAt, 'occurredAt')
  }

  const row = await recordRepository.updateRecordFields(db, id, patch)
  if (!row) {
    throw new ApiError(404, `找不到 id=${id} 的紀錄`)
  }
  return toDto(row)
}

export async function removeRecord(db: D1Database, id: number): Promise<void> {
  const deleted = await recordRepository.deleteRecord(db, id)
  if (!deleted) {
    throw new ApiError(404, `找不到 id=${id} 的紀錄`)
  }
}
