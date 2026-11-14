/**
 * MCP 的 mutate 工具（寫入）：一次接收多個動作（start / complete / record / update / delete），
 * 依序執行，每個動作各自回報成敗（部分成功，不做整批 rollback）。
 * 時間欄位（at、minutesAgo）一律視為台灣時間，寫進資料庫前轉成 UTC。
 */
import * as catRepository from '../repositories/catRepository.js'
import type { CatRow } from '../repositories/catRepository.js'
import * as feedingSessionRepository from '../repositories/feedingSessionRepository.js'
import type {
  FeedingSessionRow,
  UpdateFeedingSessionInput,
} from '../repositories/feedingSessionRepository.js'
import * as recordRepository from '../repositories/recordRepository.js'
import type { UpdateRecordInput } from '../repositories/recordRepository.js'
import { finishFeedingSession } from './feedingSessionService.js'
import { buildDaily, buildPending, resolveCat, toRecordView } from './mcpQueryService.js'
import {
  addDays,
  isoToSqliteUtc,
  sqliteUtcToIso,
  todayTaipei,
  toTaipeiIso,
} from '../utils/datetime.js'
import {
  RECORD_TYPE_UNIT,
  ToolError,
  isQuantifiedType,
  isRecord,
  requireFeedingSessionType,
  requireFiniteNumber,
  requireIntInRange,
  requireNonNegativeNumber,
  requirePositiveInt,
  requirePositiveNumber,
  requireRecordType,
  toToolErrorBody,
} from '../utils/validation.js'

const OP_NAMES = ['start', 'complete', 'record', 'update', 'delete'] as const
type OpName = (typeof OP_NAMES)[number]
type Op = Record<string, unknown>

interface OpContext {
  db: D1Database
  cats: CatRow[]
  now: Date
  /** 這次呼叫涉及的貓（不論成敗），用來決定回傳的 state 要含哪些貓。 */
  affectedCatIds: Set<number>
}

const MAX_OPS = 50
const MAX_MINUTES_AGO = 30 * 24 * 60
const FUTURE_TOLERANCE_MS = 60_000
const MAX_LITTER_NOTE_LENGTH = 200

// 備註只有 MCP 強制檢查，網頁端的自由輸入不受影響（見 MCP 規格書 1.3）。
const ALLOWED_NOTES: Record<'water' | 'food', string[]> = {
  food: ['飼料', '罐頭', '化毛膏', '濕食'],
  water: ['水', '罐頭加水', '濕食加水'],
}
const DEFAULT_NOTE: Record<'water' | 'food', string> = { food: '飼料', water: '水' }
const HAIRBALL_NOTE = '化毛膏'
const HAIRBALL_DEFAULT_AMOUNT = 1

// 沒帶時區的時間視為台灣時間。
const NAIVE_TIME_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
const ZONED_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

/** 避免 30 - 12.3 變成 17.700000000000003。 */
function roundAmount(value: number): number {
  return Math.round(value * 100) / 100
}

function parseAt(value: unknown): Date {
  const invalid = new ToolError(
    'INVALID_VALUE',
    'at 格式錯誤，需為 YYYY-MM-DDTHH:mm、YYYY-MM-DDTHH:mm:ss，或帶時區的 ISO 時間',
  )
  if (typeof value !== 'string') throw invalid
  const text = value.trim()

  let iso: string
  if (NAIVE_TIME_RE.test(text)) {
    iso = `${text}${text.length === 16 ? ':00' : ''}+08:00`
  } else if (ZONED_TIME_RE.test(text)) {
    iso = text
  } else {
    throw invalid
  }

  // Date 會把 2026-02-31 默默進位成 3 月 3 日，所以日期要另外確認是真實存在的日子。
  const datePart = text.slice(0, 10)
  const parsed = new Date(iso)
  if (addDays(datePart, 0) !== datePart || Number.isNaN(parsed.getTime())) throw invalid
  return parsed
}

/** 解析 at / minutesAgo；兩個都沒給回 undefined（由呼叫端決定預設）。 */
function resolveTime(op: Op, ctx: OpContext): Date | undefined {
  if (op.at !== undefined && op.minutesAgo !== undefined) {
    throw new ToolError('TIME_CONFLICT', 'at 與 minutesAgo 只能擇一')
  }

  let time: Date | undefined
  if (op.at !== undefined) {
    time = parseAt(op.at)
  } else if (op.minutesAgo !== undefined) {
    const minutesAgo = requireIntInRange(op.minutesAgo, 'minutesAgo', 0, MAX_MINUTES_AGO)
    time = new Date(ctx.now.getTime() - minutesAgo * 60_000)
  }

  if (time && time.getTime() > ctx.now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new ToolError('TIME_IN_FUTURE', '時間不能晚於現在', { now: toTaipeiIso(ctx.now) })
  }
  return time
}

