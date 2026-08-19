/**
 * records 表的資料存取層。只做 SQL 讀寫，不含業務邏輯。
 * 「當天」判斷一律用 date(datetime(occurred_at, '+8 hours')) = ?，對應 shared-spec 第 5 節 UTC+8 規則。
 */

export interface RecordRow {
  id: number
  cat_id: number
  type: 'water' | 'food' | 'pee' | 'poop'
  amount: number
  unit: string
  note: string | null
  occurred_at: string
  created_at: string
  updated_at: string | null
}

export interface InsertRecordInput {
  cat_id: number
  type: 'water' | 'food' | 'pee' | 'poop'
  amount: number
  unit: string
  note: string | null
  occurred_at: string
}

export interface UpdateRecordInput {
  amount?: number
  unit?: string
  note?: string | null
  occurred_at?: string
}

const RECORD_COLUMNS = `id, cat_id, type, amount, unit, note, occurred_at, created_at, updated_at`

/** 列出某貓咪在指定 UTC+8 日期的所有紀錄，新到舊排序（對應前端列表需求）。 */
export async function listRecordsByCatAndDate(
  db: D1Database,
  catId: number,
  date: string,
): Promise<RecordRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${RECORD_COLUMNS}
       FROM records
       WHERE cat_id = ?
         AND date(datetime(occurred_at, '+8 hours')) = ?
       ORDER BY occurred_at DESC, id DESC`,
    )
    .bind(catId, date)
    .all<RecordRow>()
  return results
}

export async function findRecordById(db: D1Database, id: number): Promise<RecordRow | null> {
  const row = await db
    .prepare(`SELECT ${RECORD_COLUMNS} FROM records WHERE id = ?`)
    .bind(id)
    .first<RecordRow>()
  return row ?? null
}

export async function insertRecord(
  db: D1Database,
  input: InsertRecordInput,
): Promise<RecordRow> {
  const row = await db
    .prepare(
      `INSERT INTO records (cat_id, type, amount, unit, note, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING ${RECORD_COLUMNS}`,
    )
    .bind(input.cat_id, input.type, input.amount, input.unit, input.note, input.occurred_at)
    .first<RecordRow>()
  if (!row) {
    throw new Error('INSERT records 未回傳資料')
  }
  return row
}

/** 部分更新紀錄（amount / unit / note / occurred_at 任意組合），並寫入 updated_at。 */
export async function updateRecordFields(
  db: D1Database,
  id: number,
  patch: UpdateRecordInput,
): Promise<RecordRow | null> {
  const sets: string[] = []
  const values: unknown[] = []

  if (patch.amount !== undefined) {
    sets.push('amount = ?')
    values.push(patch.amount)
  }
  if (patch.unit !== undefined) {
    sets.push('unit = ?')
    values.push(patch.unit)
  }
  if (patch.note !== undefined) {
    sets.push('note = ?')
    values.push(patch.note)
  }
  if (patch.occurred_at !== undefined) {
    sets.push('occurred_at = ?')
    values.push(patch.occurred_at)
  }

  if (sets.length === 0) {
    // 沒有任何欄位要更新，直接回傳目前資料
    return findRecordById(db, id)
  }

  sets.push(`updated_at = datetime('now')`)
  values.push(id)

  const row = await db
    .prepare(
      `UPDATE records SET ${sets.join(', ')} WHERE id = ?
       RETURNING ${RECORD_COLUMNS}`,
    )
    .bind(...values)
    .first<RecordRow>()
  return row ?? null
}

export async function deleteRecord(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM records WHERE id = ?`).bind(id).run()
  return (result.meta.changes ?? 0) > 0
}

export interface DailySumRow {
  cat_id: number
  type: 'water' | 'food' | 'pee' | 'poop'
  total: number
  count: number
}

/**
 * 指定 UTC+8 日期、所有貓咪各 type 的當日總量與次數（groupby cat_id, type）。
 * water/food 用 total（SUM(amount)）；pee/poop 用 count（次數，amount 恆為 0 沒有意義）。
 * 沒有紀錄的組合不會出現在結果中。
 */
export async function sumAmountsByDate(db: D1Database, date: string): Promise<DailySumRow[]> {
  const { results } = await db
    .prepare(
      `SELECT cat_id, type, SUM(amount) AS total, COUNT(*) AS count
       FROM records
       WHERE date(datetime(occurred_at, '+8 hours')) = ?
       GROUP BY cat_id, type`,
    )
    .bind(date)
    .all<DailySumRow>()
  return results
}

export interface LastOccurredRow {
  cat_id: number
  type: 'pee' | 'poop'
  last_occurred_at: string
}

/**
 * 每隻貓咪最後一筆 pee/poop 的時間，「不分日期」，取全部歷史裡最新的一筆。
 * 用於「多貓總覽」的「距離上次多久」，跟 sumAmountsByDate 的當日限定語意不同，刻意分開成獨立查詢。
 */
export async function findLastLitterOccurredAt(db: D1Database): Promise<LastOccurredRow[]> {
  const { results } = await db
    .prepare(
      `SELECT cat_id, type, MAX(occurred_at) AS last_occurred_at
       FROM records
       WHERE type IN ('pee', 'poop')
       GROUP BY cat_id, type`,
    )
    .all<LastOccurredRow>()
  return results
}
