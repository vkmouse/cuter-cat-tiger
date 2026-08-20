
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

export async function deleteCat(db: D1Database, id: number): Promise<boolean> {
  // D1 連線的 foreign_keys 狀態不應視為持久設定，因此刪除前明確啟用。
  await db.prepare(`PRAGMA foreign_keys = ON`).run()
  const result = await db.prepare(`DELETE FROM cats WHERE id = ?`).bind(id).run()
  return (result.meta.changes ?? 0) > 0
}
