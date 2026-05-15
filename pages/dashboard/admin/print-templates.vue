<script setup lang="ts">
// Управление публичностью пользовательских шаблонов для печати стикеров.
// Видны все шаблоны со всех тенантов. Тоггл isPublic переключает доступ:
// при включении шаблон появляется в каталоге у всех тенантов.
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const api = useApi()
const toast = useToast()

interface AdminTemplateItem {
  id: string
  name: string
  isPublic: boolean
  archivedAt: string | null
  widthMm: number
  heightMm: number
  previewUrl: string
  createdAt: string
  tenant: { id: string; name: string; slug: string }
}

const { data, pending, refresh } = await useAsyncData(
  'admin-print-templates',
  () => api<{ items: AdminTemplateItem[] }>('/api/admin/print-templates')
)

const togglingId = ref<string | null>(null)

async function toggle(item: AdminTemplateItem) {
  togglingId.value = item.id
  try {
    await api(`/api/admin/print-templates/${item.id}`, {
      method: 'PATCH',
      body: { isPublic: !item.isPublic }
    })
    toast.success(
      item.isPublic
        ? `«${item.name}» больше не публичен`
        : `«${item.name}» теперь публичен`,
      { title: 'Готово' }
    )
    await refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || 'Не удалось переключить')
  } finally {
    togglingId.value = null
  }
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const publicCount = computed(
  () => data.value?.items.filter((it) => it.isPublic && !it.archivedAt).length ?? 0
)
const totalCount = computed(
  () => data.value?.items.filter((it) => !it.archivedAt).length ?? 0
)
</script>

<template>
  <div>
    <PageHeader icon="lucide:layout-template" title="Шаблоны стикеров">
      <template #actions>
        <UiButton variant="secondary" size="sm" :loading="pending" @click="refresh">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" />
          Обновить
        </UiButton>
        <UiButton to="/dashboard/admin" variant="secondary" size="sm">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          К админке
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-2xl">
      <p class="text-body-sm text-steel">
        Кастомные печатные шаблоны со всех тенантов. Включи «Публичный», чтобы
        шаблон появился в каталоге для всех пользователей платформы.
      </p>

      <div class="grid grid-cols-2 gap-md md:grid-cols-4">
        <UiStatCard label="Всего шаблонов">
          {{ totalCount }}
        </UiStatCard>
        <UiStatCard label="Публичные">
          {{ publicCount }}
        </UiStatCard>
      </div>

      <UiTable min-width="900px">
        <thead>
          <tr>
            <th class="text-left">Шаблон</th>
            <th class="text-left">Размер</th>
            <th class="text-left">Владелец</th>
            <th class="text-left">Создан</th>
            <th class="text-left">Публичный</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.items ?? []" :key="item.id">
            <td>
              <div class="flex items-center gap-3">
                <img
                  :src="item.previewUrl"
                  :alt="item.name"
                  class="h-12 w-12 shrink-0 rounded-md border border-hairline object-contain bg-tint-gray"
                  loading="lazy"
                >
                <div class="min-w-0">
                  <div class="text-body-sm-md text-ink">{{ item.name }}</div>
                  <div v-if="item.archivedAt" class="text-caption text-steel">
                    архивирован {{ formatDateTime(item.archivedAt) }}
                  </div>
                </div>
              </div>
            </td>
            <td class="text-body-sm text-steel">
              {{ item.widthMm }}×{{ item.heightMm }} мм
            </td>
            <td>
              <div class="text-body-sm text-ink">{{ item.tenant.name }}</div>
              <div class="font-mono text-caption text-steel">/{{ item.tenant.slug }}</div>
            </td>
            <td class="text-caption text-steel">
              {{ formatDateTime(item.createdAt) }}
            </td>
            <td>
              <UiSwitch
                :model-value="item.isPublic"
                :disabled="togglingId === item.id || !!item.archivedAt"
                @update:model-value="toggle(item)"
              />
            </td>
          </tr>
          <tr v-if="data && !data.items.length">
            <td colspan="5" class="py-lg text-center text-body-sm text-steel">
              Кастомных шаблонов пока нет.
            </td>
          </tr>
        </tbody>
      </UiTable>
    </div>
  </div>
</template>
