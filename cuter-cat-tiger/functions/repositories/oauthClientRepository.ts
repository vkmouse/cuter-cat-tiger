export interface OAuthClientRow {
  client_id: string
  /** 回呼網址清單，JSON 陣列文字，例如 `["https://a.com/cb","https://b.com/cb"]`。 */
  redirect_uris: string
}

export interface InsertOAuthClientInput {
  client_id: string
  redirect_uris: string
}

const OAUTH_CLIENT_COLUMNS = `client_id, redirect_uris`

export async function insertOAuthClient(
  db: D1Database,
  input: InsertOAuthClientInput,
): Promise<OAuthClientRow> {
  const row = await db
    .prepare(
      `INSERT INTO oauth_client (client_id, redirect_uris) VALUES (?, ?)
       RETURNING ${OAUTH_CLIENT_COLUMNS}`,
    )
    .bind(input.client_id, input.redirect_uris)
    .first<OAuthClientRow>()
  if (!row) {
    throw new Error('INSERT oauth_client 未回傳資料')
  }
  return row
}

export async function findOAuthClientById(
  db: D1Database,
  clientId: string,
): Promise<OAuthClientRow | null> {
  const row = await db
    .prepare(`SELECT ${OAUTH_CLIENT_COLUMNS} FROM oauth_client WHERE client_id = ?`)
    .bind(clientId)
    .first<OAuthClientRow>()
  return row ?? null
}
