import type { Env } from '../types'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env

  const row = await DB.prepare(`SELECT datetime('now') AS now`).first<{ now: string }>()

  if (!row) {
    return Response.json({ error: 'D1 query returned no result' }, { status: 500 })
  }

  return Response.json({ now: row.now })
}
