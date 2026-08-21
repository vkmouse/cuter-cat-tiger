export interface FeedingSessionRow {
  id: number
  cat_id: number
  type: 'water' | 'food'
  given_amount: number
  unit: string
  given_at: string
  created_at: string
  updated_at: string | null
}

export interface InsertFeedingSessionInput {
  cat_id: number
  type: 'water' | 'food'
  given_amount: number
  unit: string
}

const FEEDING_SESSION_COLUMNS = `id, cat_id, type, given_amount, unit, given_at, created_at, updated_at`

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
      `INSERT INTO feeding_sessions (cat_id, type, given_amount, unit)
       VALUES (?, ?, ?, ?)
       RETURNING ${FEEDING_SESSION_COLUMNS}`,
    )
    .bind(input.cat_id, input.type, input.given_amount, input.unit)
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
): Promise<FeedingSessionRow | null> {
  const row = await db
    .prepare(
      `UPDATE feeding_sessions SET given_amount = ?, updated_at = datetime('now') WHERE id = ?
       RETURNING ${FEEDING_SESSION_COLUMNS}`,
    )
    .bind(givenAmount, id)
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
