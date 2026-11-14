import { getAccessHeaders, refreshAccessToken } from './auth'

/**
 * 所有會呼叫 /api/* 功能性端點的地方都必須透過這支函式呼叫（見 01 UI
 * 規格書第 6 節）：統一附上 Client ID / Client Secret 標頭（供外部存取
 * 控管服務核驗）與短效存取憑證 Cookie（`credentials: 'include'`），並在
 * 短效存取憑證過期而被拒絕（401）時，自動嘗試換發一次新的短效存取憑證，
 * 成功的話把原本的請求重打一次；換發失敗則原封不動回傳這次的失敗回應，
 * 交由既有的錯誤處理方式呈現，不需要額外調整。
 * `/api/auth/login`、`/api/auth/refresh` 本身不透過這支函式呼叫。
 */
export async function authorizedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const withAuth = (): RequestInit => ({
    ...init,
    credentials: 'include',
    headers: { ...getAccessHeaders(), ...(init.headers ?? {}) },
  })

  let res = await fetch(input, withAuth())
  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      res = await fetch(input, withAuth())
    }
  }
  return res
}
