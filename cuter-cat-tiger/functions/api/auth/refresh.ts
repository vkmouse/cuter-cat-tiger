/**
 * 換發存取權。
 *
 * 只認長效存取憑證（refresh_token Cookie），驗證通過後只核發新的短效
 * 存取憑證，長效存取憑證維持原狀（見 API 規格書第 4.2 節）。
 *
 * 跟「取得存取權」一樣建立在「能被呼叫到就代表外部核驗已通過」的信任
 * 前提上，因此也在外部存取控管服務的保護範圍內；本端點不需要重新核對
 * Client ID / Client Secret。
 *
 * 只定義 POST（對應「提交」語意）；其他呼叫方式由 Pages Functions 自動
 * 回應 405，符合「呼叫方式錯誤」的規格要求。
 */
import type { Env } from '../../types.js'
import { signAccessToken, verifyAppToken, ACCESS_TOKEN_TTL_SECONDS } from '../../utils/jwt.js'
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, buildAppCookie, getCookie } from '../../utils/cookie.js'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const secret = context.env.APP_JWT_SECRET
  if (!secret) {
    console.error('[auth/refresh] 缺少環境變數 APP_JWT_SECRET')
    return Response.json({ error: '未授權' }, { status: 401 })
  }

  const refreshToken = getCookie(context.request.headers.get('Cookie'), REFRESH_TOKEN_COOKIE_NAME)
  if (!refreshToken) {
    return Response.json({ error: '未授權' }, { status: 401 })
  }

  // expectedType: 'refresh' 同時擋掉「不合法」「已過期」「其實是短效憑證冒充」三種情況。
  const valid = await verifyAppToken(secret, refreshToken, 'refresh')
  if (!valid) {
    return Response.json({ error: '未授權' }, { status: 401 })
  }

  const newAccessToken = await signAccessToken(secret)

  const response = Response.json({ ok: true })
  response.headers.append(
    'Set-Cookie',
    buildAppCookie(ACCESS_TOKEN_COOKIE_NAME, newAccessToken, ACCESS_TOKEN_TTL_SECONDS),
  )
  return response
}
