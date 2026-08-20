import * as catRepository from '../repositories/catRepository.js'
import type { CatRow } from '../repositories/catRepository.js'
import {
  ApiError,
  parseJsonBody,
  requireNonEmptyString,
  requirePositiveNumber,
} from '../utils/validation.js'
import { sqliteUtcToIso } from '../utils/datetime.js'

// 建立貓咪時若沒帶目標值，補這組預設值（DB 欄位為 NOT NULL，必須在寫入前補齊）。
const DEFAULT_TARGET_WATER = 200
const DEFAULT_TARGET_FOOD = 30

export interface Cat {
  id: number
  name: string
  targetWater: number
  targetFood: number
  createdAt: string
}

function toDto(row: CatRow): Cat {
  return {
    id: row.id,
    name: row.name,
    targetWater: row.target_water,
    targetFood: row.target_food,
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
  const targetWater =
    body.targetWater !== undefined
      ? requirePositiveNumber(body.targetWater, 'targetWater')
      : DEFAULT_TARGET_WATER
  const targetFood =
    body.targetFood !== undefined
      ? requirePositiveNumber(body.targetFood, 'targetFood')
      : DEFAULT_TARGET_FOOD

  const row = await catRepository.insertCat(db, {
    name,
    target_water: targetWater,
    target_food: targetFood,
  })
  return toDto(row)
}

export async function updateCat(db: D1Database, id: number, request: Request): Promise<Cat> {
  const body = await parseJsonBody(request)

  const patch: catRepository.UpdateCatInput = {}
  if (body.name !== undefined) {
    patch.name = requireNonEmptyString(body.name, 'name').trim()
  }
  if (body.targetWater !== undefined) {
    patch.target_water = requirePositiveNumber(body.targetWater, 'targetWater')
  }
  if (body.targetFood !== undefined) {
    patch.target_food = requirePositiveNumber(body.targetFood, 'targetFood')
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, '至少要帶一個要更新的欄位（name / targetWater / targetFood）')
  }

  const row = await catRepository.updateCat(db, id, patch)
  if (!row) {
    throw new ApiError(404, `找不到 id=${id} 的貓咪`)
  }
  return toDto(row)
}

export async function removeCat(db: D1Database, id: number): Promise<void> {
  const deleted = await catRepository.deleteCat(db, id)
  if (!deleted) {
    throw new ApiError(404, `找不到 id=${id} 的貓咪`)
  }
}
