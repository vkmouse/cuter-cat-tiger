import * as catRepository from '../repositories/catRepository.js'
import * as feedingSessionRepository from '../repositories/feedingSessionRepository.js'
import type { FeedingSessionRow } from '../repositories/feedingSessionRepository.js'
import * as recordRepository from '../repositories/recordRepository.js'
import type { RecordRow } from '../repositories/recordRepository.js'
import { toDto as toRecordDto, type RecordDto } from './recordService.js'
import {
  ApiError,
  parseJsonBody,
  requireFeedingSessionType,
  requireFiniteNumber,
  requireNonNegativeNumber,
  requirePositiveInt,
  requireUnitForType,
  optionalIsoDateTime,
} from '../utils/validation.js'
import { sqliteUtcToIso } from '../utils/datetime.js'

export interface FeedingSessionDto {
  id: number
  catId: number
  type: 'water' | 'food'
  givenAmount: number
  unit: string
  note: string | null
  givenAt: string
  updatedAt: string | null
}

function toDto(row: FeedingSessionRow): FeedingSessionDto {
  return {
    id: row.id,
    catId: row.cat_id,
    type: row.type,
    givenAmount: row.given_amount,
    unit: row.unit,
    note: row.note,
    givenAt: sqliteUtcToIso(row.given_at),
    updatedAt: row.updated_at ? sqliteUtcToIso(row.updated_at) : null,
  }
}

/** 給的量沿用 records 既有規則，必須 > 0；只有 complete 算出的 consumed 才允許 0 或負數。 */
function requireGivenAmount(value: unknown): number {
  const amount = requireFiniteNumber(value, 'amount')
  if (amount <= 0) {
    throw new ApiError(400, 'amount 必須大於 0')
  }
  return amount
}

/** 不帶 catId 時回傳所有貓咪的進行中餵食，供批次開始／完成用。 */
export async function listFeedingSessions(
  db: D1Database,
  catIdRaw: string | null,
): Promise<FeedingSessionDto[]> {
  if (!catIdRaw) {
    const rows = await feedingSessionRepository.listAllFeedingSessions(db)
    return rows.map(toDto)
  }
  const catId = requirePositiveInt(catIdRaw, 'catId')

  const rows = await feedingSessionRepository.listFeedingSessionsByCatId(db, catId)
  return rows.map(toDto)
}

export async function createFeedingSession(
  db: D1Database,
  request: Request,
): Promise<FeedingSessionDto> {
  const body = await parseJsonBody(request)

  const catId = requirePositiveInt(body.catId, 'catId')
  const type = requireFeedingSessionType(body.type)
  const givenAmount = requireGivenAmount(body.amount)
  const unit = requireUnitForType(type, body.unit)
  const note = body.note === undefined || body.note === null ? null : String(body.note).trim() || null

  const cat = await catRepository.findCatById(db, catId)
  if (!cat) {
    throw new ApiError(404, `找不到 id=${catId} 的貓咪`)
  }

  const row = await feedingSessionRepository.insertFeedingSession(db, {
    cat_id: catId,
    type,
    given_amount: givenAmount,
    unit,
    note,
  })
  return toDto(row)
}

export async function updateFeedingSession(
  db: D1Database,
  id: number,
  request: Request,
): Promise<FeedingSessionDto> {
  const body = await parseJsonBody(request)

  if (body.amount === undefined) {
    throw new ApiError(400, '至少要帶 amount 欄位')
  }
  const givenAmount = requireGivenAmount(body.amount)
  const note = body.note === undefined || body.note === null ? undefined : String(body.note).trim() || null

  const row = await feedingSessionRepository.updateGivenAmount(db, id, givenAmount, note)
  if (!row) {
    throw new ApiError(404, `找不到 id=${id} 的餵食紀錄`)
  }
  return toDto(row)
}

export async function removeFeedingSession(db: D1Database, id: number): Promise<void> {
  const deleted = await feedingSessionRepository.deleteFeedingSession(db, id)
  if (!deleted) {
    throw new ApiError(404, `找不到 id=${id} 的餵食紀錄`)
  }
}

/**
 * 量測完成：用「session 記下的給量」減「這次測到的剩量」算出真正吃/喝掉多少，
 * 允許算出 0 或負數（剩的比給的多也沒關係）。
 * consumed 一律由伺服器重新計算，不信任前端算好的結果。
 * 用 db.batch() 把「刪 session」跟「寫入 records」包成同一個交易，避免中間狀態。
 */
export async function completeFeedingSession(
  db: D1Database,
  id: number,
  request: Request,
): Promise<RecordDto> {
  const body = await parseJsonBody(request)

  const session = await feedingSessionRepository.findFeedingSessionById(db, id)
  if (!session) {
    throw new ApiError(404, `找不到 id=${id} 的餵食紀錄`)
  }

  const remainingAmount = requireNonNegativeNumber(body.remainingAmount, 'remainingAmount')
  const occurredAt = optionalIsoDateTime(body.occurredAt, 'occurredAt') ?? new Date().toISOString()
  const note = body.note === undefined
    ? session.note
    : body.note === null
      ? null
      : String(body.note).trim() || null

  const amount = session.given_amount - remainingAmount

  const [, insertResult] = await db.batch<RecordRow>([
    feedingSessionRepository.buildDeleteFeedingSessionStatement(db, id),
    recordRepository.buildInsertRecordStatement(db, {
      cat_id: session.cat_id,
      type: session.type,
      amount,
      unit: session.unit,
      note,
      occurred_at: occurredAt,
    }),
  ])

  const row = insertResult.results[0]
  if (!row) {
    throw new Error('INSERT records 未回傳資料')
  }
  return toRecordDto(row)
}
