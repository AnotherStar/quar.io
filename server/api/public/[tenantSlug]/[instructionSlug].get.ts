import { loadPublicByPath } from '~~/server/utils/publicResolve'

export default defineEventHandler(async (event) => {
  const tenantSlug = getRouterParam(event, 'tenantSlug')!
  const instructionSlug = getRouterParam(event, 'instructionSlug')!
  const data = await loadPublicByPath(tenantSlug, instructionSlug)
  if (!data) throw createError({ statusCode: 404 })
  return data
})
