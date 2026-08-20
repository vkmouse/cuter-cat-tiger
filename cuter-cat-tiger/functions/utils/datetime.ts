/** 將 D1/SQLite 的 UTC 時間轉成 API 使用的 ISO UTC 字串。 */
export function sqliteUtcToIso(value: string): string {
  const withT = value.includes('T') ? value : value.replace(' ', 'T')
  const withZone = withT.endsWith('Z') ? withT : `${withT}Z`
  return new Date(withZone).toISOString()
}
