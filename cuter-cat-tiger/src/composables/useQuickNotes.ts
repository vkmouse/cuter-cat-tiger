import type { RecordType } from '../types'

/** 快速備註僅存在瀏覽器端，不寫入 API 或資料庫。 */

const STORAGE_PREFIX = 'cuterCatTiger:quickNotes:'
const MAX_ENTRIES_STORED = 50
const MIN_COUNT_TO_SHOW = 2
const MAX_TAGS_SHOWN = 8

interface QuickNoteEntry {
  text: string
  count: number
  lastUsedAt: number
}

function storageKey(type: RecordType) {
  return `${STORAGE_PREFIX}${type}`
}

function readEntries(type: RecordType): QuickNoteEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(type))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is QuickNoteEntry =>
        !!e && typeof e.text === 'string' && typeof e.count === 'number' && typeof e.lastUsedAt === 'number',
    )
  } catch {
    // 儲存失敗不應影響主要記錄功能。
    return []
  }
}

function writeEntries(type: RecordType, entries: QuickNoteEntry[]) {
  try {
    localStorage.setItem(storageKey(type), JSON.stringify(entries))
  } catch {
  }
}

export function recordNoteUsage(type: RecordType, note: string | null | undefined) {
  const text = (note ?? '').trim()
  if (!text) return

  const entries = readEntries(type)
  const existing = entries.find((e) => e.text === text)
  if (existing) {
    existing.count += 1
    existing.lastUsedAt = Date.now()
  } else {
    entries.push({ text, count: 1, lastUsedAt: Date.now() })
  }

  entries.sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
  writeEntries(type, entries.slice(0, MAX_ENTRIES_STORED))
}

export function getQuickNotes(type: RecordType): string[] {
  const entries = readEntries(type)
  return entries
    .filter((e) => e.count >= MIN_COUNT_TO_SHOW)
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_TAGS_SHOWN)
    .map((e) => e.text)
}
