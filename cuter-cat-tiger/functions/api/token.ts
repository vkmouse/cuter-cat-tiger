/**
 * 用 `code` 換 access token，見 OAuth Server 規格書第 8 節。
 *
 * 呼叫者是第三方網站的伺服器，沒有 Cloudflare Service Token，也沒有 Client
 * 密鑰，因此在 `_middleware.ts` 的放行名單內；能擋住別人偷用 `code` 的只有
 * `code` 本身加上各項比對與 PKCE。
 *
 * 請求 body 是表單格式（application/x-www-form-urlencoded），不是 JSON。
 *
 * 只定義 POST；其他呼叫方式由 Pages Functions 自動回應 405。
 */
import type { Env } from '../types.js'
import * as oauthService from '../services/oauthService.js'
import { getMcpResourceUrl, getPublicOrigin } from '../utils/origin.js'
import { ApiError, withErrorHandling } from '../utils/validation.js'

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  // 先確認密鑰，避免缺少設定時白白消耗掉 code。
  const secret = context.env.OAUTH_JWT_SECRET
  if (!secret) {
    console.error('[token] 缺少環境變數 OAUTH_JWT_SECRET')
    throw new ApiError(500, 'server_error')
  }

  const resourceUrl = getMcpResourceUrl(getPublicOrigin(context.request, context.env))
  const result = await oauthService.exchangeToken(
    context.env.DB,
    context.request,
    secret,
    resourceUrl,
  )
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
})
