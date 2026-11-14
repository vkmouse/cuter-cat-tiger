/**
 * MCP 的 query 工具（唯讀）：一次回傳現在時間、貓咪、進行中餵食、每日統計、
 * 排泄最近時間與提醒。mutate 工具也共用這裡的 resolveCat、buildPending、buildDaily。
 * 所有對外的時間都是台灣時間（UTC+8，帶 +08:00）。
 */
import * as catRepository from '../repositories/catRepository.js'
import type { CatRow } from '../repositories/catRepository.js'
import * as feedingSessionRepository from '../repositories/feedingSessionRepository.js'
import * as recordRepository from '../repositories/recordRepository.js'
import type { RecordRow } from '../repositories/recordRepository.js'
import {
  addDays,
  hourTaipei,
  sqliteUtcToIso,
  todayTaipei,
  toTaipeiIso,
} from '../utils/datetime.js'
import {
  ToolError,
  requireDateParam,
  requireIntInRange,
  requireNonEmptyString,
} from '../utils/validation.js'

const MAX_RECORDS = 500

// 提醒門檻（暫定，見 MCP 規格書 2.7）。
const NO_PEE_WARN_HOURS = 12
const NO_PEE_URGENT_HOURS = 24
const NO_POOP_WARN_HOURS = 48
const LOW_WATER_AFTER_HOUR = 18
const LOW_WATER_RATIO = 0.5
const STALE_PENDING_MINUTES = 720

export interface PendingView {
  id: number
  cat: string
  type: 'water' | 'food'
  note: string | null
  givenAmount: number
  unit: string
  givenAt: string
  minutesElapsed: number
}

export interface DailyView {
  date: string
  cat: string
  waterMl: number
  foodG: number
  peeCount: number
  poopCount: number
  targetWater: number
  targetFood: number
}

interface SummaryView {
  cat: string
  lastPeeAt: string | null
  lastPoopAt: string | null
  hoursSincePee: number | null
  hoursSincePoop: number | null
}

interface AlertView {
  level: 'warn' | 'urgent'
  kind: 'no_pee' | 'no_poop' | 'low_water' | 'stale_pending'
  cat: string
  id?: number
  message: string
}

/** 貓名要與資料庫完全相同（去除前後空白後）；對不到或同名多隻都要請呼叫端處理。 */
export function resolveCat(cats: CatRow[], rawName: unknown): CatRow {
  const name = requireNonEmptyString(rawName, 'cat').trim()
  const matched = cats.filter((cat) => cat.name === name)
  if (matched.length === 0) {
    throw new ToolError('CAT_NOT_FOUND', `找不到名為「${name}」的貓咪`, {
      validCats: cats.map((cat) => cat.name),
    })
  }
  if (matched.length > 1) {
    throw new ToolError('CAT_AMBIGUOUS', `有多隻貓都叫「${name}」`, {
      candidates: matched.map((cat) => ({ id: cat.id, name: cat.name })),
    })
  }
  return matched[0]
}

export function toRecordView(cats: CatRow[], row: RecordRow) {
  return {
    id: row.id,
    cat: cats.find((cat) => cat.id === row.cat_id)?.name ?? '',
    type: row.type,
    amount: row.amount,
    unit: row.unit,
    note: row.note,
    occurredAt: toTaipeiIso(row.occurred_at),
  }
}

/** 進行中餵食；貓 id 由小到大，同一隻貓由舊到新。catIds 有給就只回那些貓的。 */
export async function buildPending(
  db: D1Database,
  now: Date,
  catIds?: Set<number>,
): Promise<PendingView[]> {
  const rows = await feedingSessionRepository.listAllFeedingSessions(db)
  return rows
    .filter((row) => !catIds || catIds.has(row.cat_id))
    .sort((a, b) => a.cat_id - b.cat_id || a.given_at.localeCompare(b.given_at) || a.id - b.id)
    .map((row) => {
      const givenAt = new Date(sqliteUtcToIso(row.given_at))
      return {
        id: row.id,
        cat: row.cat_name,
        type: row.type,
        note: row.note,
        givenAmount: row.given_amount,
        unit: row.unit,
        givenAt: toTaipeiIso(givenAt),
        minutesElapsed: Math.max(0, Math.floor((now.getTime() - givenAt.getTime()) / 60_000)),
      }
    })
}

/** from 到 to（含頭尾）每隻貓每天一列，沒有紀錄的日子數值為 0；日期新到舊，同一天貓 id 由小到大。 */
export async function buildDaily(
  db: D1Database,
  cats: CatRow[],
  from: string,
  to: string,
): Promise<DailyView[]> {
  const sums = await recordRepository.sumAmountsByDateRange(db, from, to)

  const totals = new Map<string, { waterMl: number; foodG: number; peeCount: number; poopCount: number }>()
  for (const sum of sums) {
    const key = `${sum.cat_id}|${sum.day}`
    const entry = totals.get(key) ?? { waterMl: 0, foodG: 0, peeCount: 0, poopCount: 0 }
    if (sum.type === 'water') {
      entry.waterMl = sum.total
    } else if (sum.type === 'food') {
      entry.foodG = sum.total
    } else if (sum.type === 'pee') {
      entry.peeCount = sum.count
    } else {
      entry.poopCount = sum.count
    }
    totals.set(key, entry)
  }

  const rows: DailyView[] = []
  for (let date = to; date >= from; date = addDays(date, -1)) {
    for (const cat of cats) {
      const entry = totals.get(`${cat.id}|${date}`) ?? { waterMl: 0, foodG: 0, peeCount: 0, poopCount: 0 }
      rows.push({
        date,
        cat: cat.name,
        ...entry,
        targetWater: cat.target_water,
        targetFood: cat.target_food,
      })
    }
  }
  return rows
}

