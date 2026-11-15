import * as oauthClientRepository from '../repositories/oauthClientRepository.js'
import type { OAuthClientRow } from '../repositories/oauthClientRepository.js'
import * as oauthCodeRepository from '../repositories/oauthCodeRepository.js'
import * as oauthRefreshTokenRepository from '../repositories/oauthRefreshTokenRepository.js'
import { generateRandomHex256, sha256Hex } from '../utils/hex.js'
import { OAUTH_ACCESS_TOKEN_TTL_SECONDS, signOAuthAccessToken } from '../utils/oauthJwt.js'
import { computeS256CodeChallenge } from '../utils/pkce.js'
import { ApiError, parseJsonBody } from '../utils/validation.js'

// OAuth 端點的失敗回應只帶標準錯誤碼（見 OAuth Server 規格書第 12 節），
// 因此這裡的 ApiError 訊息就是錯誤碼本身，而不是中文說明。

/** 授權碼有效時間：10 分鐘。 */
const AUTHORIZATION_CODE_TTL_SECONDS = 10 * 60

/** refresh token 閒置期限：30 天。每次輪替發出的新 token 重新計算。 */
export const REFRESH_TOKEN_IDLE_TTL_SECONDS = 30 * 24 * 60 * 60

/** refresh token 絕對上限：180 天。同一條鏈固定，輪替不改變。 */
export const REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS = 180 * 24 * 60 * 60

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
  refresh_token: string
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
    code: generateRandomHex256(),
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    expires_at: Math.floor(Date.now() / 1000) + AUTHORIZATION_CODE_TTL_SECONDS,
  })
  return state === undefined ? { code: row.code } : { code: row.code, state }
}

/**
 * 簽發 refresh token 的第一個（一條新鏈的起點）：明文只回給 Client，DB 只存雜湊。
 * 寫入失敗視為未預期的例外；此時 code 已作廢，Client 須重新授權。
 */
async function issueInitialRefreshToken(db: D1Database, clientId: string): Promise<string> {
  const refreshToken = generateRandomHex256()
  const now = Math.floor(Date.now() / 1000)
  await oauthRefreshTokenRepository.insertOAuthRefreshToken(db, {
    token_hash: await sha256Hex(refreshToken),
    family_id: crypto.randomUUID(),
    client_id: clientId,
    idle_expires_at: now + REFRESH_TOKEN_IDLE_TTL_SECONDS,
    absolute_expires_at: now + REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS,
  })
  return refreshToken
}

/**
 * `grant_type` 分派：先讀 `grant_type`，再交給各自的流程。不收 client_secret，
 * 各流程不需要的多餘參數一律忽略。
 */
export async function exchangeToken(
  db: D1Database,
  request: Request,
  secret: string,
  resourceUrl: string,
): Promise<TokenResult> {
  const form = await parseOAuthForm(request)

  const grantType = requireOAuthParam(form.get('grant_type'))
  if (grantType === 'authorization_code') {
    return await exchangeAuthorizationCode(db, form, secret, resourceUrl)
  }
  if (grantType === 'refresh_token') {
    return await exchangeRefreshToken(db, form, secret, resourceUrl)
  }
  throw new ApiError(400, 'unsupported_grant_type')
}

async function exchangeAuthorizationCode(
  db: D1Database,
  form: FormData,
  secret: string,
  resourceUrl: string,
): Promise<TokenResult> {
  // 四個參數都要有帶（grant_type 已在分派時檢查）。resource 以外多送的參數一律忽略。
  const code = requireOAuthParam(form.get('code'))
  const redirectUri = requireOAuthParam(form.get('redirect_uri'))
  const clientId = requireOAuthParam(form.get('client_id'))
  const codeVerifier = requireOAuthParam(form.get('code_verifier'))

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

  // 先寫入 refresh token，再簽發 access token。
  const refreshToken = await issueInitialRefreshToken(db, clientId)
  return {
    access_token: await signOAuthAccessToken(secret, clientId, resourceUrl),
    token_type: 'Bearer',
    expires_in: OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
  }
}

/**
 * 用 refresh token 換新的 access token 與 refresh token，每次都輪替。所有 refresh
 * 失敗一律回 `invalid_grant`，不細分原因，避免洩漏 token 的狀態。
 */
async function exchangeRefreshToken(
  db: D1Database,
  form: FormData,
  secret: string,
  resourceUrl: string,
): Promise<TokenResult> {
  // A. 參數檢查
  const refreshToken = requireOAuthParam(form.get('refresh_token'))
  const clientId = requireOAuthParam(form.get('client_id'))
  const resource = form.get('resource')
  if (resource !== null && resource !== resourceUrl) {
    throw new ApiError(400, 'invalid_target')
  }

  // B. 取用 token
  const tokenHash = await sha256Hex(refreshToken)
  const now = Math.floor(Date.now() / 1000)
  const used = await oauthRefreshTokenRepository.markOAuthRefreshTokenUsed(db, tokenHash, now)
  if (!used) {
    // 沒有回傳：token 不存在，或已被使用。查到代表是重用，作廢整條鏈；
    // 查不到則沒有可作廢的鏈（從未存在，或所屬的鏈已被作廢或清理）。
    const familyId = await oauthRefreshTokenRepository.findOAuthRefreshTokenFamilyId(db, tokenHash)
    if (familyId !== null) {
      await oauthRefreshTokenRepository.deleteOAuthRefreshTokenFamily(db, familyId)
    }
    throw new ApiError(400, 'invalid_grant')
  }

  // C. 驗證：任何一項不通過，這條鏈都作廢。
  // 正常流程下 idle_expires_at 不會超過 absolute_expires_at，步驟 7 理論上不會單獨
  // 觸發，仍保留當防禦性檢查。
  if (
    used.client_id !== clientId ||
    used.idle_expires_at <= now ||
    used.absolute_expires_at <= now
  ) {
    await oauthRefreshTokenRepository.deleteOAuthRefreshTokenFamily(db, used.family_id)
    throw new ApiError(400, 'invalid_grant')
  }

  // D. 輪替：新 token 的閒置到期不超過絕對上限。
  const newRefreshToken = generateRandomHex256()
  const rotated = await oauthRefreshTokenRepository.rotateOAuthRefreshToken(
    db,
    tokenHash,
    await sha256Hex(newRefreshToken),
    Math.min(now + REFRESH_TOKEN_IDLE_TTL_SECONDS, used.absolute_expires_at),
  )
  if (!rotated) {
    // 舊列已被並行請求作廢而消失，鏈已不存在。
    throw new ApiError(400, 'invalid_grant')
  }

  // E. 簽發與收尾
  const accessToken = await signOAuthAccessToken(secret, clientId, resourceUrl)

  // 清理失敗只記 log，不影響已成功的 refresh。
  try {
    await oauthRefreshTokenRepository.deleteExpiredOAuthRefreshTokens(db, now)
  } catch (err) {
    console.error('[token] 清理過期 refresh token 失敗', err)
  }

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: newRefreshToken,
  }
}
