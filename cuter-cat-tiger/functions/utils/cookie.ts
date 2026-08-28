/**
 * Cookie 讀寫共用小工具。
 *
 * 短效／長效兩種存取憑證都用 httpOnly Cookie 存放，兩者共用同一個 Path，
 * 涵蓋本系統所有端點；長效憑證即使被自動夾帶到不需要它的一般功能性端點
 * 也不構成問題，因為那些端點本來就只認短效憑證（見 API 規格書第 4.1 節）。
 */

/** 兩個 Cookie 共用的 Path，涵蓋整個 /api/*。 */
export const APP_COOKIE_PATH = '/api'

export const ACCESS_TOKEN_COOKIE_NAME = 'access_token'
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token'

/** 從 `Cookie` request header 裡取出指定名稱的值；不存在回傳 null。 */
export function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) === name) {
      return decodeURIComponent(trimmed.slice(eq + 1))
    }
  }
  return null
}

/** 組出一個 httpOnly Cookie 的 Set-Cookie 值：Secure、SameSite=Strict。 */
export function buildAppCookie(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${APP_COOKIE_PATH}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ')
}
