import { z } from 'zod'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { buildDefaultLegalDocuments, hashLegalText, normalizeLegalProfile } from '~~/server/utils/legal'

const emptyToNull = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const optionalText = (max: number, label: string) =>
  z.preprocess(
    emptyToNull,
    z.string({ invalid_type_error: `${label}: ожидается строка` })
      .max(max, `${label}: слишком длинное значение`)
      .nullable()
      .optional()
  )

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string({ invalid_type_error: 'Email для обращений по персональным данным должен быть строкой' })
    .email('Укажите корректный email для обращений по персональным данным')
    .max(160, 'Email для обращений по персональным данным слишком длинный')
    .nullable()
    .optional()
)

const optionalUrl = z.preprocess(
  emptyToNull,
  z.string({ invalid_type_error: 'Ссылка на политику обработки персональных данных должна быть строкой' })
    .url('Укажите корректную ссылку на политику обработки персональных данных, например https://company.ru/privacy')
    .max(2048, 'Ссылка на политику обработки персональных данных слишком длинная')
    .nullable()
    .optional()
)

const schema = z.object({
  legalName: optionalText(240, 'Полное наименование'),
  inn: optionalText(20, 'ИНН'),
  ogrn: optionalText(20, 'ОГРН / ОГРНИП'),
  address: optionalText(500, 'Юридический адрес'),
  pdEmail: optionalEmail,
  policyUrl: optionalUrl,
  publishDefaultDocuments: z.boolean().optional()
})

function clean(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'OWNER' })
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Проверьте поля юридического профиля'
    })
  }
  const body = parsed.data

  const saved = await prisma.$transaction(async (tx) => {
    const profile = await tx.tenantLegalProfile.upsert({
      where: { tenantId: tenant.id },
      update: {
        legalName: clean(body.legalName),
        inn: clean(body.inn),
        ogrn: clean(body.ogrn),
        address: clean(body.address),
        pdEmail: clean(body.pdEmail),
        policyUrl: clean(body.policyUrl)
      },
      create: {
        tenantId: tenant.id,
        legalName: clean(body.legalName),
        inn: clean(body.inn),
        ogrn: clean(body.ogrn),
        address: clean(body.address),
        pdEmail: clean(body.pdEmail),
        policyUrl: clean(body.policyUrl)
      }
    })

    if (body.publishDefaultDocuments) {
      const publicProfile = normalizeLegalProfile({ name: tenant.name, legalProfile: profile })
      const docs = buildDefaultLegalDocuments(tenant.name, publicProfile)
      for (const doc of docs) {
        await tx.legalDocumentVersion.updateMany({
          where: { tenantId: tenant.id, type: doc.type, archivedAt: null },
          data: { archivedAt: new Date() }
        })
        await tx.legalDocumentVersion.create({
          data: {
            tenantId: tenant.id,
            type: doc.type,
            title: doc.title,
            content: doc.content,
            textHash: hashLegalText(doc.content)
          }
        })
      }
    }

    return profile
  })

  const documents = await prisma.legalDocumentVersion.findMany({
    where: { tenantId: tenant.id, archivedAt: null },
    orderBy: [{ type: 'asc' }, { publishedAt: 'desc' }]
  })

  return { profile: saved, documents }
})
