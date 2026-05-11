// Paginated list of visits across all tenant instructions.
// Filters: instructionId, entrySource, isReturning, dateFrom, dateTo, days.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'
import dayjs from 'dayjs'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  days: z.coerce.number().int().min(1).max(365).default(30),
  instructionId: z.string().optional(),
  entrySource: z.string().optional(),
  country: z.string().optional(),
  deviceType: z.string().optional(),
  isReturning: z.enum(['true', 'false']).optional(),
  includeBots: z.enum(['true', 'false']).optional()
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const q = querySchema.parse(getQuery(event))

  const since = dayjs().subtract(q.days, 'day').toDate()
  const where = {
    startedAt: { gte: since },
    instruction: { tenantId: tenant.id },
    ...(q.includeBots === 'true' ? {} : { isBot: false }),
    ...(q.instructionId ? { instructionId: q.instructionId } : {}),
    ...(q.entrySource ? { entrySource: q.entrySource } : {}),
    ...(q.country ? { country: q.country } : {}),
    ...(q.deviceType ? { deviceType: q.deviceType } : {}),
    ...(q.isReturning === 'true' ? { isReturning: true } : {}),
    ...(q.isReturning === 'false' ? { isReturning: false } : {})
  }

  const [total, items] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        totalDurationMs: true,
        maxScrollDepth: true,
        pageViews: true,
        country: true,
        city: true,
        deviceType: true,
        os: true,
        browser: true,
        entrySource: true,
        utmSource: true,
        isReturning: true,
        isBot: true,
        instruction: { select: { id: true, slug: true, title: true } },
        _count: { select: { goals: true } }
      }
    })
  ])

  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    items
  }
})
