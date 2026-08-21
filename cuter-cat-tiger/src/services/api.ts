
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
  const res = await fetch('/api/cats')
  return parseJsonOrThrow<Cat[]>(res, '無法取得貓咪列表')
}

export async function createCat(payload: CreateCatPayload): Promise<Cat> {
  const res = await fetch('/api/cats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<Cat>(res, '新增貓咪失敗')
}

export async function updateCat(id: number, payload: UpdateCatPayload): Promise<Cat> {
  const res = await fetch(`/api/cats/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<Cat>(res, '修改貓咪失敗')
}

export async function deleteCat(id: number): Promise<void> {
  const res = await fetch(`/api/cats/${id}`, { method: 'DELETE' })
  return parseJsonOrThrow<void>(res, '刪除貓咪失敗')
}


export async function fetchRecords(catId: number, date: string): Promise<CatRecord[]> {
  const params = new URLSearchParams({ catId: String(catId), date })
  const res = await fetch(`/api/records?${params.toString()}`)
  return parseJsonOrThrow<CatRecord[]>(res, '無法取得紀錄列表')
}

export async function createRecord(payload: CreateRecordPayload): Promise<CatRecord> {
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<CatRecord>(res, '新增紀錄失敗')
}

export async function updateRecord(id: number, payload: UpdateRecordPayload): Promise<CatRecord> {
  const res = await fetch(`/api/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<CatRecord>(res, '修改紀錄失敗')
}

export async function deleteRecord(id: number): Promise<void> {
  const res = await fetch(`/api/records/${id}`, { method: 'DELETE' })
  return parseJsonOrThrow<void>(res, '刪除紀錄失敗')
}


export async function fetchDailyStats(date: string): Promise<DailyStat[]> {
  const params = new URLSearchParams({ date })
  const res = await fetch(`/api/stats/daily?${params.toString()}`)
  return parseJsonOrThrow<DailyStat[]>(res, '無法取得當日統計')
}


export async function fetchFeedingSessions(catId: number): Promise<FeedingSession[]> {
  const params = new URLSearchParams({ catId: String(catId) })
  const res = await fetch(`/api/feeding-sessions?${params.toString()}`)
  return parseJsonOrThrow<FeedingSession[]>(res, '無法取得進行中的餵食')
}

export async function createFeedingSession(payload: CreateFeedingSessionPayload): Promise<FeedingSession> {
  const res = await fetch('/api/feeding-sessions', {
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
  const res = await fetch(`/api/feeding-sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<FeedingSession>(res, '修改給的量失敗')
}

export async function cancelFeedingSession(id: number): Promise<void> {
  const res = await fetch(`/api/feeding-sessions/${id}`, { method: 'DELETE' })
  return parseJsonOrThrow<void>(res, '取消餵食失敗')
}

export async function completeFeedingSession(
  id: number,
  payload: CompleteFeedingSessionPayload,
): Promise<CatRecord> {
  const res = await fetch(`/api/feeding-sessions/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow<CatRecord>(res, '完成量測失敗')
}
