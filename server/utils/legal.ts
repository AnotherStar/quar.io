import { createHash } from 'node:crypto'
import { prisma } from './prisma'

export const PLATFORM_NAME = 'quar.io'

export interface PublicLegalProfile {
  configured: boolean
  operatorName: string
  legalName: string | null
  inn: string | null
  ogrn: string | null
  address: string | null
  pdEmail: string | null
  policyUrl: string | null
  platformName: string
}

export function hashLegalText(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

export function normalizeLegalProfile(tenant: {
  name: string
  legalProfile?: {
    legalName: string | null
    inn: string | null
    ogrn: string | null
    address: string | null
    pdEmail: string | null
    policyUrl: string | null
  } | null
}): PublicLegalProfile {
  const p = tenant.legalProfile
  const legalName = p?.legalName?.trim() || null
  return {
    configured: Boolean(legalName && p?.pdEmail),
    operatorName: legalName ?? tenant.name,
    legalName,
    inn: p?.inn ?? null,
    ogrn: p?.ogrn ?? null,
    address: p?.address ?? null,
    pdEmail: p?.pdEmail ?? null,
    policyUrl: p?.policyUrl ?? null,
    platformName: PLATFORM_NAME
  }
}

export function buildDefaultLegalDocuments(tenantName: string, profile: PublicLegalProfile) {
  const operator = profile.operatorName
  const contacts = profile.pdEmail ? `Email для обращений по персональным данным: ${profile.pdEmail}.` : 'Email для обращений по персональным данным не настроен.'
  const requisites = [
    profile.legalName,
    profile.inn ? `ИНН ${profile.inn}` : null,
    profile.ogrn ? `ОГРН/ОГРНИП ${profile.ogrn}` : null,
    profile.address
  ].filter(Boolean).join(', ')

  const pdConsent = [
    'Согласие на обработку персональных данных',
    '',
    `Я даю согласие оператору персональных данных ${operator}${requisites ? ` (${requisites})` : ''} на обработку персональных данных, которые я указываю в форме на QR-странице товара.`,
    'Цель обработки: обработка обращения, регистрация гарантии, обратная связь по товару или иной сценарий, прямо указанный в форме.',
    'Состав данных зависит от формы и может включать имя, телефон, email, Telegram, серийный номер, дату покупки, текст обращения, технические данные отправки формы, URL страницы, идентификатор инструкции и session id.',
    `Техническая платформа: ${PLATFORM_NAME}, действующая по поручению оператора для приема, хранения и передачи данных оператору.`,
    'Согласие действует до достижения цели обработки или до отзыва, если иное не требуется по закону.',
    contacts
  ].join('\n')

  const marketingConsent = [
    'Согласие на получение рекламных сообщений',
    '',
    `Я даю ${operator} предварительное согласие на получение рекламных и информационных сообщений о товарах, акциях и предложениях по указанным мной контактным данным.`,
    'Согласие не является обязательным для получения инструкции, ответа по обращению, поддержки или регистрации гарантии.',
    'Я могу отказаться от рекламных сообщений через ссылку/команду отказа в сообщении или обращением по контактам оператора.',
    contacts
  ].join('\n')

  const cookieNotice = [
    'Уведомление об аналитике и cookie',
    '',
    `${PLATFORM_NAME} использует технический viewer id и события просмотра публичной инструкции, чтобы ${tenantName} видел просмотры, глубину чтения, обратную связь по блокам и ошибки в инструкции.`,
    'Аналитика не должна содержать телефон, email или текст обращений. Данные используются для улучшения инструкции и работы сервиса.'
  ].join('\n')

  return [
    { type: 'PERSONAL_DATA_CONSENT' as const, title: 'Согласие на обработку персональных данных', content: pdConsent },
    { type: 'MARKETING_CONSENT' as const, title: 'Согласие на получение рекламных сообщений', content: marketingConsent },
    { type: 'COOKIE_NOTICE' as const, title: 'Уведомление об аналитике и cookie', content: cookieNotice }
  ].map((doc) => ({ ...doc, textHash: hashLegalText(doc.content) }))
}

export async function getPublicLegalPayload(tenantId: string, tenantName: string, legalProfile: PublicLegalProfile) {
  const rows = await prisma.legalDocumentVersion.findMany({
    where: { tenantId, archivedAt: null },
    orderBy: { publishedAt: 'desc' }
  })

  const byType = new Map<string, { id: string; type: string; title: string; content: string; textHash: string; publishedAt: Date }>()
  for (const row of rows) {
    if (!byType.has(row.type)) {
      byType.set(row.type, {
        id: row.id,
        type: row.type,
        title: row.title,
        content: row.content,
        textHash: row.textHash,
        publishedAt: row.publishedAt
      })
    }
  }

  for (const doc of buildDefaultLegalDocuments(tenantName, legalProfile)) {
    if (!byType.has(doc.type)) {
      byType.set(doc.type, {
        id: `quar-default-${doc.type.toLowerCase()}-2026-05-10`,
        type: doc.type,
        title: doc.title,
        content: doc.content,
        textHash: doc.textHash,
        publishedAt: new Date('2026-05-10T00:00:00.000Z')
      })
    }
  }

  return {
    operator: legalProfile,
    documents: Object.fromEntries(byType)
  }
}
