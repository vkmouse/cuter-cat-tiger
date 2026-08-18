import type { Env } from '../types.js'
import * as recordService from '../services/recordService.js'
import { errorResponse } from '../utils/validation.js'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url)
    const records = await recordService.listRecords(
      context.env.DB,
      url.searchParams.get('catId'),
      url.searchParams.get('date'),
    )
    return Response.json(records)
  } catch (err) {
    return errorResponse(err)
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const record = await recordService.createRecord(context.env.DB, context.request)
    return Response.json(record, { status: 201 })
  } catch (err) {
    return errorResponse(err)
  }
}
