import type { Env } from '../../types.js'
import * as feedingSessionService from '../../services/feedingSessionService.js'
import { parseIdParam, withErrorHandling } from '../../utils/validation.js'

export const onRequestPatch: PagesFunction<Env> = withErrorHandling(async (context) => {
  const id = parseIdParam(context.params.id as string | undefined)
  const session = await feedingSessionService.updateFeedingSession(
    context.env.DB,
    id,
    context.request,
  )
  return Response.json(session)
})

export const onRequestDelete: PagesFunction<Env> = withErrorHandling(async (context) => {
  const id = parseIdParam(context.params.id as string | undefined)
  await feedingSessionService.removeFeedingSession(context.env.DB, id)
  return new Response(null, { status: 204 })
})
