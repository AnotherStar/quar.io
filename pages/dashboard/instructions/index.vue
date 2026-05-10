<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
import { onClickOutside } from '@vueuse/core'

const api = useApi()
const { currentTenant } = useAuthState()
const instructionsKey = computed(() => `instructions-${currentTenant.value?.id ?? 'none'}`)
const { data, refresh } = await useAsyncData(
  instructionsKey,
  () => api<{ instructions: any[] }>('/api/instructions'),
  {
    default: () => ({ instructions: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const tab = ref<'active' | 'archive'>('active')
const search = ref('')

const baseList = computed(() => {
  const list = data.value?.instructions ?? []
  return tab.value === 'archive'
    ? list.filter((i) => i.status === 'ARCHIVED')
    : list.filter((i) => i.status !== 'ARCHIVED')
})

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return baseList.value
  return baseList.value.filter(
    (i) => i.title.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q) || (i.productBarcode ?? '').toLowerCase().includes(q)
  )
})

const counts = computed(() => {
  const list = data.value?.instructions ?? []
  return {
    active: list.filter((i) => i.status !== 'ARCHIVED').length,
    archive: list.filter((i) => i.status === 'ARCHIVED').length
  }
})

const creating = ref(false)
const duplicatingId = ref<string | null>(null)
const createError = ref<string | null>(null)
async function createNew() {
  creating.value = true; createError.value = null
  try {
    const slug = `${Math.random().toString(36).slice(2, 8)}`
    const { instruction } = await api<{ instruction: any }>('/api/instructions', {
      method: 'POST',
      body: { title: 'Без названия', slug, language: 'ru' }
    })
    await navigateTo(`/dashboard/instructions/${instruction.id}/edit`)
  } catch (e: any) {
    createError.value = e?.data?.statusMessage ?? 'Ошибка'
  } finally { creating.value = false }
}

async function duplicateInstruction(id: string) {
  openMenuId.value = null
  duplicatingId.value = id
  createError.value = null
  try {
    await api(`/api/instructions/${id}/duplicate`, { method: 'POST' })
    tab.value = 'active'
    await refresh()
  } catch (e: any) {
    createError.value = e?.data?.statusMessage ?? 'Не удалось скопировать инструкцию'
  } finally {
    duplicatingId.value = null
  }
}

function publicUrlFor(i: any) {
  return `/${currentTenant.value?.slug}/${i.slug}`
}

// Per-row kebab menu — only one open at a time
const openMenuId = ref<string | null>(null)
const menuRefs = ref<Record<string, HTMLElement | null>>({})
function bindMenu(el: any, id: string) { menuRefs.value[id] = el as HTMLElement }
watch(openMenuId, (id) => {
  if (!id) return
  // Close on outside click
  const el = menuRefs.value[id]
  if (!el) return
  // Use document-level listener since onClickOutside on dynamic refs is awkward
  const onDocClick = (ev: MouseEvent) => {
    if (!el.contains(ev.target as Node)) {
      openMenuId.value = null
      document.removeEventListener('mousedown', onDocClick)
    }
  }
  setTimeout(() => document.addEventListener('mousedown', onDocClick), 0)
})

async function archive(id: string) {
  openMenuId.value = null
  if (!confirm('Перенести в архив? Публичная страница перестанет открываться, данные сохранятся.')) return
  await api(`/api/instructions/${id}/archive`, { method: 'POST' })
  await refresh()
}

async function unarchive(id: string) {
  openMenuId.value = null
  try {
    await api(`/api/instructions/${id}/unarchive`, { method: 'POST' })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? 'Не удалось восстановить')
  }
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:file-text" title="Инструкции">
      <template #actions>
        <UiButton :loading="creating" @click="createNew">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Новая
        </UiButton>
      </template>
    </PageHeader>

    <UiAlert v-if="createError" kind="error" class="mt-md">{{ createError }}</UiAlert>

    <div class="mt-sm flex flex-wrap items-center justify-between gap-md">
      <!-- Segmented control: пилюля с фоном bg-surface, внутри «ездящая» белая
           плашка под активным табом. Сетка inline-grid даёт обеим кнопкам
           одинаковую ширину, и плашка покрывает активную ровно на 50%.
           h-10 = 40px — общая высота элементов этой строки (input, button). -->
      <div
        class="relative inline-grid h-10 grid-cols-2 rounded-lg bg-surface p-1"
        role="tablist"
      >
        <span
          aria-hidden="true"
          class="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-canvas shadow-subtle transition-transform duration-200 ease-out"
          :style="{ transform: tab === 'archive' ? 'translateX(100%)' : 'translateX(0)' }"
        />
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'active'"
          :class="['relative z-10 flex items-center justify-center rounded-md px-md text-body-sm-md transition-colors',
            tab === 'active' ? 'text-ink' : 'text-stone hover:text-ink']"
          @click="tab = 'active'"
        >
          Активные · {{ counts.active }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'archive'"
          :class="['relative z-10 flex items-center justify-center rounded-md px-md text-body-sm-md transition-colors',
            tab === 'archive' ? 'text-ink' : 'text-stone hover:text-ink']"
          @click="tab = 'archive'"
        >
          Архив · {{ counts.archive }}
        </button>
      </div>

      <div class="relative w-full max-w-sm">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
        <input
          v-model="search"
          type="text"
          placeholder="Поиск по названию или URL"
          class="h-10 w-full rounded-lg border border-transparent bg-surface px-md pl-9 text-body-sm-md placeholder:text-stone outline-none focus:border-primary focus:bg-canvas focus:ring-2 focus:ring-primary/20"
        >
      </div>
    </div>

    <div class="mt-xl">
      <table v-if="visible.length" class="w-full">
        <thead>
          <tr class="border-b border-hairline text-caption text-steel uppercase">
            <th class="pb-sm text-left">Инструкция</th>
            <th class="pb-sm text-left">Статус</th>
            <th class="pb-sm text-right">Просмотры · 30 дн</th>
            <th class="pb-sm w-10" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in visible" :key="i.id" class="border-b border-hairline-soft">
            <!-- Title + slug, click → editor -->
            <td class="py-sm">
              <NuxtLink
                :to="`/dashboard/instructions/${i.id}/edit`"
                class="group block"
              >
                <span class="text-body-sm-md text-ink group-hover:text-primary">{{ i.title }}</span>
                <span class="block text-caption text-steel group-hover:text-link">
                  /{{ currentTenant?.slug }}/{{ i.slug }}
                </span>
                <span v-if="i.productBarcode" class="block text-caption text-steel">
                  ШК {{ i.productBarcode }}
                </span>
              </NuxtLink>
            </td>
            <td class="py-sm align-top">
              <UiBadge :variant="i.status === 'PUBLISHED' ? 'tag-green' : i.status === 'ARCHIVED' ? 'tag-orange' : i.status === 'IN_REVIEW' ? 'tag-orange' : 'tag-gray'">
                {{ i.status }}
              </UiBadge>
            </td>
            <!-- Analytics, click → analytics page -->
            <td class="py-sm align-top text-right">
              <NuxtLink
                :to="`/dashboard/instructions/${i.id}/analytics`"
                class="inline-flex items-center gap-1 text-body-sm-md text-ink hover:text-primary"
              >
                {{ i.views30d ?? 0 }}
                <Icon name="lucide:bar-chart-3" class="h-4 w-4 text-steel" />
              </NuxtLink>
            </td>
            <!-- Kebab menu with row actions -->
            <td class="py-sm align-top">
              <div :ref="(el: any) => bindMenu(el, i.id)" class="relative">
                <button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface hover:text-ink"
                  :title="'Действия'"
                  @click.stop="openMenuId = openMenuId === i.id ? null : i.id"
                >
                  <Icon name="lucide:ellipsis-vertical" class="h-4 w-4" />
                </button>
                <div
                  v-if="openMenuId === i.id"
                  class="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal"
                >
                  <NuxtLink
                    :to="`/dashboard/instructions/${i.id}/edit`"
                    class="flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface"
                    @click="openMenuId = null"
                  >
                    <Icon name="lucide:pencil" class="h-4 w-4 text-steel" />
                    Редактировать
                  </NuxtLink>
                  <button
                    v-if="i.status === 'DRAFT'"
                    type="button"
                    disabled
                    class="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left text-body-sm text-muted"
                    title="Черновик еще не опубликован"
                  >
                    <Icon name="lucide:eye-off" class="h-4 w-4" />
                    Просмотр
                  </button>
                  <a
                    v-else
                    :href="publicUrlFor(i)"
                    target="_blank"
                    rel="noopener"
                    class="flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface"
                    @click="openMenuId = null"
                  >
                    <Icon name="lucide:eye" class="h-4 w-4 text-steel" />
                    Просмотр
                  </a>
                  <NuxtLink
                    :to="`/dashboard/instructions/${i.id}/analytics`"
                    class="flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface"
                    @click="openMenuId = null"
                  >
                    <Icon name="lucide:bar-chart-3" class="h-4 w-4 text-steel" />
                    Аналитика
                  </NuxtLink>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface disabled:opacity-60"
                    :disabled="duplicatingId === i.id"
                    @click="duplicateInstruction(i.id)"
                  >
                    <Icon name="lucide:copy" class="h-4 w-4 text-steel" />
                    {{ duplicatingId === i.id ? 'Копирую…' : 'Скопировать' }}
                  </button>
                  <hr class="border-hairline">
                  <button
                    v-if="i.status !== 'ARCHIVED'"
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-error hover:bg-surface"
                    @click="archive(i.id)"
                  >
                    <Icon name="lucide:archive" class="h-4 w-4" />
                    В архив
                  </button>
                  <button
                    v-else
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface"
                    @click="unarchive(i.id)"
                  >
                    <Icon name="lucide:archive-restore" class="h-4 w-4 text-steel" />
                    Восстановить
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="py-md text-body text-steel">
        <span v-if="search">Ничего не найдено по «{{ search }}».</span>
        <span v-else-if="tab === 'archive'">Архив пуст.</span>
        <span v-else>Пока пусто. Создайте первую инструкцию.</span>
      </p>
    </div>
  </div>
</template>
