import type { Env } from '../../types.js'
import * as statsService from '../../services/statsService.js'
import { errorResponse } from '../../utils/validation.js'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url)
    const stats = await statsService.getDailyStats(context.env.DB, url.searchParams.get('date'))
    return Response.json(stats)
  } catch (err) {
    return errorResponse(err)
  }
}
