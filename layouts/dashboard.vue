<script setup lang="ts">
import { moduleRegistry } from '~~/modules-sdk/registry'

const { user, currentTenant } = useAuthState()
const route = useRoute()
const api = useApi()
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)

// Core nav items. «Настройки» сюда не входят — они доступны через клик по
// user-row в footer сайдбара. Пункт «Модули» помечен exact:true, чтобы на
// детальных страницах модулей (/dashboard/modules/feedback, …/warranty)
// подсвечивались только их собственные пункты в module-nav, а не общий
// «Модули» из core-nav.
const coreItems = [
  { to: '/dashboard', label: 'Обзор', icon: 'lucide:layout-dashboard', exact: true },
  { to: '/dashboard/instructions', label: 'Инструкции', icon: 'lucide:file-text' },
  { to: '/dashboard/sections', label: 'Секции', icon: 'lucide:blocks' },
  { to: '/dashboard/modules', label: 'Модули', icon: 'lucide:puzzle', exact: true },
  { to: '/dashboard/qr-codes', label: 'QR-коды', icon: 'lucide:qr-code' },
  { to: '/dashboard/billing', label: 'Тариф и оплата', icon: 'lucide:credit-card' }
]

// Per-module sidebar entries — appear only when the module is enabled for
// this tenant. Module declares its dashboardNavItem in modules-sdk/registry.
const sidebarModulesKey = computed(() => `sidebar-modules-${currentTenant.value?.id ?? 'none'}`)
const { data: modulesData } = await useAsyncData(
  sidebarModulesKey,
  () => api<{ modules: any[] }>('/api/modules'),
  {
    default: () => ({ modules: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const moduleNavItems = computed(() => {
  return moduleRegistry
    .filter((m) => m.dashboardNavItem)
    .filter((m) => modulesData.value?.modules.find((api) => api.code === m.manifest.code)?.tenantConfig?.enabled)
    .map((m) => ({ ...m.dashboardNavItem!, code: m.manifest.code }))
})

const isActive = (to: string, exact?: boolean) =>
  exact ? route.path === to : route.path.startsWith(to)

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <!-- Мобильная фикс-кнопка для открытия меню. На md+ скрыта, потому что
         сайдбар уже виден постоянно. -->
    <button
      type="button"
      class="dashboard-mobile-toggle md:hidden"
      :aria-label="mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'"
      :aria-expanded="mobileMenuOpen"
      aria-controls="mobile-dashboard-menu"
      @click="mobileMenuOpen = !mobileMenuOpen"
    >
      <Icon :name="mobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-5 w-5" />
    </button>

    <div
      class="dashboard-shell"
      :class="{ 'is-sidebar-collapsed': sidebarCollapsed }"
    >
      <!-- Desktop-сайдбар. На мобиле скрыт (там работает overlay). -->
      <aside class="dashboard-sidebar hidden md:block">
        <div class="dashboard-sidebar-inner">
          <!-- Brand: лого + название. Tenant перенесён в footer внизу.
               На белом фоне, высотой 64px — этот ряд является «вертикальным
               эталоном», с которым выравнивается header-row каждой страницы. -->
          <div class="dashboard-sidebar-brand">
            <NuxtLink to="/dashboard" class="flex min-w-0 items-center gap-3">
              <img
                src="/icons/icon-192.png"
                alt=""
                width="48"
                height="48"
                class="h-12 w-12 shrink-0 rounded-lg"
              />
              <span
                class="dashboard-fade-label text-h4 uppercase tracking-wider text-navy opacity-50"
                :class="sidebarCollapsed ? 'is-hidden' : ''"
              >quar.io</span>
            </NuxtLink>
          </div>

          <!-- Серый shell с навигацией и user-зоной. Стартует там же, где
               начинаются табы / основной контент страницы. -->
          <div class="dashboard-sidebar-shell">
            <!-- Collapse-кнопка. Выровнена по левому краю, в одну колонку
                 с пунктами меню. Padding и gap фиксированы — текст плавно
                 fade-out'ится при сворачивании через .dashboard-fade-label. -->
            <button
              type="button"
              class="mb-xs flex h-8 w-full items-center gap-3 rounded-md px-sm text-body-sm-md text-steel transition-colors duration-200 ease-out hover:bg-hairline-soft hover:text-ink"
              :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
              :aria-expanded="!sidebarCollapsed"
              @click="sidebarCollapsed = !sidebarCollapsed"
            >
              <Icon
                :name="sidebarCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-left'"
                class="h-4 w-4 shrink-0"
              />
              <span
                class="dashboard-fade-label"
                :class="sidebarCollapsed ? 'is-hidden' : ''"
              >Свернуть</span>
            </button>

            <hr class="border-hairline-soft" />

            <!-- Меню. flex-1 толкает user-зону к низу. Padding/gap pill'ов
                 фиксированы — при сворачивании иконка остаётся на той же
                 x-координате, не «прыгает». -->
            <nav class="flex flex-1 flex-col gap-1 overflow-y-auto">
              <NuxtLink
                v-for="i in coreItems"
                :key="i.to"
                :to="i.to"
                :title="sidebarCollapsed ? i.label : undefined"
                :class="[
                  'flex h-9 items-center gap-3 rounded-md px-sm text-body-sm-md transition-colors duration-200 ease-out',
                  isActive(i.to, i.exact) ? 'bg-primary text-on-primary' : 'text-charcoal hover:bg-hairline-soft hover:text-ink'
                ]"
              >
                <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
                <span
                  class="dashboard-fade-label truncate"
                  :class="sidebarCollapsed ? 'is-hidden' : ''"
                >{{ i.label }}</span>
              </NuxtLink>

              <template v-if="moduleNavItems.length">
                <hr class="my-sm border-hairline-soft" />
                <NuxtLink
                  v-for="i in moduleNavItems"
                  :key="i.to"
                  :to="i.to"
                  :title="sidebarCollapsed ? i.label : undefined"
                  :class="[
                    'flex h-9 items-center gap-3 rounded-md px-sm text-body-sm-md transition-colors duration-200 ease-out',
                    isActive(i.to) ? 'bg-primary text-on-primary' : 'text-charcoal hover:bg-hairline-soft hover:text-ink'
                  ]"
                >
                  <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
                  <span
                    class="dashboard-fade-label truncate"
                    :class="sidebarCollapsed ? 'is-hidden' : ''"
                  >{{ i.label }}</span>
                </NuxtLink>
              </template>
            </nav>

            <!-- Footer: tenant + user, прижаты к низу shell. -->
            <div v-if="currentTenant || user" class="dashboard-sidebar-footer">
              <div
                v-if="currentTenant"
                class="dashboard-sidebar-footer-row"
                :title="sidebarCollapsed ? currentTenant.name : undefined"
              >
                <Icon name="lucide:building-2" class="h-4 w-4 shrink-0 text-steel" />
                <span
                  class="dashboard-fade-label text-body-sm-md text-charcoal"
                  :class="sidebarCollapsed ? 'is-hidden' : ''"
                >
                  {{ currentTenant.name }}
                </span>
              </div>
              <NuxtLink
                v-if="user"
                to="/dashboard/settings"
                class="dashboard-sidebar-footer-row rounded-md transition-colors duration-200 ease-out"
                :class="isActive('/dashboard/settings')
                  ? 'bg-primary text-on-primary'
                  : 'text-charcoal hover:bg-hairline-soft hover:text-ink'"
                :title="sidebarCollapsed ? user.email : undefined"
              >
                <Icon name="lucide:user-round" class="h-4 w-4 shrink-0" />
                <span
                  class="dashboard-fade-label text-body-sm"
                  :class="sidebarCollapsed ? 'is-hidden' : ''"
                >
                  {{ user.email }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </aside>

      <!-- Основной контент. Страницы сами рисуют свой header-row высотой 64px
           внутри слота — он встанет вровень с brand-зоной сайдбара. -->
      <section class="dashboard-content min-w-0">
        <div class="dashboard-content-inner">
          <slot />
        </div>
      </section>
    </div>

    <!-- Mobile overlay menu -->
    <Transition name="dashboard-mobile-menu">
      <div
        v-if="mobileMenuOpen"
        id="mobile-dashboard-menu"
        class="dashboard-mobile-overlay md:hidden"
        @click.self="mobileMenuOpen = false"
      >
        <div class="dashboard-mobile-panel">
          <NuxtLink to="/dashboard" class="mb-md flex items-center gap-3" @click="mobileMenuOpen = false">
            <img src="/icons/icon-192.png" alt="" width="48" height="48" class="h-12 w-12 rounded-lg" />
            <span class="text-h4 uppercase tracking-wider text-navy opacity-50">quar.io</span>
          </NuxtLink>
          <nav class="flex flex-1 flex-col gap-1 overflow-y-auto">
            <NuxtLink
              v-for="i in coreItems"
              :key="i.to"
              :to="i.to"
              :class="[
                'flex h-10 items-center gap-3 rounded-md px-sm text-body-sm-md transition-colors',
                isActive(i.to, i.exact) ? 'bg-primary text-on-primary' : 'text-charcoal hover:bg-hairline-soft hover:text-ink'
              ]"
            >
              <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
              <span class="truncate">{{ i.label }}</span>
            </NuxtLink>
            <template v-if="moduleNavItems.length">
              <hr class="my-sm border-hairline-soft" />
              <NuxtLink
                v-for="i in moduleNavItems"
                :key="i.to"
                :to="i.to"
                :class="[
                  'flex h-10 items-center gap-3 rounded-md px-sm text-body-sm-md transition-colors',
                  isActive(i.to) ? 'bg-primary text-on-primary' : 'text-charcoal hover:bg-hairline-soft hover:text-ink'
                ]"
              >
                <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
                <span class="truncate">{{ i.label }}</span>
              </NuxtLink>
            </template>
          </nav>
          <div v-if="currentTenant || user" class="dashboard-sidebar-footer">
            <div v-if="currentTenant" class="dashboard-sidebar-footer-row">
              <Icon name="lucide:building-2" class="h-4 w-4 shrink-0 text-steel" />
              <span class="truncate text-body-sm-md text-charcoal">{{ currentTenant.name }}</span>
            </div>
            <NuxtLink
              v-if="user"
              to="/dashboard/settings"
              class="dashboard-sidebar-footer-row rounded-md transition-colors"
              :class="isActive('/dashboard/settings')
                ? 'bg-primary text-on-primary'
                : 'text-charcoal hover:bg-hairline-soft hover:text-ink'"
            >
              <Icon name="lucide:user-round" class="h-4 w-4 shrink-0" />
              <span class="truncate text-body-sm">{{ user.email }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dashboard-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  /* Default grid stretch — sidebar column тянется на высоту контента,
   * чтобы position: sticky на .dashboard-sidebar-inner залипал при скролле. */
}

@media (min-width: 768px) {
  .dashboard-shell {
    grid-template-columns: var(--dashboard-sidebar-width, 288px) minmax(0, 1fr);
    transition: grid-template-columns 0.2s ease;
  }

  .dashboard-shell.is-sidebar-collapsed {
    /* 136px = (16 icon) + (12 + 12 pill padding) + (12 + 12 shell padding)
     *      + (12 + 12 sidebar-inner padding) + (24 + 24 aside outer padding)
     * — единственная ширина, при которой иконка пункта меню оказывается
     * идеально по центру pill'а без условных классов justify-center. */
    --dashboard-sidebar-width: 114px;
  }
}

/* Сайдбар — «парящий» inset-бокс на сером фоне. Inset 24px по бокам и снизу,
 * сверху 12px — brand-зона визуально приподнята к верхнему краю окна. Гэп
 * между sidebar-inner и контентом справа = 24px (формируется правым padding'ом
 * сайдбара), .dashboard-content на md+ получает padding-left: 0. */
.dashboard-sidebar {
  padding: 12px 24px 24px 24px;
}

.dashboard-sidebar-inner {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  /* Gap 12px между brand-зоной и серым shell — brand «приподнят» относительно
   * shell, но shell остаётся на той же y-координате, что и до подъёма. */
  gap: 12px;
  /* min-height = высота экрана минус суммарный вертикальный inset (12+24) —
   * сайдбар «дотягивается» до низа окна, чтобы user-зона прижималась к
   * самому низу даже на коротких страницах. */
  min-height: calc(100vh - 36px);
  max-height: calc(100vh - 36px);
  overflow: hidden;
  /* Внешний контейнер не имеет фона — brand-row остаётся на белом фоне body,
   * а серый фон ниже задаёт отдельный shell. */
}

/* Brand-зона: фиксированная высота 64px, чтобы выровняться с header-row любой
 * страницы (которая тоже задаёт min-h-16). На белом фоне body — вне серого
 * shell-бокса. Padding 8px = (64-48)/2 — отступ слева/сверху/снизу симметричен
 * для лого 48×48. */
.dashboard-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 64px;
  flex-shrink: 0;
  padding: 0 8px;
}

