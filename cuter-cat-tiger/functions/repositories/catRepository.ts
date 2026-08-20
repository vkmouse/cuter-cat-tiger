
export interface CatRow {
  id: number
  name: string
  target_water: number
  target_food: number
  created_at: string
}

export interface InsertCatInput {
  name: string
  target_water: number
  target_food: number
}

export interface UpdateCatInput {
  name?: string
  target_water?: number
  target_food?: number
}

const CAT_COLUMNS = `id, name, target_water, target_food, created_at`

export async function listCats(db: D1Database): Promise<CatRow[]> {
  const { results } = await db
    .prepare(`SELECT ${CAT_COLUMNS} FROM cats ORDER BY id ASC`)
    .all<CatRow>()
  return results
}

export async function findCatById(db: D1Database, id: number): Promise<CatRow | null> {
  const row = await db
    .prepare(`SELECT ${CAT_COLUMNS} FROM cats WHERE id = ?`)
    .bind(id)
    .first<CatRow>()
  return row ?? null
}

export async function insertCat(db: D1Database, input: InsertCatInput): Promise<CatRow> {
  const row = await db
    .prepare(
      `INSERT INTO cats (name, target_water, target_food) VALUES (?, ?, ?)
       RETURNING ${CAT_COLUMNS}`,
    )
    .bind(input.name, input.target_water, input.target_food)
    .first<CatRow>()
  if (!row) {
    throw new Error('INSERT cats 未回傳資料')
  }
  return row
}

/** 只更新有帶入的欄位；呼叫端須保證至少帶一個欄位。 */
export async function updateCat(
  db: D1Database,
  id: number,
  patch: UpdateCatInput,
): Promise<CatRow | null> {
  const sets: string[] = []
  const values: unknown[] = []

  if (patch.name !== undefined) {
    sets.push('name = ?')
    values.push(patch.name)
  }
  if (patch.target_water !== undefined) {
    sets.push('target_water = ?')
    values.push(patch.target_water)
  }
  if (patch.target_food !== undefined) {
    sets.push('target_food = ?')
    values.push(patch.target_food)
  }

  values.push(id)
  const row = await db
    .prepare(
      `UPDATE cats SET ${sets.join(', ')} WHERE id = ?
       RETURNING ${CAT_COLUMNS}`,
    )
    .bind(...values)
    .first<CatRow>()
  return row ?? null
}

export async function deleteCat(db: D1Database, id: number): Promise<boolean> {
  // D1 連線的 foreign_keys 狀態不應視為持久設定，因此刪除前明確啟用。
  await db.prepare(`PRAGMA foreign_keys = ON`).run()
  const result = await db.prepare(`DELETE FROM cats WHERE id = ?`).bind(id).run()
  return (result.meta.changes ?? 0) > 0
}
