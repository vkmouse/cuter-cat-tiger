export interface OAuthRefreshTokenRow {
  /** refresh token 明文的 SHA-256，小寫 16 進位；明文不落地。 */
  token_hash: string
  /** 同一條鏈（經輪替串起來的所有 token）共用的識別。 */
  family_id: string
  client_id: string
  /** 被使用的時間，Unix 時間戳，單位：秒；null 表示尚未使用（鏈的最新一個）。 */
  used_at: number | null
  /** 閒置到期時間，Unix 時間戳，單位：秒；每次輪替發出的新 token 重新計算。 */
  idle_expires_at: number
  /** 絕對到期時間，Unix 時間戳，單位：秒；同一條鏈相同，輪替不改變。 */
  absolute_expires_at: number
}

export interface InsertOAuthRefreshTokenInput {
  token_hash: string
  family_id: string
  client_id: string
  idle_expires_at: number
  absolute_expires_at: number
}

/** 標記為已使用時回傳的欄位，足夠後續驗證與輪替使用。 */
export type UsedOAuthRefreshTokenRow = Pick<
  OAuthRefreshTokenRow,
  'family_id' | 'client_id' | 'idle_expires_at' | 'absolute_expires_at'
>

const OAUTH_REFRESH_TOKEN_COLUMNS = `token_hash, family_id, client_id, used_at, idle_expires_at, absolute_expires_at`

/** 新增一條鏈的第一列，`used_at` 為 NULL。 */
export async function insertOAuthRefreshToken(
  db: D1Database,
  input: InsertOAuthRefreshTokenInput,
): Promise<OAuthRefreshTokenRow> {
  const row = await db
    .prepare(
      `INSERT INTO oauth_refresh_token (token_hash, family_id, client_id, idle_expires_at, absolute_expires_at)
       VALUES (?, ?, ?, ?, ?)
       RETURNING ${OAUTH_REFRESH_TOKEN_COLUMNS}`,
    )
    .bind(
      input.token_hash,
      input.family_id,
      input.client_id,
      input.idle_expires_at,
      input.absolute_expires_at,
    )
    .first<OAuthRefreshTokenRow>()
  if (!row) {
    throw new Error('INSERT oauth_refresh_token 未回傳資料')
  }
  return row
}

/**
 * 以一條 SQL 把尚未使用的 token 標記為已使用。同一個 token 同時送出兩次，只有一個
 * 請求拿得到記錄。不存在或已被使用時回傳 null。
 */
export async function markOAuthRefreshTokenUsed(
  db: D1Database,
  tokenHash: string,
  now: number,
): Promise<UsedOAuthRefreshTokenRow | null> {
  const row = await db
    .prepare(
      `UPDATE oauth_refresh_token SET used_at = ?
       WHERE token_hash = ? AND used_at IS NULL
       RETURNING family_id, client_id, idle_expires_at, absolute_expires_at`,
    )
    .bind(now, tokenHash)
    .first<UsedOAuthRefreshTokenRow>()
  return row ?? null
}

/** 依 token 雜湊查所屬的鏈，不論該列是否已使用；查不到回傳 null。 */
export async function findOAuthRefreshTokenFamilyId(
  db: D1Database,
  tokenHash: string,
): Promise<string | null> {
  const row = await db
    .prepare(`SELECT family_id FROM oauth_refresh_token WHERE token_hash = ?`)
    .bind(tokenHash)
    .first<{ family_id: string }>()
  return row?.family_id ?? null
}

/** 作廢整條鏈：刪除該 `family_id` 的所有列，包含尚未使用的最新一列。 */
export async function deleteOAuthRefreshTokenFamily(
  db: D1Database,
  familyId: string,
): Promise<void> {
  await db.prepare(`DELETE FROM oauth_refresh_token WHERE family_id = ?`).bind(familyId).run()
}

/**
 * 輪替時寫入新列，欄位承襲舊列。有條件寫入：舊列已被並行請求作廢而消失時不會寫入，
 * 避免在已作廢的鏈上留下有效的新 token。回傳有沒有寫入。
 */
export async function rotateOAuthRefreshToken(
  db: D1Database,
  oldTokenHash: string,
  newTokenHash: string,
  newIdleExpiresAt: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `INSERT INTO oauth_refresh_token (token_hash, family_id, client_id, used_at, idle_expires_at, absolute_expires_at)
       SELECT ?, family_id, client_id, NULL, ?, absolute_expires_at
       FROM oauth_refresh_token WHERE token_hash = ?
       RETURNING token_hash`,
    )
    .bind(newTokenHash, newIdleExpiresAt, oldTokenHash)
    .first<{ token_hash: string }>()
  return row !== null
}

/**
 * 清理過期資料。已使用的列要留到整條鏈確定失效才能偵測重用，所以只刪絕對上限已過的列
 * （同一條鏈相同，整條一起刪），以及最新一列已閒置過期的整條鏈。
 */
export async function deleteExpiredOAuthRefreshTokens(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM oauth_refresh_token WHERE absolute_expires_at <= ?`).bind(now),
    db
      .prepare(
        `DELETE FROM oauth_refresh_token WHERE family_id IN (
           SELECT family_id FROM oauth_refresh_token WHERE used_at IS NULL AND idle_expires_at <= ?
         )`,
      )
      .bind(now),
  ])
}
