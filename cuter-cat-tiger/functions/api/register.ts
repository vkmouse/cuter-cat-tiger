/**
 * 動態用戶端註冊（DCR），見 OAuth Server 規格書第 5 節。
 *
 * 呼叫者是第三方網站的伺服器，沒有 Cloudflare Service Token，因此在
 * `_middleware.ts` 的放行名單內。
 *
 * 只定義 POST；其他呼叫方式由 Pages Functions 自動回應 405。
 */
import type { Env } from '../types.js'
import * as oauthService from '../services/oauthService.js'
import { withErrorHandling } from '../utils/validation.js'

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const client = await oauthService.registerClient(context.env.DB, context.request)
  return Response.json(client, { status: 201 })
})
