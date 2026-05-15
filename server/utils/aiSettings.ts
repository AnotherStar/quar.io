// Чтение и запись AI-конфигов из БД.
//
// Семантика: runtime никогда не использует дефолты из кода. Если у фичи
// нет активной версии в БД (или её value не проходит Zod) — getAiSetting
// кидает 503 с подсказкой «настройте через админку». Это сознательная
// строгость: лучше явный сбой, чем тихая работа на стартовых дефолтах
// разработчика.
//
// Внутри:
// - in-process кэш на 30с, чтобы хот-пас (generate-stream и т.п.) не делал
//   запрос в БД на каждую генерацию
// - все мутации (save/activate/reset из админки) инвалидируют кэш
import { prisma } from './prisma'
import {
  AI_FEATURE_CATALOG,
  AI_SETTING_KEYS,
  AI_SETTING_NOT_CONFIGURED,
  type AiSettingKey,
  type AiSettingValue,
  type AiFeatureMeta
} from '~~/shared/aiSettings'

const CACHE_TTL_MS = 30_000

type CacheEntry = { expires: number; value: unknown }
const cache = new Map<AiSettingKey, CacheEntry>()

function invalidate(key: AiSettingKey) {
  cache.delete(key)
}

function getFeature(key: AiSettingKey): AiFeatureMeta {
  const meta = AI_FEATURE_CATALOG[key]
  if (!meta) throw new Error(`Unknown AI setting key: ${key}`)
  return meta
}

function notConfigured(key: AiSettingKey, reason: string): never {
  // Шлём 503: с точки зрения клиента сервис временно недоступен, причина
  // административная. Code AI_SETTING_NOT_CONFIGURED помогает UI/логам
  // отличить эту ситуацию от обычных ошибок OpenAI.
  throw createError({
    statusCode: 503,
    statusMessage: `AI-настройка «${key}» не сконфигурирована. ${reason}`,
    data: { code: AI_SETTING_NOT_CONFIGURED, key }
  })
}

// Эффективное значение настройки. Кэшируется на CACHE_TTL_MS. Бросает 503,
// если активной версии нет или value не валидируется.
export async function getAiSetting<K extends AiSettingKey>(key: K): Promise<AiSettingValue<K>> {
  const meta = getFeature(key)
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) {
    return hit.value as AiSettingValue<K>
  }

  const setting = await prisma.aiSetting.findUnique({
    where: { key },
    select: { activeVersion: true }
  })
  if (!setting || setting.activeVersion == null) {
    notConfigured(key, 'Откройте раздел админки «AI: модели и промпты» и создайте первую версию.')
  }

  const version = await prisma.aiSettingVersion.findUnique({
    where: { settingKey_version: { settingKey: key, version: setting.activeVersion! } },
    select: { value: true }
  })
  if (!version) {
    notConfigured(key, 'Активная версия отсутствует в истории — выберите версию в админке.')
  }

  const parsed = meta.schema.safeParse(version.value)
  if (!parsed.success) {
    console.error('[ai-settings] active version failed validation', {
      key,
      issues: parsed.error.issues.slice(0, 3)
    })
    notConfigured(key, 'Сохранённое значение не соответствует схеме — отредактируйте настройку в админке.')
  }

  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value: parsed.data })
  return parsed.data as AiSettingValue<K>
}

// Создаёт новую версию настройки и делает её активной. Возвращает свежий
// versionNumber. Валидация Zod до записи — нельзя сохранить мусор.
export async function saveAiSetting<K extends AiSettingKey>(
  key: K,
  value: AiSettingValue<K>,
  opts: { userId?: string | null; note?: string | null } = {}
): Promise<number> {
  const meta = getFeature(key)
  const parsed = meta.schema.parse(value)

  const result = await prisma.$transaction(async (tx) => {
    const setting = await tx.aiSetting.upsert({
      where: { key },
      create: { key },
      update: {},
      select: { key: true }
    })

    const last = await tx.aiSettingVersion.findFirst({
      where: { settingKey: setting.key },
      orderBy: { version: 'desc' },
      select: { version: true }
    })
    const nextVersion = (last?.version ?? 0) + 1

    await tx.aiSettingVersion.create({
      data: {
        settingKey: setting.key,
        version: nextVersion,
        value: parsed as object,
        note: opts.note?.trim() || null,
        createdById: opts.userId ?? null
      }
    })

    await tx.aiSetting.update({
      where: { key: setting.key },
      data: { activeVersion: nextVersion }
    })

    return nextVersion
  })

  invalidate(key)
  return result
}

