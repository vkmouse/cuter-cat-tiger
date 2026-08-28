/**
 * 存取控制 middleware，Cloudflare Pages Functions 會自動套用在 /api/* 底下
 * 所有請求，新增任何端點都會自動套用，不需要每次額外設定（見 API 規格書
 * 第 5 節）。
 *
 * 「取得存取權」「換發存取權」這兩個端點本身的職責就是核發/換發存取權，
 * 不受這條規則約束（見第 3 節），在此明確排除；其餘所有功能性端點都必須
 * 具備有效的短效存取憑證才能通過。
 *
 * 這條規則只套用在 functions 目錄對應的 /api/* 路徑，不會影響應用程式
 * 對外提供的靜態內容（頁面殼、前端資源），因為那些不屬於這個目錄結構。
 */
import type { Env } from '../types.js'
import { verifyAppToken } from '../utils/jwt.js'
import { ACCESS_TOKEN_COOKIE_NAME, getCookie } from '../utils/cookie.js'

const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/refresh'])

export const onRequest: PagesFunction<Env> = async (context) => {
  const { pathname } = new URL(context.request.url)
  if (EXEMPT_PATHS.has(pathname)) {
    return context.next()
  }

  const secret = context.env.APP_JWT_SECRET
  if (!secret) {
    console.error('[auth/middleware] 缺少環境變數 APP_JWT_SECRET')
    return Response.json({ error: '未授權' }, { status: 401 })
  }

  const accessToken = getCookie(context.request.headers.get('Cookie'), ACCESS_TOKEN_COOKIE_NAME)
  if (!accessToken) {
    return Response.json({ error: '未授權' }, { status: 401 })
  }

  // expectedType: 'access' 同時擋掉「不合法」「已過期」「其實是長效憑證冒充」三種情況。
  const valid = await verifyAppToken(secret, accessToken, 'access')
  if (!valid) {
    return Response.json({ error: '未授權' }, { status: 401 })
  }

  return context.next()
}
