/**
 * cats 表的資料存取層。只做 SQL 讀寫，不含業務邏輯。
 * Row 型別對應資料庫實際欄位（snake_case），與對外 camelCase DTO（services 層）分開維護。
 */

export interface CatRow {
  id: number
  name: string
  created_at: string
}

export async function listCats(db: D1Database): Promise<CatRow[]> {
  const { results } = await db
    .prepare(`SELECT id, name, created_at FROM cats ORDER BY id ASC`)
    .all<CatRow>()
  return results
}

export async function findCatById(db: D1Database, id: number): Promise<CatRow | null> {
  const row = await db
    .prepare(`SELECT id, name, created_at FROM cats WHERE id = ?`)
    .bind(id)
    .first<CatRow>()
  return row ?? null
}

export async function insertCat(db: D1Database, name: string): Promise<CatRow> {
  const row = await db
    .prepare(
      `INSERT INTO cats (name) VALUES (?)
       RETURNING id, name, created_at`,
    )
    .bind(name)
    .first<CatRow>()
  if (!row) {
    throw new Error('INSERT cats 未回傳資料')
  }
  return row
}

export async function updateCatName(
  db: D1Database,
  id: number,
  name: string,
): Promise<CatRow | null> {
  const row = await db
    .prepare(
      `UPDATE cats SET name = ? WHERE id = ?
       RETURNING id, name, created_at`,
    )
    .bind(name, id)
    .first<CatRow>()
  return row ?? null
}

/** 刪除貓咪，回傳是否有資料列被刪除。底下 records 由 FK CASCADE 一併刪除。 */
export async function deleteCat(db: D1Database, id: number): Promise<boolean> {
  // D1 不保證 foreign_keys pragma 會跨連線持續生效，delete 前明確啟用一次，
  // 確保 ON DELETE CASCADE 生效、不留下孤兒 records（見 backend-spec 2.4）。
  await db.prepare(`PRAGMA foreign_keys = ON`).run()
  const result = await db.prepare(`DELETE FROM cats WHERE id = ?`).bind(id).run()
  return (result.meta.changes ?? 0) > 0
}
