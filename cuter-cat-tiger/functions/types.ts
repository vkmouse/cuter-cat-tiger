export interface Env {
  DB: D1Database
  /** 簽發/驗證短效與長效存取憑證所用的密鑰（見 API 規格書第 6 節）。 */
  APP_JWT_SECRET?: string
  /** 簽發/驗證 OAuth access token 所用的密鑰，與 APP_JWT_SECRET 分開（見 OAuth 規格書第 8 節）。 */
  OAUTH_JWT_SECRET?: string
  /**
   * 選填：固定本站對外的網址（例如 `https://example.com`），用於探索 metadata、
   * `resource` 比對與 access token 的 `aud`。沒設定就用請求本身的網址。
   */
  PUBLIC_ORIGIN?: string
}
