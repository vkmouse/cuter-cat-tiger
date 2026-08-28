/**
 * 取得存取權。
 *
 * 能被呼叫到，就代表外部存取控管服務（Cloudflare Access Service Auth）
 * 已經核驗過呼叫端的 Client ID / Client Secret，這裡不需要（也不應該）
 * 再重新核對一次那組長效憑證的正確性（見 API 規格書第 2 節）。
 *
 * 只定義 GET（對應「取得」的唯讀語意）；其他呼叫方式由 Pages Functions
 * 自動回應 405，符合「呼叫方式錯誤」的規格要求，且不會誤用外部服務攔截
 * 慣用的 403。
 */
import type { Env } from '../../types.js'
import {
  signAccessToken,
  signRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../../utils/jwt.js'
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, buildAppCookie } from '../../utils/cookie.js'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const secret = context.env.APP_JWT_SECRET
  if (!secret) {
    // 缺少核發存取權所需的必要設定，一律視為失敗，不將具體原因回傳給呼叫端。
    console.error('[auth/login] 缺少環境變數 APP_JWT_SECRET')
    return Response.json({ error: '未授權' }, { status: 401 })
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(secret),
    signRefreshToken(secret),
  ])

  const response = Response.json({ ok: true })
  response.headers.append(
    'Set-Cookie',
    buildAppCookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, ACCESS_TOKEN_TTL_SECONDS),
  )
  response.headers.append(
    'Set-Cookie',
    buildAppCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_TTL_SECONDS),
  )
  return response
}
