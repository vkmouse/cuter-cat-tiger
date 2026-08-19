import type { Env } from '../../types.js'
import * as recordService from '../../services/recordService.js'
import { parseIdParam, withErrorHandling } from '../../utils/validation.js'

export const onRequestPatch: PagesFunction<Env> = withErrorHandling(async (context) => {
  const id = parseIdParam(context.params.id as string | undefined)
  const record = await recordService.updateRecord(context.env.DB, id, context.request)
  return Response.json(record)
})

export const onRequestDelete: PagesFunction<Env> = withErrorHandling(async (context) => {
  const id = parseIdParam(context.params.id as string | undefined)
  await recordService.removeRecord(context.env.DB, id)
  return new Response(null, { status: 204 })
})
