import type { Env } from '../types.js'
import * as voiceIntentService from '../services/voiceIntentService.js'
import { withErrorHandling } from '../utils/validation.js'

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const result = await voiceIntentService.resolveVoiceIntent(context.env, context.request)
  return Response.json(result)
})
