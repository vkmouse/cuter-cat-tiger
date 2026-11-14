import type { Env } from '../types.js'
import { withErrorHandling } from '../utils/validation.js'

/** 初始化 D1 schema；可重複執行而不影響既有資料。 */
const INIT_STATEMENTS = [
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE IF NOT EXISTS cats (
     id           INTEGER PRIMARY KEY AUTOINCREMENT,
     name         TEXT NOT NULL,
     target_water REAL NOT NULL,
     target_food  REAL NOT NULL,
     created_at   TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  // 不在資料庫限制 type，讓既有資料庫能直接支援新增的 pee/poop 類型。
  `CREATE TABLE IF NOT EXISTS records (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     cat_id      INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
     type        TEXT NOT NULL,
     amount      REAL NOT NULL,
     unit        TEXT NOT NULL,
     note        TEXT,
     occurred_at TEXT NOT NULL,
     created_at  TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at  TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_records_cat_id ON records(cat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_records_occurred_at ON records(occurred_at)`,
  // 先給後測的餵食情境：只有 water/food 會用到，量測完成後會轉成一筆 records 並刪掉這裡的暫存列。
  `CREATE TABLE IF NOT EXISTS feeding_sessions (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     cat_id        INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
     type          TEXT NOT NULL,
     given_amount  REAL NOT NULL,
     unit          TEXT NOT NULL,
     note          TEXT,
     given_at      TEXT NOT NULL DEFAULT (datetime('now')),
     created_at    TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at    TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_feeding_sessions_cat_id ON feeding_sessions(cat_id)`,
  // OAuth Server：redirect_uris 存成 JSON 陣列文字，只做完全一致比對（見 OAuth 規格書第 11 節）。
  `CREATE TABLE IF NOT EXISTS oauth_client (
     client_id     TEXT PRIMARY KEY,
     redirect_uris TEXT NOT NULL
   )`,
  // 授權碼用完即刪；expires_at 為 Unix 時間戳（秒），過期的 code 不會自動清除。
  `CREATE TABLE IF NOT EXISTS oauth_code (
     code           TEXT PRIMARY KEY,
     client_id      TEXT NOT NULL REFERENCES oauth_client(client_id),
     redirect_uri   TEXT NOT NULL,
     code_challenge TEXT NOT NULL,
     expires_at     INTEGER NOT NULL
   )`,
]

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const db = context.env.DB
  for (const sql of INIT_STATEMENTS) {
    await db.prepare(sql).run()
  }
  return Response.json({
    message:
      '資料庫初始化完成（cats / records / feeding_sessions / oauth_client / oauth_code 資料表已建立，若已存在則略過）',
  })
})
