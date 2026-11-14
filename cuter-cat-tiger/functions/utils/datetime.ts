/** 將 D1/SQLite 的 UTC 時間轉成 API 使用的 ISO UTC 字串。 */
export function sqliteUtcToIso(value: string): string {
  const withT = value.includes('T') ? value : value.replace(' ', 'T')
  const withZone = withT.endsWith('Z') ? withT : `${withT}Z`
  return new Date(withZone).toISOString()
}

/** 把 ISO UTC 字串轉成 SQLite `datetime('now')` 的格式（YYYY-MM-DD HH:MM:SS），讓欄位格式一致、字串排序正確。 */
export function isoToSqliteUtc(iso: string): string {
  return iso.slice(0, 19).replace('T', ' ')
}

/** 台灣不實施日光節約時間，固定 UTC+8。 */
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000

/** 把時間（Date、ISO 或 SQLite UTC 字串）轉成帶 +08:00 的台灣時間字串，給 MCP 輸出用。 */
export function toTaipeiIso(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(sqliteUtcToIso(value)) : value
  return `${new Date(date.getTime() + TAIPEI_OFFSET_MS).toISOString().slice(0, 19)}+08:00`
}

/** 台灣時間的今天（YYYY-MM-DD）。 */
export function todayTaipei(now: Date): string {
  return new Date(now.getTime() + TAIPEI_OFFSET_MS).toISOString().slice(0, 10)
}

/** 台灣時間的現在是幾點（0 到 23）。 */
export function hourTaipei(now: Date): number {
  return new Date(now.getTime() + TAIPEI_OFFSET_MS).getUTCHours()
}

/** 日期（YYYY-MM-DD）加減天數。 */
export function addDays(date: string, delta: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + delta * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}
