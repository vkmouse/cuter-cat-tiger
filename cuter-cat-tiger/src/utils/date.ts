// UTC+8 日期換算工具。
//
// shared-spec.md 第 5 節規定：任何「當天」的判斷一律換算為 UTC+8，禁止使用瀏覽器
// 本地時區（Date 的 getFullYear/getHours 等 local getter）或 toISOString().slice(0,10)。
// 這裡改用「把 UTC 時間戳位移 +8 小時後，再用 UTC getter 取值」的方式，確保結果
// 與使用者瀏覽器所在時區無關。
//
// 這個檔案是唯一定義來源，composables/useRecords.ts、composables/useDailyStats.ts、
// components/nav/DateNav.vue 都應呼叫這裡，不要各自重算。

const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

// key 一律是本檔內產生或已通過 requireDateParam 驗證的 'YYYY-MM-DD'，格式保證正確，
// 用 ! 跳過 noUncheckedIndexedAccess 的 undefined 檢查
function parseDateKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y!, m!, d!]
}

function toUtc8Shifted(date: Date): Date {
  return new Date(date.getTime() + UTC8_OFFSET_MS)
}

/** 由 Date 物件取得 'YYYY-MM-DD' 格式的日期 key，代表該時刻在 UTC+8 的日期 */
export function dateKeyFromDate(date: Date): string {
  const s = toUtc8Shifted(date)
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`
}

/** 由 UTC ISO 字串取得 'YYYY-MM-DD' 格式的日期 key（UTC+8 當天） */
export function dateKeyFromIso(iso: string): string {
  return dateKeyFromDate(new Date(iso))
}

export function todayDateKey(): string {
  return dateKeyFromDate(new Date())
}

/** 日期 key 前後移動 n 天（n 可為負數），回傳新的日期 key */
export function addDaysToDateKey(key: string, delta: number): string {
  const [y, m, d] = parseDateKey(key)
  // 用當天正午建構再位移一整天的倍數，避免邊界問題
  const base = Date.UTC(y, m - 1, d, 12, 0, 0)
  const next = new Date(base + delta * DAY_MS)
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

export function isTodayDateKey(key: string): boolean {
  return key === todayDateKey()
}

/** 日期 key 是否晚於 UTC+8 的今天（尚未定案是否要限制翻頁，先提供判斷函式供之後使用） */
export function isFutureDateKey(key: string): boolean {
  return key > todayDateKey()
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 'YYYY-MM-DD' → '星期X' */
export function weekdayLabel(key: string): string {
  const [y, m, d] = parseDateKey(key)
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `星期${WEEKDAY_LABELS[w]}`
}

/** 'YYYY-MM-DD' → '2026年8月18日' */
export function formatDateLabel(key: string): string {
  const [y, m, d] = parseDateKey(key)
  return `${y}年${m}月${d}日`
}

/** UTC ISO 字串 → <input type="datetime-local"> 需要的值，顯示為 UTC+8 當地時間 */
export function isoToDateTimeLocalValue(iso: string): string {
  const s = toUtc8Shifted(new Date(iso))
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}T${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`
}

/** <input type="datetime-local"> 的值（視為 UTC+8 當地時間）→ UTC ISO 字串 */
export function dateTimeLocalValueToIso(value: string): string {
  // <input type="datetime-local"> 非空時保證是 'YYYY-MM-DDTHH:mm'，格式固定
  const [datePart, timePart] = value.split('T') as [string, string]
  const [y, m, d] = parseDateKey(datePart)
  const [hh, mm] = timePart.split(':').map(Number) as [number, number]
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - UTC8_OFFSET_MS
  return new Date(utcMs).toISOString()
}

export function nowDateTimeLocalValue(): string {
  return isoToDateTimeLocalValue(new Date().toISOString())
}

/** UTC ISO 字串 → 'HH:mm'（UTC+8 當地時間） */
export function formatTimeLabel(iso: string): string {
  const s = toUtc8Shifted(new Date(iso))
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

/**
 * 「距離上次多久」的顯示文字，用於多貓總覽抽屜的 lastPeeAt/lastPoopAt。
 * 設計決策（見 litter-record-spec.md 第 5 節）：只取單一最合適的單位，不同時列出多個單位。
 *   - < 1 小時 → 分鐘
 *   - < 24 小時 → 小時
 *   - ≥ 24 小時 → 天
 * 皆無條件捨去到整數；null（從未記錄過）回傳「尚無紀錄」。
 * 這裡吃 ISO 字串直接跟「現在」比較即可，不像 dateKey 系列函式需要換算 UTC+8 當天邊界——
 * 「幾小時/幾天前」是連續的時間差，跟日期換日不受時區影響。
 */
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
