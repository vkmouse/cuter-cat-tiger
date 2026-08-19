import type { Env } from '../../types.js'
import * as catService from '../../services/catService.js'
import { parseIdParam, withErrorHandling } from '../../utils/validation.js'

export const onRequestPatch: PagesFunction<Env> = withErrorHandling(async (context) => {
  const id = parseIdParam(context.params.id as string | undefined)
  const cat = await catService.renameCat(context.env.DB, id, context.request)
  return Response.json(cat)
})

export const onRequestDelete: PagesFunction<Env> = withErrorHandling(async (context) => {
  const id = parseIdParam(context.params.id as string | undefined)
  await catService.removeCat(context.env.DB, id)
  return new Response(null, { status: 204 })
})
