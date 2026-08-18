// 統一包 fetch，錯誤時解析後端回傳的 { error } 訊息，統一拋成 Error 給呼叫端 catch。

import type {
  Cat,
  CatRecord,
  CreateCatPayload,
  CreateRecordPayload,
  DailyStat,
  UpdateCatPayload,
  UpdateRecordPayload,
} from '../types'

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    // 後端錯誤回傳格式統一為 { error: string }（backend-spec.md 第 5 節）
    let message = fallbackMessage
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // 回應不是 JSON 或沒有 body，維持預設訊息
    }
    throw new Error(`${message}（${res.status}）`)
  }
  // 204 No Content 沒有 body 可解析
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

// ---- 貓咪管理 ----

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

// ---- 紀錄管理 ----

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

// ---- 統計 ----

export async function fetchDailyStats(date: string): Promise<DailyStat[]> {
  const params = new URLSearchParams({ date })
  const res = await fetch(`/api/stats/daily?${params.toString()}`)
  return parseJsonOrThrow<DailyStat[]>(res, '無法取得當日統計')
}
