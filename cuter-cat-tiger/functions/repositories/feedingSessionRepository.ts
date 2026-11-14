export interface FeedingSessionRow {
  id: number
  cat_id: number
  type: 'water' | 'food'
  given_amount: number
  unit: string
  note: string | null
  given_at: string
  created_at: string
  updated_at: string | null
}

export interface InsertFeedingSessionInput {
  cat_id: number
  type: 'water' | 'food'
  given_amount: number
  unit: string
  note: string | null
  /** SQLite UTC 格式；沒帶就用資料庫的現在時間。 */
  given_at?: string
}

export interface UpdateFeedingSessionInput {
  given_amount?: number
  note?: string | null
  given_at?: string
}

export interface FeedingSessionWithCatNameRow extends FeedingSessionRow {
  cat_name: string
}

const FEEDING_SESSION_COLUMNS = `id, cat_id, type, given_amount, unit, note, given_at, created_at, updated_at`

/** 跨貓咪列出全部進行中紀錄，帶上貓咪名稱。 */
export async function listAllFeedingSessions(
  db: D1Database,
): Promise<FeedingSessionWithCatNameRow[]> {
  const { results } = await db
    .prepare(
      `SELECT fs.id, fs.cat_id, fs.type, fs.given_amount, fs.unit, fs.note,
              fs.given_at, fs.created_at, fs.updated_at, c.name AS cat_name
       FROM feeding_sessions fs
       JOIN cats c ON c.id = fs.cat_id
       ORDER BY fs.given_at DESC, fs.id DESC`,
    )
    .all<FeedingSessionWithCatNameRow>()
  return results
}

export async function listFeedingSessionsByCatId(
  db: D1Database,
  catId: number,
): Promise<FeedingSessionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${FEEDING_SESSION_COLUMNS}
       FROM feeding_sessions
       WHERE cat_id = ?
       ORDER BY given_at DESC, id DESC`,
    )
    .bind(catId)
    .all<FeedingSessionRow>()
  return results
}

export async function findFeedingSessionById(
  db: D1Database,
  id: number,
): Promise<FeedingSessionRow | null> {
  const row = await db
    .prepare(`SELECT ${FEEDING_SESSION_COLUMNS} FROM feeding_sessions WHERE id = ?`)
    .bind(id)
    .first<FeedingSessionRow>()
  return row ?? null
}

export async function insertFeedingSession(
  db: D1Database,
  input: InsertFeedingSessionInput,
): Promise<FeedingSessionRow> {
  const row = await db
    .prepare(
      `INSERT INTO feeding_sessions (cat_id, type, given_amount, unit, note, given_at)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
       RETURNING ${FEEDING_SESSION_COLUMNS}`,
    )
    .bind(
      input.cat_id,
      input.type,
      input.given_amount,
      input.unit,
      input.note ?? null,
      input.given_at ?? null,
    )
    .first<FeedingSessionRow>()
  if (!row) {
    throw new Error('INSERT feeding_sessions 未回傳資料')
  }
  return row
}

export async function updateGivenAmount(
  db: D1Database,
  id: number,
  givenAmount: number,
  note?: string | null,
): Promise<FeedingSessionRow | null> {
  const row = await db
    .prepare(
      `UPDATE feeding_sessions SET given_amount = ?, note = ?, updated_at = datetime('now') WHERE id = ?
       RETURNING ${FEEDING_SESSION_COLUMNS}`,
    )
    .bind(givenAmount, note ?? null, id)
    .first<FeedingSessionRow>()
  return row ?? null
}

/** 只更新有帶入的欄位（跟 updateGivenAmount 不同，沒帶的 note 不會被清掉）；呼叫端須保證至少帶一個欄位。 */
export async function updateFeedingSessionFields(
  db: D1Database,
  id: number,
  patch: UpdateFeedingSessionInput,
): Promise<FeedingSessionRow | null> {
  const sets: string[] = []
  const values: unknown[] = []

  if (patch.given_amount !== undefined) {
    sets.push('given_amount = ?')
    values.push(patch.given_amount)
  }
  if (patch.note !== undefined) {
    sets.push('note = ?')
    values.push(patch.note)
  }
  if (patch.given_at !== undefined) {
    sets.push('given_at = ?')
    values.push(patch.given_at)
  }

  sets.push(`updated_at = datetime('now')`)
  values.push(id)

  const row = await db
    .prepare(
      `UPDATE feeding_sessions SET ${sets.join(', ')} WHERE id = ?
       RETURNING ${FEEDING_SESSION_COLUMNS}`,
    )
    .bind(...values)
    .first<FeedingSessionRow>()
  return row ?? null
}

export async function deleteFeedingSession(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM feeding_sessions WHERE id = ?`).bind(id).run()
  return (result.meta.changes ?? 0) > 0
}

/** 只組出 statement 不執行，供 complete 流程放進 db.batch() 交易（跟 insert records 綁在一起）。 */
export function buildDeleteFeedingSessionStatement(
  db: D1Database,
  id: number,
): D1PreparedStatement {
  return db.prepare(`DELETE FROM feeding_sessions WHERE id = ?`).bind(id)
}