/* Shell — серый rounded-бокс под brand-зоной. Внутри: collapse-кнопка, nav,
 * user. flex-1 чтобы заполнить остаток sidebar-inner. */
.dashboard-sidebar-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: var(--color-surface);
  overflow: hidden;
}

/* Footer: tenant + user, прижаты к низу shell. Разделитель сверху. */
.dashboard-sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid var(--color-hairline);
}

.dashboard-sidebar-footer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  min-height: 32px;
}

/* Текстовые лейблы в сайдбаре (логотип «quar.io», подписи пунктов меню,
 * email/tenant в футере) при сворачивании плавно «схлопываются» — fade-out
 * через opacity + max-width transition. Padding и gap внутри pill'ов не
 * меняются, поэтому иконки остаются ровно на той же x-координате и сайдбар
 * не «прыгает». */
.dashboard-fade-label {
  display: inline-block;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 150ms ease, max-width 200ms ease, margin-left 200ms ease;
}

.dashboard-fade-label.is-hidden {
  opacity: 0;
  max-width: 0;
  /* gap-3 = 12px в родительском flex'е — отрицательным margin-left съедаем
   * этот gap, чтобы иконка не оставалась с пустотой справа от себя. */
  margin-left: -12px;
  pointer-events: none;
}

/* В footer-row gap=8px, поэтому компенсация margin-left другая. */
.dashboard-sidebar-footer-row .dashboard-fade-label.is-hidden {
  margin-left: -8px;
}

