export interface OAuthCodeRow {
  code: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  /** 過期時間，Unix 時間戳，單位：秒。 */
  expires_at: number
}

export interface InsertOAuthCodeInput {
  code: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  expires_at: number
}

const OAUTH_CODE_COLUMNS = `code, client_id, redirect_uri, code_challenge, expires_at`

export async function insertOAuthCode(
  db: D1Database,
  input: InsertOAuthCodeInput,
): Promise<OAuthCodeRow> {
  const row = await db
    .prepare(
      `INSERT INTO oauth_code (code, client_id, redirect_uri, code_challenge, expires_at)
       VALUES (?, ?, ?, ?, ?)
       RETURNING ${OAUTH_CODE_COLUMNS}`,
    )
    .bind(input.code, input.client_id, input.redirect_uri, input.code_challenge, input.expires_at)
    .first<OAuthCodeRow>()
  if (!row) {
    throw new Error('INSERT oauth_code 未回傳資料')
  }
  return row
}

/**
 * 以一條 SQL 取出並刪除 `code`，用完即刪，不論後續驗證成敗。同一個 `code` 同時
 * 送出兩次，只有一個請求拿得到記錄。不存在或已被取走時回傳 null。
 */
export async function consumeOAuthCode(db: D1Database, code: string): Promise<OAuthCodeRow | null> {
  const row = await db
    .prepare(`DELETE FROM oauth_code WHERE code = ? RETURNING ${OAUTH_CODE_COLUMNS}`)
    .bind(code)
    .first<OAuthCodeRow>()
  return row ?? null
}
