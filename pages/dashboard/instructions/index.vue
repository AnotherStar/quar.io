<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant } = useAuthState()
const { track } = useTrackGoal()
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
    track('instruction_created')
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

// Per-row kebab menu — only one open at a time.
// Menu рендерится через <Teleport to="body">, потому что родительская
// .overflow-x-auto на UiTable клипит и по вертикали (CSS-спека: при не-visible
// overflow-x значение overflow-y тоже становится auto). Координаты берём из
// getBoundingClientRect() кнопки → position: fixed.
const openMenuId = ref<string | null>(null)
const menuPos = ref<{ top: number; right: number }>({ top: 0, right: 0 })
const menuEl = ref<HTMLElement | null>(null)
const buttonEls = new Map<string, HTMLElement>()

function bindButton(el: any, id: string) {
  if (el) buttonEls.set(id, el as HTMLElement)
  else buttonEls.delete(id)
}

function toggleMenu(id: string, ev: MouseEvent) {
  if (openMenuId.value === id) { openMenuId.value = null; return }
  const btn = (ev.currentTarget as HTMLElement) ?? buttonEls.get(id)
  if (!btn) return
  const r = btn.getBoundingClientRect()
  menuPos.value = { top: r.bottom + 4, right: Math.max(0, window.innerWidth - r.right) }
  openMenuId.value = id
}

function closeMenu() { openMenuId.value = null }

// Close on outside click / scroll / resize while menu is open.
watch(openMenuId, (id) => {
  if (!id) return
  const onDocClick = (ev: MouseEvent) => {
    const t = ev.target as Node
    if (menuEl.value?.contains(t)) return
    if (buttonEls.get(id)?.contains(t)) return
    closeMenu()
  }
  const onScrollOrResize = () => closeMenu()
  const stop = () => {
    document.removeEventListener('mousedown', onDocClick)
    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('resize', onScrollOrResize)
  }
  setTimeout(() => {
    document.addEventListener('mousedown', onDocClick)
    // capture=true ловит scroll и у вложенных контейнеров (например, overflow-x таблицы)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  }, 0)
  const unwatch = watch(openMenuId, (next) => {
    if (next !== id) { stop(); unwatch() }
  })
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
          Создать
        </UiButton>
      </template>
    </PageHeader>

    <UiAlert v-if="createError" kind="error" class="mt-md">{{ createError }}</UiAlert>

    <div class="mt-sm flex flex-wrap items-center justify-between gap-md">
      <UiSegmentedTabs
        v-model="tab"
        :tabs="[
          { value: 'active', label: 'Активные', count: counts.active },
          { value: 'archive', label: 'Архив', count: counts.archive }
        ]"
      />

      <div class="relative w-full max-w-sm">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
        <input
          v-model="search"
          type="text"
          placeholder="Поиск по названию или URL"
          class="h-10 w-full rounded-lg border border-transparent bg-surface px-md pl-9 text-body-sm-md placeholder:text-hairline-strong outline-none focus:border-primary focus:bg-canvas focus:ring-2 focus:ring-primary/20"
        >
      </div>
    </div>

    <Transition name="tab-content" mode="out-in">
    <div :key="tab" class="mt-xl">
      <UiTable v-if="visible.length">
        <thead>
          <tr>
            <th class="text-left">Инструкция</th>
            <th class="text-left">Статус</th>
            <th class="text-right">Просмотры · 30 дн</th>
            <th class="w-10" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in visible" :key="i.id">
            <!-- Title + slug, click → editor -->
            <td>
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
            <td class="align-top">
              <UiBadge :variant="i.status === 'PUBLISHED' ? 'tag-green' : i.status === 'ARCHIVED' ? 'tag-orange' : i.status === 'IN_REVIEW' ? 'tag-orange' : 'tag-gray'">
                {{ i.status }}
              </UiBadge>
            </td>
            <!-- Analytics, click → analytics page -->
            <td class="align-top text-right">
              <NuxtLink
                :to="`/dashboard/instructions/${i.id}/analytics`"
                class="inline-flex items-center gap-1 text-body-sm-md text-ink hover:text-primary"
              >
                {{ i.views30d ?? 0 }}
                <Icon name="lucide:bar-chart-3" class="h-4 w-4 text-steel" />
              </NuxtLink>
            </td>
            <!-- Kebab menu with row actions. Само меню рендерится через
                 <Teleport> ниже одним инстансом для всей таблицы. -->
            <td class="align-top">
              <button
                :ref="(el: any) => bindButton(el, i.id)"
                type="button"
                class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface hover:text-ink"
                title="Действия"
                @click.stop="toggleMenu(i.id, $event)"
              >
                <Icon name="lucide:ellipsis-vertical" class="h-4 w-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </UiTable>
      <p v-else class="py-md text-body text-steel">
        <span v-if="search">Ничего не найдено по «{{ search }}».</span>
        <span v-else-if="tab === 'archive'">Архив пуст.</span>
        <span v-else>Пока пусто. Создайте первую инструкцию.</span>
      </p>
    </div>
    </Transition>

    <!-- Kebab dropdown — единый инстанс, телепортированный к body, чтобы не
         клиппиться внутри overflow-x контейнера таблицы. Координаты задаются
         через position: fixed относительно нажатой кнопки. -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="openMenuId"
          ref="menuEl"
          class="fixed z-50 w-44 overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal"
          :style="{ top: menuPos.top + 'px', right: menuPos.right + 'px' }"
        >
          <template v-for="i in visible" :key="i.id">
            <template v-if="openMenuId === i.id">
              <NuxtLink
                :to="`/dashboard/instructions/${i.id}/edit`"
                class="flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface"
                @click="closeMenu"
              >
                <Icon name="lucide:pencil" class="h-4 w-4 text-steel" />
                Редактировать
              </NuxtLink>
              <button
                v-if="i.status === 'DRAFT'"
                type="button"
                disabled
                class="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left text-body-sm text-hairline-strong"
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
                @click="closeMenu"
              >
                <Icon name="lucide:eye" class="h-4 w-4 text-steel" />
                Просмотр
              </a>
              <NuxtLink
                :to="`/dashboard/instructions/${i.id}/analytics`"
                class="flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface"
                @click="closeMenu"
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
            </template>
          </template>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>
