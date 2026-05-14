<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant } = useAuthState()
const { track } = useTrackGoal()
const modulesKey = computed(() => `modules-${currentTenant.value?.id ?? 'none'}`)
const { data, refresh } = await useAsyncData(
  modulesKey,
  () => api<{ modules: any[] }>('/api/modules'),
  {
    default: () => ({ modules: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

async function toggle(code: string, enabled: boolean, config: object) {
  await api(`/api/modules/${code}`, { method: 'PUT', body: { enabled, config } })
  // Цель только на переходе off → on, чтобы выключения не пушили шум.
  if (enabled) track('module_added', { code })
  await refresh()
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:puzzle" title="Модули" />

    <div class="mt-sm grid grid-cols-1 gap-md md:grid-cols-2">
      <div
        v-for="m in data?.modules"
        :key="m.id"
        class="rounded-lg bg-surface p-xl"
      >
        <div class="flex items-start justify-between gap-md">
          <div class="min-w-0">
            <h3 class="text-h4 text-ink">{{ m.name }}</h3>
            <p class="mt-1 text-body-sm text-steel">{{ m.description }}</p>
            <div class="mt-2 flex items-center gap-2">
              <UiBadge variant="tag-gray">v{{ m.version }}</UiBadge>
              <UiBadge v-if="m.requiresPlan" variant="tag-orange">от {{ m.requiresPlan }}</UiBadge>
              <UiBadge v-if="!m.allowedByPlan" variant="tag-orange">недоступен на тарифе</UiBadge>
              <UiBadge v-else-if="m.tenantConfig?.enabled" variant="tag-green">включён</UiBadge>
            </div>
          </div>
        </div>
        <div class="mt-md flex items-center gap-2">
          <UiButton
            size="sm"
            :variant="m.tenantConfig?.enabled ? 'secondary' : 'primary'"
            :disabled="!m.allowedByPlan"
            @click="toggle(m.code, !m.tenantConfig?.enabled, m.tenantConfig?.config ?? {})"
          >
            {{ m.tenantConfig?.enabled ? 'Выключить' : 'Включить' }}
          </UiButton>
          <UiButton
            v-if="m.code === 'warranty-registration' && m.tenantConfig?.enabled"
            size="sm"
            variant="ghost"
            to="/dashboard/modules/warranty"
          >
            Регистрации →
          </UiButton>
          <UiButton
            v-if="m.code === 'feedback' && m.allowedByPlan"
            size="sm"
            variant="ghost"
            to="/dashboard/modules/feedback"
          >
            Настроить →
          </UiButton>
          <UiButton
            v-if="m.code === 'chat-consultant' && m.allowedByPlan"
            size="sm"
            variant="ghost"
            to="/dashboard/modules/support"
          >
            Настроить →
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
