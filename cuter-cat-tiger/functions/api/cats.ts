import type { Env } from '../types.js'
import * as catService from '../services/catService.js'
import { withErrorHandling } from '../utils/validation.js'

export const onRequestGet: PagesFunction<Env> = withErrorHandling(async (context) => {
  const cats = await catService.listCats(context.env.DB)
  return Response.json(cats)
})

export const onRequestPost: PagesFunction<Env> = withErrorHandling(async (context) => {
  const cat = await catService.createCat(context.env.DB, context.request)
  return Response.json(cat, { status: 201 })
})