function requireAllowedNote(type: 'water' | 'food', value: unknown): string {
  const note = typeof value === 'string' ? value.trim() : ''
  if (!ALLOWED_NOTES[type].includes(note)) {
    throw new ToolError(
      'NOTE_NOT_ALLOWED',
      `${type} 的備註只能是：${ALLOWED_NOTES[type].join('、')}`,
      { allowedNotes: ALLOWED_NOTES[type] },
    )
  }
  return note
}

/** water / food：沒帶備註就用預設值。 */
function resolveNote(type: 'water' | 'food', value: unknown): string {
  return value === undefined || value === null ? DEFAULT_NOTE[type] : requireAllowedNote(type, value)
}

/** pee / poop：自由文字、選填，空白視為沒有。 */
function resolveLitterNote(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw new ToolError('INVALID_VALUE', 'note 必須為字串')
  }
  const note = value.trim()
  if (note.length > MAX_LITTER_NOTE_LENGTH) {
    throw new ToolError('INVALID_VALUE', `note 最長 ${MAX_LITTER_NOTE_LENGTH} 字`)
  }
  return note || null
}

/** 給的量（start、record）：必須大於 0；備註是化毛膏時可省略，預設 1 g。 */
function resolveGivenAmount(value: unknown, note: string): number {
  if (value === undefined) {
    if (note === HAIRBALL_NOTE) return HAIRBALL_DEFAULT_AMOUNT
    throw new ToolError('MISSING_FIELD', 'amount 為必填', { field: 'amount' })
  }
  return requirePositiveNumber(value, 'amount')
}

function requireTarget(value: unknown): 'record' | 'session' {
  if (value !== 'record' && value !== 'session') {
    throw new ToolError('INVALID_VALUE', "target 僅接受 'record' 或 'session'")
  }
  return value
}

function toSessionView(ctx: OpContext, row: FeedingSessionRow) {
  return {
    id: row.id,
    cat: ctx.cats.find((cat) => cat.id === row.cat_id)?.name ?? '',
    type: row.type,
    note: row.note,
    givenAmount: row.given_amount,
    unit: row.unit,
    givenAt: toTaipeiIso(row.given_at),
  }
}

async function sessionNotFound(ctx: OpContext, message: string): Promise<ToolError> {
  return new ToolError('SESSION_NOT_FOUND', message, { pending: await buildPending(ctx.db, ctx.now) })
}

/** 用 id 找進行中的 session，找不到就回目前全部 pending 讓呼叫端重選。 */
async function requireSession(ctx: OpContext, id: number): Promise<FeedingSessionRow> {
  const session = await feedingSessionRepository.findFeedingSessionById(ctx.db, id)
  if (!session) {
    throw await sessionNotFound(ctx, `找不到進行中的餵食 id=${id}（不存在或已完成）`)
  }
  ctx.affectedCatIds.add(session.cat_id)
  return session
}

async function startFeeding(ctx: OpContext, op: Op) {
  const cat = resolveCat(ctx.cats, op.cat)
  ctx.affectedCatIds.add(cat.id)
  const type = requireFeedingSessionType(op.type)
  const note = resolveNote(type, op.note)
  const givenAmount = resolveGivenAmount(op.amount, note)
  const givenAt = resolveTime(op, ctx)

  const row = await feedingSessionRepository.insertFeedingSession(ctx.db, {
    cat_id: cat.id,
    type,
    given_amount: givenAmount,
    unit: RECORD_TYPE_UNIT[type],
    note,
    given_at: givenAt ? isoToSqliteUtc(givenAt.toISOString()) : undefined,
  })
  return { session: toSessionView(ctx, row) }
}

/**
 * 有給 id 就用 id；沒給 id 時用 cat + type 找，剛好一筆才算數（省掉先查再完成的來回），
 * 沒有或有多筆都回錯誤，不替呼叫端猜。
 */