function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null
  return Math.round(((now.getTime() - new Date(iso).getTime()) / 3_600_000) * 10) / 10
}

function buildSummary(
  cats: CatRow[],
  lastLitter: recordRepository.LastOccurredRow[],
  now: Date,
): SummaryView[] {
  return cats.map((cat) => {
    const last = (type: 'pee' | 'poop') =>
      lastLitter.find((row) => row.cat_id === cat.id && row.type === type)?.last_occurred_at ?? null
    const lastPee = last('pee')
    const lastPoop = last('poop')
    return {
      cat: cat.name,
      lastPeeAt: lastPee ? toTaipeiIso(lastPee) : null,
      lastPoopAt: lastPoop ? toTaipeiIso(lastPoop) : null,
      hoursSincePee: hoursSince(lastPee, now),
      hoursSincePoop: hoursSince(lastPoop, now),
    }
  })
}

/** 只提醒、不做醫療判斷；同一個 kind 同時符合兩級時只回較高的一則。 */
function buildAlerts(
  cats: CatRow[],
  summary: SummaryView[],
  pending: PendingView[],
  todayWaterByCat: Map<number, number>,
  now: Date,
): AlertView[] {
  const alerts: AlertView[] = []

  // summary 與 cats 同順序同長度。
  for (const [index, cat] of cats.entries()) {
    const pee = summary[index].hoursSincePee
    const poop = summary[index].hoursSincePoop

    if (pee !== null && pee >= NO_PEE_URGENT_HOURS) {
      alerts.push({ level: 'urgent', kind: 'no_pee', cat: cat.name, message: `${cat.name} 已經 ${pee} 小時沒有尿尿紀錄` })
    } else if (pee !== null && pee >= NO_PEE_WARN_HOURS) {
      alerts.push({ level: 'warn', kind: 'no_pee', cat: cat.name, message: `${cat.name} 已經 ${pee} 小時沒有尿尿紀錄` })
    }

    if (poop !== null && poop >= NO_POOP_WARN_HOURS) {
      alerts.push({ level: 'warn', kind: 'no_poop', cat: cat.name, message: `${cat.name} 已經 ${poop} 小時沒有便便紀錄` })
    }

    const water = todayWaterByCat.get(cat.id) ?? 0
    if (hourTaipei(now) >= LOW_WATER_AFTER_HOUR && water < cat.target_water * LOW_WATER_RATIO) {
      alerts.push({
        level: 'warn',
        kind: 'low_water',
        cat: cat.name,
        message: `${cat.name} 今天只喝了 ${water} ml，不到目標 ${cat.target_water} ml 的一半`,
      })
    }
  }

  for (const item of pending) {
    if (item.minutesElapsed >= STALE_PENDING_MINUTES) {
      alerts.push({
        level: 'warn',
        kind: 'stale_pending',
        cat: item.cat,
        id: item.id,
        message: `${item.cat} 的 ${item.type} 已經給出 ${item.minutesElapsed} 分鐘還沒量剩餘`,
      })
    }
  }
  return alerts
}

/** 日期要是真實存在的日曆日（正規式擋不掉 2026-02-31）。 */
function requireRealDate(raw: unknown): string {
  const date = requireDateParam(typeof raw === 'string' ? raw : null, 'date')
  if (addDays(date, 0) !== date) {
    throw new ToolError('INVALID_VALUE', 'date 不是真實存在的日期')
  }
  return date
}

export async function queryTool(db: D1Database, args: Record<string, unknown>) {
  const now = new Date()
  const today = todayTaipei(now)

  const date = args.date === undefined ? today : requireRealDate(args.date)
  if (date > today) {
    throw new ToolError('INVALID_VALUE', 'date 不能晚於今天')
  }
  const days = args.days === undefined ? 1 : requireIntInRange(args.days, 'days', 1, 31)
  const include = args.include === undefined ? [] : args.include
  if (!Array.isArray(include) || include.some((item) => item !== 'records')) {
    throw new ToolError('INVALID_VALUE', "include 只接受 'records'")
  }

  const allCats = await catRepository.listCats(db)
  const cat = args.cat === undefined ? null : resolveCat(allCats, args.cat)
  const cats = cat ? [cat] : allCats
  const catIds = new Set(cats.map((item) => item.id))
  const from = addDays(date, -(days - 1))

  const [pending, daily, lastLitter, todaySums, records] = await Promise.all([
    buildPending(db, now, catIds),
    buildDaily(db, cats, from, date),
    recordRepository.findLastLitterOccurredAt(db),
    recordRepository.sumAmountsByDate(db, today),
    include.includes('records')
      ? recordRepository.listRecordsByDateRange(db, from, date, cat?.id ?? null, MAX_RECORDS + 1)
      : Promise.resolve(null),
  ])

  const summary = buildSummary(cats, lastLitter, now)
  const todayWaterByCat = new Map<number, number>()
  for (const sum of todaySums) {
    if (sum.type === 'water') todayWaterByCat.set(sum.cat_id, sum.total)
  }

  const result: Record<string, unknown> = {
    now: toTaipeiIso(now),
    cats: cats.map((item) => ({
      id: item.id,
      name: item.name,
      targetWater: item.target_water,
      targetFood: item.target_food,
    })),
    pending,
    daily,
    summary,
    alerts: buildAlerts(cats, summary, pending, todayWaterByCat, now),
  }
  if (records) {
    result.records = records.slice(0, MAX_RECORDS).map((row) => toRecordView(allCats, row))
    if (records.length > MAX_RECORDS) {
      result.recordsTruncated = true
    }
  }
  return result
}
