/**
 * 授權伺服器中繼資料（RFC 8414），見 OAuth Server 規格書第 4 節。
 *
 * 不在 `/api` 底下，Cloudflare Access 的 Service Token 不適用，也不經過
 * `api/_middleware.ts`。內容依請求網域動態產生，不寫死網域。
 */
import type { Env } from '../types.js'
import { getPublicOrigin } from '../utils/origin.js'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const origin = getPublicOrigin(context.request, context.env)
  return Response.json({
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/api/token`,
    registration_endpoint: `${origin}/api/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  })
}