/* Контент: padding-top 12px такой же, как у .dashboard-sidebar — благодаря
 * этому первый блок страницы (header-row высотой 64px) стартует на той же
 * y-координате, что и brand-зона сайдбара. На md+ padding-left нулевой —
 * gap до сайдбара уже задан его собственным правым 24px-инсетом. */
.dashboard-content {
  padding: 12px 24px 24px 24px;
}

@media (min-width: 768px) {
  .dashboard-content {
    padding: 12px 24px 24px 0;
  }
}

.dashboard-content-inner {
  width: 100%;
}

/* Мобильная кнопка-гамбургер — fixed в углу. Существует только до md.
 * Позиция совпадает с inset сайдбара на десктопе (top/left = 24px),
 * чтобы при ресайзе она «вырастала» в brand-row сайдбара без визуального
 * сдвига. Backdrop-filter blur(10px) + полупрозрачный фон гарантируют, что
 * кнопка остаётся читаемой поверх любого скроллящегося контента под ней. */
.dashboard-mobile-toggle {
  position: fixed;
  top: 24px;
  left: 24px;
  z-index: 50;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(246, 245, 244, 0.72);
  -webkit-backdrop-filter: blur(10px) saturate(160%);
  backdrop-filter: blur(10px) saturate(160%);
  color: var(--color-charcoal);
  border: 0;
}

