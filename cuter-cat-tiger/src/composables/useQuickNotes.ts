import type { RecordType } from '../types'

// 純前端功能：把使用者之前打過的備註依「記錄類型」統計次數，
// 存在 localStorage，讓常用的文字能變成快速選取的 tag。
// 不動 API / DB，完全在瀏覽器端運作。

const STORAGE_PREFIX = 'cuterCatTiger:quickNotes:'
// 單一 type 最多保留幾筆歷史紀錄（防止 localStorage 無限增長）
const MAX_ENTRIES_STORED = 50
// 同一段文字要用滿幾次才會被列為「快速備註」，避免打錯字或只打一次的內容也跑出來
const MIN_COUNT_TO_SHOW = 2
// 最多同時顯示幾個快速備註 tag
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
    // localStorage 不可用或資料格式異常時，當作沒有歷史紀錄，不影響主要功能
    return []
  }
}

function writeEntries(type: RecordType, entries: QuickNoteEntry[]) {
  try {
    localStorage.setItem(storageKey(type), JSON.stringify(entries))
  } catch {
    // 例如無痕模式容量已滿，寫入失敗就放棄，不拋錯
  }
}

/**
 * 紀錄一次備註使用次數。應在使用者「成功儲存」一筆有備註的紀錄之後呼叫。
 */
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

/**
 * 取得該記錄類型目前可顯示的快速備註文字清單（已依次數/新舊排序、篩選門檻、限制數量）。
 */
export function getQuickNotes(type: RecordType): string[] {
  const entries = readEntries(type)
  return entries
    .filter((e) => e.count >= MIN_COUNT_TO_SHOW)
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_TAGS_SHOWN)
    .map((e) => e.text)
}
