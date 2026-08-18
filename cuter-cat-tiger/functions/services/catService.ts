import * as catRepository from '../repositories/catRepository.js'
import type { CatRow } from '../repositories/catRepository.js'
import { ApiError, parseJsonBody, requireNonEmptyString } from '../utils/validation.js'
import { sqliteUtcToIso } from '../utils/datetime.js'

/** 對外 API 契約，對齊 shared-spec.md 第 4 節的 Cat 型別。 */
export interface Cat {
  id: number
  name: string
  createdAt: string
}

function toDto(row: CatRow): Cat {
  return {
    id: row.id,
    name: row.name,
    createdAt: sqliteUtcToIso(row.created_at),
  }
}

export async function listCats(db: D1Database): Promise<Cat[]> {
  const rows = await catRepository.listCats(db)
  return rows.map(toDto)
}

export async function createCat(db: D1Database, request: Request): Promise<Cat> {
  const body = await parseJsonBody(request)
  const name = requireNonEmptyString(body.name, 'name').trim()
  const row = await catRepository.insertCat(db, name)
  return toDto(row)
}

export async function renameCat(db: D1Database, id: number, request: Request): Promise<Cat> {
  const body = await parseJsonBody(request)
  const name = requireNonEmptyString(body.name, 'name').trim()
  const row = await catRepository.updateCatName(db, id, name)
  if (!row) {
    throw new ApiError(404, `找不到 id=${id} 的貓咪`)
  }
  return toDto(row)
}

/** 刪除貓咪；底下 records 由 DB 的 ON DELETE CASCADE 一併刪除。 */
export async function removeCat(db: D1Database, id: number): Promise<void> {
  const deleted = await catRepository.deleteCat(db, id)
  if (!deleted) {
    throw new ApiError(404, `找不到 id=${id} 的貓咪`)
  }
}