async function findSessionToComplete(ctx: OpContext, op: Op): Promise<FeedingSessionRow> {
  if (op.id !== undefined) {
    return requireSession(ctx, requirePositiveInt(op.id, 'id'))
  }

  const cat = resolveCat(ctx.cats, op.cat)
  ctx.affectedCatIds.add(cat.id)
  const type = requireFeedingSessionType(op.type)
  const candidates = (await buildPending(ctx.db, ctx.now, new Set([cat.id]))).filter(
    (item) => item.type === type,
  )

  if (candidates.length === 0) {
    throw await sessionNotFound(ctx, `${cat.name} 沒有進行中的 ${type} 餵食`)
  }
  if (candidates.length > 1) {
    throw new ToolError(
      'SESSION_AMBIGUOUS',
      `${cat.name} 有多筆進行中的 ${type} 餵食，請詢問使用者是哪一筆，再用 id 指定`,
      { pending: candidates },
    )
  }
  return requireSession(ctx, candidates[0].id)
}

async function completeFeeding(ctx: OpContext, op: Op) {
  const session = await findSessionToComplete(ctx, op)

  if ((op.remaining === undefined) === (op.consumed === undefined)) {
    throw new ToolError('INVALID_VALUE', 'remaining 與 consumed 必須剛好給一個')
  }

  let amount: number
  if (op.remaining !== undefined) {
    amount = session.given_amount - requireNonNegativeNumber(op.remaining, 'remaining')
  } else {
    const consumed = requireFiniteNumber(op.consumed, 'consumed')
    if (consumed > session.given_amount) {
      throw new ToolError('CONSUMED_EXCEEDS_GIVEN', 'consumed 不能大於給的量', {
        givenAmount: session.given_amount,
      })
    }
    amount = consumed
  }
  amount = roundAmount(amount)

  const note = op.note === undefined ? session.note : requireAllowedNote(session.type, op.note)
  const occurredAt = resolveTime(op, ctx) ?? ctx.now
  const givenAt = new Date(sqliteUtcToIso(session.given_at))
  if (occurredAt.getTime() < givenAt.getTime()) {
    throw new ToolError('TIME_BEFORE_START', '完成時間不能早於開始時間', {
      givenAt: toTaipeiIso(givenAt),
    })
  }

  const row = await finishFeedingSession(ctx.db, session, {
    amount,
    occurredAt: occurredAt.toISOString(),
    note,
  })
  return {
    record: toRecordView(ctx.cats, row),
    givenAmount: session.given_amount,
    remainingAmount: roundAmount(session.given_amount - amount),
  }
}

async function createRecord(ctx: OpContext, op: Op) {
  const cat = resolveCat(ctx.cats, op.cat)
  ctx.affectedCatIds.add(cat.id)
  const type = requireRecordType(op.type)

  let amount = 0
  let note: string | null
  if (isQuantifiedType(type)) {
    const quantifiedNote = resolveNote(type, op.note)
    amount = resolveGivenAmount(op.amount, quantifiedNote)
    note = quantifiedNote
  } else {
    if (op.amount !== undefined) {
      throw new ToolError('AMOUNT_NOT_ALLOWED', `${type} 沒有數量，不能帶 amount`)
    }
    note = resolveLitterNote(op.note)
  }
  const occurredAt = resolveTime(op, ctx) ?? ctx.now

  const row = await recordRepository.insertRecord(ctx.db, {
    cat_id: cat.id,
    type,
    amount,
    unit: RECORD_TYPE_UNIT[type],
    note,
    occurred_at: occurredAt.toISOString(),
  })
  return { record: toRecordView(ctx.cats, row) }
}

async function updateRecord(ctx: OpContext, op: Op, id: number) {
  const existing = await recordRepository.findRecordById(ctx.db, id)
  if (!existing) {
    throw new ToolError('RECORD_NOT_FOUND', `找不到 id=${id} 的紀錄`)
  }
  ctx.affectedCatIds.add(existing.cat_id)

  const patch: UpdateRecordInput = {}
  if (isQuantifiedType(existing.type)) {
    // water / food 的 amount 允許 0 或負數（剩的比給的多）。
    if (op.amount !== undefined) patch.amount = requireFiniteNumber(op.amount, 'amount')
    if (op.note !== undefined) patch.note = requireAllowedNote(existing.type, op.note)
  } else {
    if (op.amount !== undefined) {
      throw new ToolError('AMOUNT_NOT_ALLOWED', `${existing.type} 沒有數量，不能帶 amount`)
    }
    if (op.note !== undefined) patch.note = resolveLitterNote(op.note)
  }
  const time = resolveTime(op, ctx)
  if (time) patch.occurred_at = time.toISOString()

  if (Object.keys(patch).length === 0) {
    throw new ToolError('MISSING_FIELD', '至少要帶一個要修改的欄位（amount、note、at、minutesAgo）')
  }

  const row = await recordRepository.updateRecordFields(ctx.db, id, patch)
  if (!row) {
    throw new ToolError('RECORD_NOT_FOUND', `找不到 id=${id} 的紀錄`)
  }
  return { target: 'record', record: toRecordView(ctx.cats, row) }
}

