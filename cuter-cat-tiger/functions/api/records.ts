import type { Env } from '../types.js'
import * as recordService from '../services/recordService.js'
import { withErrorHandling } from '../utils/validation.js'

export const onRequestGet: PagesFunction<Env> = withErrorHandling(async (context) => {
  const url = new URL(context.request.url)
  const records = await recordService.listRecords(
    context.env.DB,
    url.searchParams.get('catId'),
    url.searchParams.get('date'),
  )
  return Response.json(records)
})

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const record = await recordService.createRecord(context.env.DB, context.request)
  return Response.json(record, { status: 201 })
})
