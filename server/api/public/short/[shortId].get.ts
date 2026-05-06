import { loadPublicByShortId } from '~~/server/utils/publicResolve'

export default defineEventHandler(async (event) => {
  const shortId = getRouterParam(event, 'shortId')!
  const data = await loadPublicByShortId(shortId)
  if (!data) throw createError({ statusCode: 404 })
  return data
})
