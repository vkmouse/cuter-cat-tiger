/**
 * 驗證授權請求並產生 `code`，見 OAuth Server 規格書第 7 節。
 *
 * 由 /authorize 前端畫面呼叫，外層由 Cloudflare Access 的 Service Token
 * 把關（後端不再驗證），沒有使用者登入與同意授權，因此在 `_middleware.ts`
 * 的放行名單內，不要求 access_token Cookie。
 *
 * 失敗一律回 400：前端靠 400 判斷是授權請求本身有問題，顯示錯誤而不導回
 * 第三方網站。
 *
 * 只定義 POST；其他呼叫方式由 Pages Functions 自動回應 405。
 */
import type { Env } from '../types.js'
import * as oauthService from '../services/oauthService.js'
import { getMcpResourceUrl, getPublicOrigin } from '../utils/origin.js'
import { withErrorHandling } from '../utils/validation.js'

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const resourceUrl = getMcpResourceUrl(getPublicOrigin(context.request, context.env))
  const result = await oauthService.authorize(context.env.DB, context.request, resourceUrl)
  return Response.json(result)
})
