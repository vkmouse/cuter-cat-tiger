import type { Env } from '../types.js'
import * as feedingSessionService from '../services/feedingSessionService.js'
import { withErrorHandling } from '../utils/validation.js'

export const onRequestGet: PagesFunction<Env> = withErrorHandling(async (context) => {
  const url = new URL(context.request.url)
  const sessions = await feedingSessionService.listFeedingSessions(
    context.env.DB,
    url.searchParams.get('catId'),
  )
  return Response.json(sessions)
})

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const session = await feedingSessionService.createFeedingSession(context.env.DB, context.request)
  return Response.json(session, { status: 201 })
})
