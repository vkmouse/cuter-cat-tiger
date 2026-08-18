/**
 * D1 的 datetime('now') 回傳 SQLite 格式 'YYYY-MM-DD HH:MM:SS'（UTC，無時區標記），
 * 但對外 API 契約（shared-spec.md 第 4 節）要求一律是 ISO 字串。
 * 這裡統一轉換，避免每個 service 各自處理。
 */
export function sqliteUtcToIso(value: string): string {
  const withT = value.includes('T') ? value : value.replace(' ', 'T')
  const withZone = withT.endsWith('Z') ? withT : `${withT}Z`
  return new Date(withZone).toISOString()
}
