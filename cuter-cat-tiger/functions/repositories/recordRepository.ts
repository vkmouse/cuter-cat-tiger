/** 查詢日期一律以 UTC+8 判斷，避免受執行環境時區影響。 */

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

/** 只組出 statement 不執行，供需要跟其他表一起放進 db.batch() 交易的呼叫端使用（例如 feeding session 完成時）。 */
export function buildInsertRecordStatement(
  db: D1Database,
  input: InsertRecordInput,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO records (cat_id, type, amount, unit, note, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING ${RECORD_COLUMNS}`,
    )
    .bind(input.cat_id, input.type, input.amount, input.unit, input.note, input.occurred_at)
}

export async function insertRecord(
  db: D1Database,
  input: InsertRecordInput,
): Promise<RecordRow> {
  const row = await buildInsertRecordStatement(db, input).first<RecordRow>()
  if (!row) {
    throw new Error('INSERT records 未回傳資料')
  }
  return row
}

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

/** water/food 回傳總量，pee/poop 回傳次數。 */
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

/** 取全部歷史中每隻貓咪最後一次 pee/poop。 */
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
