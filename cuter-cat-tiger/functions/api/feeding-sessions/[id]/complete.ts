import type { Env } from '../../../types.js'
import * as feedingSessionService from '../../../services/feedingSessionService.js'
import { parseIdParam, withErrorHandling } from '../../../utils/validation.js'

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const id = parseIdParam(context.params.id as string | undefined)
  const record = await feedingSessionService.completeFeedingSession(
    context.env.DB,
    id,
    context.request,
  )
  return Response.json(record, { status: 201 })
})
