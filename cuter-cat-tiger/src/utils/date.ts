/** 日期邏輯統一以 UTC+8 計算，避免受瀏覽器時區影響。 */

const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function parseDateKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y!, m!, d!]
}

function toUtc8Shifted(date: Date): Date {
  return new Date(date.getTime() + UTC8_OFFSET_MS)
}

export function dateKeyFromDate(date: Date): string {
  const s = toUtc8Shifted(date)
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`
}

export function dateKeyFromIso(iso: string): string {
  return dateKeyFromDate(new Date(iso))
}

export function todayDateKey(): string {
  return dateKeyFromDate(new Date())
}

export function addDaysToDateKey(key: string, delta: number): string {
  const [y, m, d] = parseDateKey(key)
  // 使用正午作為基準，避免日期邊界造成偏移。
  const base = Date.UTC(y, m - 1, d, 12, 0, 0)
  const next = new Date(base + delta * DAY_MS)
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

export function isTodayDateKey(key: string): boolean {
  return key === todayDateKey()
}

export function isFutureDateKey(key: string): boolean {
  return key > todayDateKey()
}

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export function weekdayLabel(key: string): string {
  const [y, m, d] = parseDateKey(key)
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `星期${WEEKDAY_LABELS[w]}`
}

export function formatDateLabel(key: string): string {
  const [y, m, d] = parseDateKey(key)
  return `${y}年${m}月${d}日`
}

export function isoToDateTimeLocalValue(iso: string): string {
  const s = toUtc8Shifted(new Date(iso))
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}T${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`
}

export function dateTimeLocalValueToIso(value: string): string {
  const [datePart, timePart] = value.split('T') as [string, string]
  const [y, m, d] = parseDateKey(datePart)
  const [hh, mm] = timePart.split(':').map(Number) as [number, number]
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - UTC8_OFFSET_MS
  return new Date(utcMs).toISOString()
}

export function nowDateTimeLocalValue(): string {
  return isoToDateTimeLocalValue(new Date().toISOString())
}

export function formatTimeLabel(iso: string): string {
  const s = toUtc8Shifted(new Date(iso))
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

/** 以單一最合適的時間單位顯示距離上次記錄的時間。 */
export function formatSinceLabel(iso: string | null): string {
  if (!iso) return '尚無紀錄'
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < HOUR_MS) {
    const minutes = Math.max(0, Math.floor(diffMs / MINUTE_MS))
    return `${minutes} 分鐘前`
  }
  if (diffMs < 24 * HOUR_MS) {
    return `${Math.floor(diffMs / HOUR_MS)} 小時前`
  }
  return `${Math.floor(diffMs / (24 * HOUR_MS))} 天前`
}