async function updateSession(ctx: OpContext, op: Op, id: number) {
  const existing = await requireSession(ctx, id)

  const patch: UpdateFeedingSessionInput = {}
  if (op.amount !== undefined) patch.given_amount = requirePositiveNumber(op.amount, 'amount')
  if (op.note !== undefined) patch.note = requireAllowedNote(existing.type, op.note)
  const time = resolveTime(op, ctx)
  if (time) patch.given_at = isoToSqliteUtc(time.toISOString())

  if (Object.keys(patch).length === 0) {
    throw new ToolError('MISSING_FIELD', '至少要帶一個要修改的欄位（amount、note、at、minutesAgo）')
  }

  const row = await feedingSessionRepository.updateFeedingSessionFields(ctx.db, id, patch)
  if (!row) {
    throw await sessionNotFound(ctx, `找不到進行中的餵食 id=${id}`)
  }
  return { target: 'session', session: toSessionView(ctx, row) }
}

async function updateTarget(ctx: OpContext, op: Op) {
  const target = requireTarget(op.target)
  const id = requirePositiveInt(op.id, 'id')
  return target === 'record' ? updateRecord(ctx, op, id) : updateSession(ctx, op, id)
}

/** 永久刪除，回傳被刪掉的完整內容供呼叫端回報或重建。 */
async function deleteTarget(ctx: OpContext, op: Op) {
  const target = requireTarget(op.target)
  const id = requirePositiveInt(op.id, 'id')

  if (target === 'record') {
    const existing = await recordRepository.findRecordById(ctx.db, id)
    if (!existing) {
      throw new ToolError('RECORD_NOT_FOUND', `找不到 id=${id} 的紀錄`)
    }
    ctx.affectedCatIds.add(existing.cat_id)
    await recordRepository.deleteRecord(ctx.db, id)
    return { target, id, deleted: toRecordView(ctx.cats, existing) }
  }

  const existing = await requireSession(ctx, id)
  await feedingSessionRepository.deleteFeedingSession(ctx.db, id)
  return { target, id, deleted: toSessionView(ctx, existing) }
}

const OP_HANDLERS: Record<OpName, (ctx: OpContext, op: Op) => Promise<Record<string, unknown>>> = {
  start: startFeeding,
  complete: completeFeeding,
  record: createRecord,
  update: updateTarget,
  delete: deleteTarget,
}

export async function mutateTool(db: D1Database, args: Record<string, unknown>) {
  const ops = args.ops
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > MAX_OPS) {
    throw new ToolError('INVALID_REQUEST', `ops 必須是 1 到 ${MAX_OPS} 筆的陣列`)
  }
  for (const op of ops) {
    if (!isRecord(op) || !OP_NAMES.includes(op.op as OpName)) {
      throw new ToolError('INVALID_REQUEST', `每筆 op 都要有 op 欄位，值為 ${OP_NAMES.join('、')} 之一`)
    }
  }

  const ctx: OpContext = {
    db,
    cats: await catRepository.listCats(db),
    now: new Date(),
    affectedCatIds: new Set<number>(),
  }

  const results: Record<string, unknown>[] = []
  for (const [index, op] of (ops as Op[]).entries()) {
    const name = op.op as OpName
    try {
      results.push({ index, op: name, ok: true, ...(await OP_HANDLERS[name](ctx, op)) })
    } catch (err) {
      results.push({ index, op: name, ok: false, error: toToolErrorBody(err) })
    }
  }

  const ok = results.filter((result) => result.ok).length
  const today = todayTaipei(ctx.now)
  const affectedCats = ctx.cats.filter((cat) => ctx.affectedCatIds.has(cat.id))
  const [pending, todayRows] = await Promise.all([
    buildPending(db, ctx.now, ctx.affectedCatIds),
    buildDaily(db, affectedCats, today, today),
  ])

  return {
    now: toTaipeiIso(ctx.now),
    results,
    summary: { total: results.length, ok, failed: results.length - ok },
    state: { pending, today: todayRows },
  }
}
