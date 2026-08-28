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

/** 匯出供 feedingSessionService 在 complete 時把 batch 回傳的新 record row 轉成 DTO。 */
export function toDto(row: RecordRow): RecordDto {
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

  // pee/poop 沒有數量概念，固定以 0 / '' 儲存。
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

  if (isQuantifiedType(existing.type)) {
    // 不沿用 createRecord 的「必須 > 0」：feeding session 完成量測算出的 amount
    // 可能是 0 或負數，若編輯時也套用該規則，這類紀錄會永遠存不進去。
    if (body.amount !== undefined) {
      patch.amount = requireFiniteNumber(body.amount, 'amount')
    }
    if (body.unit !== undefined) {
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