// Переключение активной версии без создания новой записи. Используется для
// «отката на версию N» из истории.
export async function setActiveAiVersion(key: AiSettingKey, version: number): Promise<void> {
  const exists = await prisma.aiSettingVersion.findUnique({
    where: { settingKey_version: { settingKey: key, version } },
    select: { id: true }
  })
  if (!exists) {
    throw createError({ statusCode: 404, statusMessage: 'Версия настройки не найдена' })
  }
  await prisma.aiSetting.upsert({
    where: { key },
    create: { key, activeVersion: version },
    update: { activeVersion: version }
  })
  invalidate(key)
}

export interface ActiveVersionInfo {
  version: number
  value: unknown
  isValid: boolean
  createdAt: Date
  note: string | null
  createdBy: { id: string; name: string | null; email: string } | null
}

export interface AiSettingListItem {
  key: AiSettingKey
  meta: AiFeatureMeta
  effective: unknown | null
  isConfigured: boolean
  activeVersionInfo: ActiveVersionInfo | null
  totalVersions: number
}

// Для админки: список всех фич с текущими effective-значениями. Если у
// ключа нет активной версии или value не валидируется — effective = null,
// isConfigured = false, и UI покажет состояние «не настроено».
export async function listAiSettings(): Promise<AiSettingListItem[]> {
  const dbRows = await prisma.aiSetting.findMany({
    where: { key: { in: [...AI_SETTING_KEYS] } },
    select: { key: true, activeVersion: true }
  })
  const dbByKey = new Map(dbRows.map((r) => [r.key, r.activeVersion] as const))

  const activeVersionKeys = dbRows
    .filter((r) => r.activeVersion != null)
    .map((r) => ({ settingKey: r.key, version: r.activeVersion! }))

  const activeVersions = activeVersionKeys.length
    ? await prisma.aiSettingVersion.findMany({
        where: { OR: activeVersionKeys.map((k) => ({ settingKey: k.settingKey, version: k.version })) },
        select: {
          settingKey: true,
          version: true,
          value: true,
          note: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, email: true } }
        }
      })
    : []
  const versionsByKey = new Map(activeVersions.map((v) => [v.settingKey, v] as const))

  const counts = await prisma.aiSettingVersion.groupBy({
    by: ['settingKey'],
    where: { settingKey: { in: [...AI_SETTING_KEYS] } },
    _count: { _all: true }
  })
  const countsByKey = new Map(counts.map((c) => [c.settingKey, c._count._all] as const))

  return AI_SETTING_KEYS.map((key) => {
    const meta = AI_FEATURE_CATALOG[key]
    const activeVersionNumber = dbByKey.get(key) ?? null
    const versionRow = activeVersionNumber != null ? versionsByKey.get(key) : undefined

    let effective: unknown | null = null
    let isValid = false
    if (versionRow) {
      const parsed = meta.schema.safeParse(versionRow.value)
      if (parsed.success) {
        effective = parsed.data
        isValid = true
      }
    }

    return {
      key,
      meta,
      effective,
      isConfigured: effective != null,
      activeVersionInfo: versionRow
        ? {
            version: versionRow.version,
            value: versionRow.value,
            isValid,
            createdAt: versionRow.createdAt,
            note: versionRow.note,
            createdBy: versionRow.createdBy
              ? {
                  id: versionRow.createdBy.id,
                  name: versionRow.createdBy.name,
                  email: versionRow.createdBy.email
                }
              : null
          }
        : null,
      totalVersions: countsByKey.get(key) ?? 0
    }
  })
}

export interface VersionListItem {
  version: number
  value: unknown
  note: string | null
  createdAt: Date
  createdBy: { id: string; name: string | null; email: string } | null
  isActive: boolean
}

// История версий для одной фичи. Отдельная функция, чтобы тяжёлые value (особенно
// промпты на 5-10 кб) не тащились в общий listAiSettings.
export async function getAiSettingVersions(
  key: AiSettingKey,
  opts: { limit?: number } = {}
): Promise<VersionListItem[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200)
  const setting = await prisma.aiSetting.findUnique({
    where: { key },
    select: { activeVersion: true }
  })
  const versions = await prisma.aiSettingVersion.findMany({
    where: { settingKey: key },
    orderBy: { version: 'desc' },
    take: limit,
    select: {
      version: true,
      value: true,
      note: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } }
    }
  })

  return versions.map((v) => ({
    version: v.version,
    value: v.value,
    note: v.note,
    createdAt: v.createdAt,
    createdBy: v.createdBy
      ? { id: v.createdBy.id, name: v.createdBy.name, email: v.createdBy.email }
      : null,
    isActive: setting?.activeVersion === v.version
  }))
}
