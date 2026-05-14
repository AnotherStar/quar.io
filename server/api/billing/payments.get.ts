// История платежей tenant'а для раздела «Тариф» в настройках.
// Сортировка от свежих к старым, последние 50 записей — для админки этого
// достаточно, пагинация добавится когда появится реальный шлюз с большим
// объёмом транзакций.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)

  const payments = await prisma.payment.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      kind: true,
      amount: true,
      status: true,
      cardLast4: true,
      description: true,
      createdAt: true
    }
  })

  return { payments }
})
