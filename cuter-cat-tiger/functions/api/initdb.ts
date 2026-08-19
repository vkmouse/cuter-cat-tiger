import type { Env } from '../types.js'
import { withErrorHandling } from '../utils/validation.js'

/**
 * 資料庫初始化用的 DDL，取代原本 migrations/0001_init.sql 的內容。
 * 全部使用 IF NOT EXISTS，重複呼叫此 API 是安全的（不會清掉既有資料、不會噴錯）。
 */
const INIT_STATEMENTS = [
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE IF NOT EXISTS cats (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     name       TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS records (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     cat_id      INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
     type        TEXT NOT NULL CHECK (type IN ('water', 'food')),
     amount      REAL NOT NULL,
     unit        TEXT NOT NULL,
     note        TEXT,
     occurred_at TEXT NOT NULL,
     created_at  TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at  TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_records_cat_id ON records(cat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_records_occurred_at ON records(occurred_at)`,
]

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const db = context.env.DB
  for (const sql of INIT_STATEMENTS) {
    await db.prepare(sql).run()
  }
  return Response.json({
    message: '資料庫初始化完成（cats / records 資料表已建立，若已存在則略過）',
  })
})