@media (min-width: 768px) {
  .dashboard-mobile-toggle {
    display: none;
  }
}

/* Мобильное overlay-меню. Затемнение фона + панель слева. */
.dashboard-mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(15, 15, 15, 0.32);
  display: flex;
}

.dashboard-mobile-panel {
  width: min(86vw, 320px);
  height: 100%;
  background: var(--color-surface);
  padding: 64px 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dashboard-mobile-menu-enter-active,
.dashboard-mobile-menu-leave-active {
  transition: opacity 0.16s ease;
}

.dashboard-mobile-menu-enter-active .dashboard-mobile-panel,
.dashboard-mobile-menu-leave-active .dashboard-mobile-panel {
  transition: transform 0.2s ease;
}

.dashboard-mobile-menu-enter-from,
.dashboard-mobile-menu-leave-to {
  opacity: 0;
}

.dashboard-mobile-menu-enter-from .dashboard-mobile-panel,
.dashboard-mobile-menu-leave-to .dashboard-mobile-panel {
  transform: translateX(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-shell,
  .dashboard-mobile-menu-enter-active,
  .dashboard-mobile-menu-leave-active,
  .dashboard-mobile-menu-enter-active .dashboard-mobile-panel,
  .dashboard-mobile-menu-leave-active .dashboard-mobile-panel {
    transition: none;
  }

  .dashboard-mobile-menu-enter-from .dashboard-mobile-panel,
  .dashboard-mobile-menu-leave-to .dashboard-mobile-panel {
    transform: none;
  }
}
</style>
