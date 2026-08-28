/**
 * Cloudflare Access（Service Token）前端驗證流程。
 *
 * 這個模組刻意保持獨立（不依賴 src/types.ts、不依賴其他 service），方便
 * 未來需要同一套「輸入 Client ID / Secret 換取存取」流程時，可以直接把
 * 這個檔案跟 ../components/access/AccessGate.vue 一起複製到其他系統使用。
 */

const CLIENT_ID_KEY = 'CF_ACCESS_CLIENT_ID'
const CLIENT_SECRET_KEY = 'CF_ACCESS_CLIENT_SECRET'

export interface AccessCredentials {
  clientId: string
  clientSecret: string
}

/**
 * 依 API 規格書第 4.3 節的依據判讀出的三種結果：
 * - 'valid'：收到本系統的成功回應
 * - 'invalid'：請求在外部存取控管服務層級就被攔截（固定以 403 呈現），
 *   代表這組 Client ID / Client Secret 長效憑證本身無效
 * - 'error'：其他所有情形（連線逾時／中斷，或收到本系統的失敗回應，
 *   例如系統缺少必要設定）
 */
export type LoginResult = 'valid' | 'invalid' | 'error'

/** 從 localStorage 讀取憑證，兩個值都存在才視為有效，任一缺漏視為未設定。 */
export function getStoredCredentials(): AccessCredentials | null {
  const clientId = localStorage.getItem(CLIENT_ID_KEY)
  const clientSecret = localStorage.getItem(CLIENT_SECRET_KEY)
  if (!clientId || !clientSecret) {
    return null
  }
  return { clientId, clientSecret }
}

export function storeCredentials(credentials: AccessCredentials): void {
  localStorage.setItem(CLIENT_ID_KEY, credentials.clientId)
  localStorage.setItem(CLIENT_SECRET_KEY, credentials.clientSecret)
}

export function clearCredentials(): void {
  localStorage.removeItem(CLIENT_ID_KEY)
  localStorage.removeItem(CLIENT_SECRET_KEY)
}

/** 供 authorizedFetch 組 header 用；沒有存值時回傳空物件，讓請求照樣送出（會被 middleware 擋在 401）。 */
export function getAccessHeaders(credentials?: AccessCredentials): HeadersInit {
  const creds = credentials ?? getStoredCredentials()
  if (!creds) {
    return {}
  }
  return {
    'CF-Access-Client-Id': creds.clientId,
    'CF-Access-Client-Secret': creds.clientSecret,
  }
}

/**
 * 呼叫「取得存取權」端點。
 *
 * `credentials` 可選：不帶的話讀 localStorage 裡已存的值（給 AccessGate
 * 掛載時「用舊憑證重新確認一次」的情境用）；帶的話直接用傳入的值打這次
 * 請求，不會去讀/寫 localStorage——留給「使用者剛輸入、還沒驗證過」的
 * 情境用，讓呼叫端可以做到「驗證成功才記住」，不會把還沒驗證過、可能
 * 打錯的憑證提早留在瀏覽器裡。
 *
 * 成功時，短效／長效兩種存取憑證已經由伺服器透過 Set-Cookie 寫入瀏覽器
 * （`credentials: 'include'`），呼叫端不需要自己保管這兩個值。
 */
export async function login(credentials?: AccessCredentials): Promise<LoginResult> {
  const creds = credentials ?? getStoredCredentials()
  if (!creds) {
    return 'invalid'
  }

  let response: Response
  try {
    response = await fetch('/api/auth/login', {
      headers: getAccessHeaders(creds),
      credentials: 'include',
    })
  } catch {
    // 連線逾時／中斷：根本沒有收到任何回應，屬於非憑證因素錯誤。
    return 'error'
  }

  if (response.status === 403) {
    // 外部存取控管服務攔截時的固定狀態碼，代表請求根本沒有進入本系統。
    return 'invalid'
  }
  if (response.ok) {
    return 'valid'
  }
  // 進入了本系統，但本系統自己判定失敗（例如缺少必要設定）。
  return 'error'
}

/**
 * 用長效存取憑證（refresh_token Cookie）換一份新的短效存取憑證。
 * 這個端點的結果只需要成功／失敗兩種，不像 login() 需要分三種
 * （見 API 規格書第 4.3 節最後一段）。
 */
export async function refreshAccessToken(): Promise<boolean> {
  const credentials = getStoredCredentials()
  if (!credentials) {
    return false
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: getAccessHeaders(credentials),
      credentials: 'include',
    })
    return response.status === 200
  } catch {
    return false
  }
}
