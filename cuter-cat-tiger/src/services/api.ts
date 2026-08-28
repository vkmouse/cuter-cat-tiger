
import type {
  Cat,
  CatRecord,
  CompleteFeedingSessionPayload,
  CreateCatPayload,
  CreateFeedingSessionPayload,
  CreateRecordPayload,
  DailyStat,
  FeedingSession,
  UpdateCatPayload,
  UpdateFeedingSessionPayload,
  UpdateRecordPayload,
} from '../types'
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
async function authorizedFetch(input: string, init: RequestInit = {}): Promise<Response> {
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

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let message = fallbackMessage
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
    }
    throw new Error(`${message}（${res.status}）`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}


export async function fetchCats(): Promise<Cat[]> {
  const res = await authorizedFetch('/api/cats')
  return parseJsonOrThrow<Cat[]>(res, '無法取得貓咪列表')
}

export async function createCat(payload: CreateCatPayload): Promise<Cat> {
  const res = await authorizedFetch('/api/cats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<Cat>(res, '新增貓咪失敗')
}

export async function updateCat(id: number, payload: UpdateCatPayload): Promise<Cat> {
  const res = await authorizedFetch(`/api/cats/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<Cat>(res, '修改貓咪失敗')
}

export async function deleteCat(id: number): Promise<void> {
  const res = await authorizedFetch(`/api/cats/${id}`, { method: 'DELETE' })
  return parseJsonOrThrow<void>(res, '刪除貓咪失敗')
}


export async function fetchRecords(catId: number, date: string): Promise<CatRecord[]> {
  const params = new URLSearchParams({ catId: String(catId), date })
  const res = await authorizedFetch(`/api/records?${params.toString()}`)
  return parseJsonOrThrow<CatRecord[]>(res, '無法取得紀錄列表')
}

export async function createRecord(payload: CreateRecordPayload): Promise<CatRecord> {
  const res = await authorizedFetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<CatRecord>(res, '新增紀錄失敗')
}

export async function updateRecord(id: number, payload: UpdateRecordPayload): Promise<CatRecord> {
  const res = await authorizedFetch(`/api/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<CatRecord>(res, '修改紀錄失敗')
}

export async function deleteRecord(id: number): Promise<void> {
  const res = await authorizedFetch(`/api/records/${id}`, { method: 'DELETE' })
  return parseJsonOrThrow<void>(res, '刪除紀錄失敗')
}


export async function fetchDailyStats(date: string): Promise<DailyStat[]> {
  const params = new URLSearchParams({ date })
  const res = await authorizedFetch(`/api/stats/daily?${params.toString()}`)
  return parseJsonOrThrow<DailyStat[]>(res, '無法取得當日統計')
}


export async function fetchFeedingSessions(catId: number): Promise<FeedingSession[]> {
  const params = new URLSearchParams({ catId: String(catId) })
  const res = await authorizedFetch(`/api/feeding-sessions?${params.toString()}`)
  return parseJsonOrThrow<FeedingSession[]>(res, '無法取得進行中的餵食')
}

export async function createFeedingSession(payload: CreateFeedingSessionPayload): Promise<FeedingSession> {
  const res = await authorizedFetch('/api/feeding-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<FeedingSession>(res, '開始餵食失敗')
}

export async function updateFeedingSession(
  id: number,
  payload: UpdateFeedingSessionPayload,
): Promise<FeedingSession> {
  const res = await authorizedFetch(`/api/feeding-sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<FeedingSession>(res, '修改給的量失敗')
}

export async function cancelFeedingSession(id: number): Promise<void> {
  const res = await authorizedFetch(`/api/feeding-sessions/${id}`, { method: 'DELETE' })
  return parseJsonOrThrow<void>(res, '取消餵食失敗')
}

export async function completeFeedingSession(
  id: number,
  payload: CompleteFeedingSessionPayload,
): Promise<CatRecord> {
  const res = await authorizedFetch(`/api/feeding-sessions/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<CatRecord>(res, '完成量測失敗')
}
