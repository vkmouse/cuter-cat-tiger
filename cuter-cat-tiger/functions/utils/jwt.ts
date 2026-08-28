/**
 * 應用程式自己簽發/驗證的兩種 JWT（短效存取憑證 / 長效存取憑證）共用邏輯。
 *
 * 用 `jose`（Web Crypto，Workers 相容）做 HS256 簽章。這個系統沒有使用者
 * 概念，憑證內容刻意不包含任何身份資訊，只靠 payload 裡的 `type` 欄位
 * 區分兩種憑證，防止其中一種被冒充成另一種使用（見 API 規格書第 6 節）。
 */
import { jwtVerify, SignJWT } from 'jose'

export type AppTokenType = 'access' | 'refresh'

/** 短效存取憑證效期：8 小時。 */
export const ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60
/** 長效存取憑證效期：10 年，模擬「使用者幾乎不會感受到需要重新輸入」。 */
export const REFRESH_TOKEN_TTL_SECONDS = 10 * 365 * 24 * 60 * 60

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

async function signAppToken(secret: string, type: AppTokenType, ttlSeconds: number): Promise<string> {
  return await new SignJWT({ type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(encodeSecret(secret))
}

/** 簽發短效存取憑證（8 小時）。 */
export async function signAccessToken(secret: string): Promise<string> {
  return signAppToken(secret, 'access', ACCESS_TOKEN_TTL_SECONDS)
}

/** 簽發長效存取憑證（10 年）。 */
export async function signRefreshToken(secret: string): Promise<string> {
  return signAppToken(secret, 'refresh', REFRESH_TOKEN_TTL_SECONDS)
}

/**
 * 驗證憑證簽章、效期，並確認 payload 的 `type` 跟預期的一致（例如驗證
 * access_token cookie 時傳入 `expectedType: 'access'`，避免長效憑證被拿去
 * 冒充短效憑證使用，反之亦然）。任何原因的驗證失敗（簽章不符、格式不符、
 * 已過期、type 不符等）一律回傳 false，不細分失敗原因。
 */
export async function verifyAppToken(
  secret: string,
  token: string,
  expectedType: AppTokenType,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret))
    return payload.type === expectedType
  } catch {
    return false
  }
}
