import * as oauthClientRepository from '../repositories/oauthClientRepository.js'
import type { OAuthClientRow } from '../repositories/oauthClientRepository.js'
import * as oauthCodeRepository from '../repositories/oauthCodeRepository.js'
import { OAUTH_ACCESS_TOKEN_TTL_SECONDS, signOAuthAccessToken } from '../utils/oauthJwt.js'
import { computeS256CodeChallenge } from '../utils/pkce.js'
import { ApiError, parseJsonBody } from '../utils/validation.js'

// OAuth 端點的失敗回應只帶標準錯誤碼（見 OAuth Server 規格書第 12 節），
// 因此這裡的 ApiError 訊息就是錯誤碼本身，而不是中文說明。

/** 授權碼有效時間：10 分鐘。 */
const AUTHORIZATION_CODE_TTL_SECONDS = 10 * 60

export interface RegisteredClient {
  client_id: string
  redirect_uris: string[]
}

export interface AuthorizationResult {
  code: string
  /** 有帶 state 才回傳，原封不動。 */
  state?: string
}

export interface TokenResult {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
}

function toRegisteredClient(row: OAuthClientRow): RegisteredClient {
  return {
    client_id: row.client_id,
    redirect_uris: JSON.parse(row.redirect_uris) as string[],
  }
}

/** 請求 body 不是合法 JSON 物件時，視同沒帶任何參數，回呼叫端指定的錯誤碼。 */
async function parseOAuthBody(
  request: Request,
  errorCode: string,
): Promise<Record<string, unknown>> {
  try {
    return await parseJsonBody(request)
  } catch {
    throw new ApiError(400, errorCode)
  }
}

/** 請求 body 不是合法的表單格式（application/x-www-form-urlencoded）時，視同沒帶任何參數。 */
async function parseOAuthForm(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    throw new ApiError(400, 'invalid_request')
  }
}

/** 必須存在、是字串、不是空字串；否則視為沒帶。 */
function requireOAuthParam(value: unknown): string {
  if (typeof value !== 'string' || value === '') {
    throw new ApiError(400, 'invalid_request')
  }
  return value
}

/** 必須是非空陣列，且每個元素都是以 `https://` 開頭的字串（只比對開頭）。 */
function requireRedirectUris(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((uri): uri is string => typeof uri === 'string' && uri.startsWith('https://'))
  ) {
    throw new ApiError(400, 'invalid_redirect_uri')
  }
  return value
}

/** 256 位元的隨機值，轉成 16 進位字串。 */
function generateAuthorizationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function registerClient(db: D1Database, request: Request): Promise<RegisteredClient> {
  const body = await parseOAuthBody(request, 'invalid_redirect_uri')
  const redirectUris = requireRedirectUris(body.redirect_uris)

  const row = await oauthClientRepository.insertOAuthClient(db, {
    client_id: crypto.randomUUID(),
    redirect_uris: JSON.stringify(redirectUris),
  })
  return toRegisteredClient(row)
}

export async function authorize(
  db: D1Database,
  request: Request,
  resourceUrl: string,
): Promise<AuthorizationResult> {
  const body = await parseOAuthBody(request, 'invalid_request')

  // 五個必要參數都要有帶；state 選填，不在此列。
  const responseType = requireOAuthParam(body.response_type)
  const clientId = requireOAuthParam(body.client_id)
  const redirectUri = requireOAuthParam(body.redirect_uri)
  const codeChallenge = requireOAuthParam(body.code_challenge)
  const codeChallengeMethod = requireOAuthParam(body.code_challenge_method)
  const state = typeof body.state === 'string' ? body.state : undefined

  if (responseType !== 'code') {
    throw new ApiError(400, 'unsupported_response_type')
  }

  const client = await oauthClientRepository.findOAuthClientById(db, clientId)
  if (!client) {
    throw new ApiError(400, 'invalid_client')
  }
  if (!toRegisteredClient(client).redirect_uris.includes(redirectUri)) {
    throw new ApiError(400, 'invalid_request')
  }

  if (codeChallengeMethod !== 'S256') {
    throw new ApiError(400, 'invalid_request')
  }

  // resource（RFC 8707）選填：有帶就必須是本站的 MCP 伺服器。不另外儲存，
  // access token 的 aud 一律是 MCP 伺服器的網址。
  if (body.resource !== undefined && body.resource !== resourceUrl) {
    throw new ApiError(400, 'invalid_target')
  }

  const row = await oauthCodeRepository.insertOAuthCode(db, {
    code: generateAuthorizationCode(),
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    expires_at: Math.floor(Date.now() / 1000) + AUTHORIZATION_CODE_TTL_SECONDS,
  })
  return state === undefined ? { code: row.code } : { code: row.code, state }
}

export async function exchangeToken(
  db: D1Database,
  request: Request,
  secret: string,
  resourceUrl: string,
): Promise<TokenResult> {
  const form = await parseOAuthForm(request)

  // 五個參數都要有帶。不收 client_secret，resource 以外多送的參數一律忽略。
  const grantType = requireOAuthParam(form.get('grant_type'))
  const code = requireOAuthParam(form.get('code'))
  const redirectUri = requireOAuthParam(form.get('redirect_uri'))
  const clientId = requireOAuthParam(form.get('client_id'))
  const codeVerifier = requireOAuthParam(form.get('code_verifier'))

  if (grantType !== 'authorization_code') {
    throw new ApiError(400, 'unsupported_grant_type')
  }

  // resource（RFC 8707）選填：有帶就必須是本站的 MCP 伺服器。這是參數層級的檢查，
  // 在取出 code 之前，失敗時 code 不受影響。
  const resource = form.get('resource')
  if (resource !== null && resource !== resourceUrl) {
    throw new ApiError(400, 'invalid_target')
  }

  // code 一取出就刪除，不論後面的驗證成功或失敗：之後任何一項驗證不通過，
  // 這個 code 都已作廢，Client 必須重新授權。
  const codeRow = await oauthCodeRepository.consumeOAuthCode(db, code)
  if (!codeRow) {
    throw new ApiError(400, 'invalid_grant')
  }
  if (codeRow.expires_at <= Math.floor(Date.now() / 1000)) {
    throw new ApiError(400, 'invalid_grant')
  }
  if (codeRow.client_id !== clientId || codeRow.redirect_uri !== redirectUri) {
    throw new ApiError(400, 'invalid_grant')
  }
  if ((await computeS256CodeChallenge(codeVerifier)) !== codeRow.code_challenge) {
    throw new ApiError(400, 'invalid_grant')
  }

  return {
    access_token: await signOAuthAccessToken(secret, clientId, resourceUrl),
    token_type: 'Bearer',
    expires_in: OAUTH_ACCESS_TOKEN_TTL_SECONDS,
  }
}
