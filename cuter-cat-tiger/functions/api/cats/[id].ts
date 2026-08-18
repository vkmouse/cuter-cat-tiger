import type { Env } from '../../types.js'
import * as catService from '../../services/catService.js'
import { errorResponse, parseIdParam } from '../../utils/validation.js'

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const id = parseIdParam(context.params.id as string | undefined)
    const cat = await catService.renameCat(context.env.DB, id, context.request)
    return Response.json(cat)
  } catch (err) {
    return errorResponse(err)
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = parseIdParam(context.params.id as string | undefined)
    await catService.removeCat(context.env.DB, id)
    return new Response(null, { status: 204 })
  } catch (err) {
    return errorResponse(err)
  }
}
