/**
 * /authorize 畫面呼叫 `POST /api/authorize` 的流程（見 OAuth Server 規格書第 10 節）。
 *
 * /authorize 畫面由 AccessGate 把關，通過後憑證已存在 localStorage，
 * 這裡跟其他 API 一樣透過共用的 authorizedFetch 呼叫。
 */
import { authorizedFetch } from './http'

const AUTHORIZE_PARAM_NAMES = [
  'response_type',
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
  'resource',
] as const

/** `/authorize?...` Query String 裡的參數，有帶才會有該欄位。 */
export type AuthorizeParams = Partial<Record<(typeof AUTHORIZE_PARAM_NAMES)[number], string>>

/**
 * - 'redirect'：授權成功，`url` 是帶著 code（以及有帶才有的 state）的回呼網址
 * - 'rejected'：後端驗證失敗（400），`error` 是標準錯誤碼，不導回第三方網站
 * - 'failed'：其他所有情形（連線中斷、非預期的回應，包含剛通過 AccessGate 卻被
 *   外部存取控管服務攔下的 403）
 */
export type AuthorizeResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'rejected'; error: string }
  | { kind: 'failed' }

/** 取出 Query String 裡的授權參數，沒有帶的不放進結果，由後端判定缺漏。 */
export function readAuthorizeParams(search: string): AuthorizeParams {
  const query = new URLSearchParams(search)
  const params: AuthorizeParams = {}
  for (const name of AUTHORIZE_PARAM_NAMES) {
    const value = query.get(name)
    if (value !== null) {
      params[name] = value
    }
  }
  return params
}

async function readErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    return body?.error ?? ''
  } catch {
    return ''
  }
}

/** 呼叫授權端點，標頭與 Cookie 由 authorizedFetch 統一附上。 */
export async function requestAuthorization(params: AuthorizeParams): Promise<AuthorizeResult> {
  let response: Response
  try {
    response = await authorizedFetch('/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch {
    return { kind: 'failed' }
  }

  // 後端自己的驗證失敗一律是 400。
  if (response.status === 400) {
    return { kind: 'rejected', error: await readErrorCode(response) }
  }
  if (!response.ok) {
    return { kind: 'failed' }
  }

  try {
    const body = (await response.json()) as { code: string; state?: string }
    // redirect_uri 已經由後端比對過與註冊的網址完全一致，這裡只負責把 code 接上去。
    const url = new URL(params.redirect_uri ?? '')
    url.searchParams.append('code', body.code)
    if (body.state !== undefined) {
      url.searchParams.append('state', body.state)
    }
    return { kind: 'redirect', url: url.toString() }
  } catch {
    return { kind: 'failed' }
  }
}
