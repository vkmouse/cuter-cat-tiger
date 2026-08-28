export interface Env {
  DB: D1Database
  OPENROUTER_API_KEY?: string
  OPENROUTER_MODEL?: string
  /** 簽發/驗證短效與長效存取憑證所用的密鑰（見 API 規格書第 6 節）。 */
  APP_JWT_SECRET?: string
}
