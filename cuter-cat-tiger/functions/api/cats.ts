import type { Env } from '../types.js'
import * as catService from '../services/catService.js'
import { errorResponse } from '../utils/validation.js'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const cats = await catService.listCats(context.env.DB)
    return Response.json(cats)
  } catch (err) {
    return errorResponse(err)
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const cat = await catService.createCat(context.env.DB, context.request)
    return Response.json(cat, { status: 201 })
  } catch (err) {
    return errorResponse(err)
  }
}
