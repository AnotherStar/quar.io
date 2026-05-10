<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant } = useAuthState()
const warrantyKey = computed(() => `warranty-regs-${currentTenant.value?.id ?? 'none'}`)
const { data } = await useAsyncData(
  warrantyKey,
  () => api<{ items: any[] }>('/api/modules/warranty/registrations'),
  {
    default: () => ({ items: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

function downloadCsv() {
  const items = data.value?.items ?? []
  const header = ['createdAt', 'customerName', 'customerEmail', 'customerPhone', 'serialNumber', 'purchaseDate', 'instructionTitle', 'instructionSlug']
  const rows = items.map((r) => [
    new Date(r.createdAt).toISOString(),
    r.customerName ?? '',
    r.customerEmail ?? '',
    r.customerPhone ?? '',
    r.serialNumber ?? '',
    r.purchaseDate ? new Date(r.purchaseDate).toISOString() : '',
    r.instruction?.title ?? '',
    r.instruction?.slug ?? ''
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `warranty-registrations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:shield-check" title="Регистрации гарантии">
      <template #actions>
        <UiButton variant="secondary" :disabled="!data?.items.length" @click="downloadCsv">
          <Icon name="lucide:download" class="h-4 w-4" />
          Скачать CSV
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm">
      <table v-if="data?.items.length" class="w-full">
        <thead>
          <tr class="border-b border-hairline text-caption text-steel uppercase">
            <th class="pb-sm text-left">Когда</th>
            <th class="pb-sm text-left">Клиент</th>
            <th class="pb-sm text-left">Контакты</th>
            <th class="pb-sm text-left">Серийный №</th>
            <th class="pb-sm text-left">Покупка</th>
            <th class="pb-sm text-left">Инструкция</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in data.items" :key="r.id" class="border-b border-hairline-soft align-top">
            <td class="py-sm text-caption text-steel whitespace-nowrap">
              {{ new Date(r.createdAt).toLocaleString() }}
            </td>
            <td class="py-sm text-body-sm-md text-ink">{{ r.customerName }}</td>
            <td class="py-sm text-body-sm text-charcoal">
              <div>{{ r.customerEmail }}</div>
              <div v-if="r.customerPhone" class="text-steel">{{ r.customerPhone }}</div>
            </td>
            <td class="py-sm text-body-sm font-mono text-charcoal">{{ r.serialNumber || '—' }}</td>
            <td class="py-sm text-body-sm text-charcoal">
              {{ r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : '—' }}
            </td>
            <td class="py-sm text-body-sm">
              <NuxtLink
                v-if="r.instruction"
                :to="`/dashboard/instructions/${r.instruction.id}/edit`"
                class="text-link hover:underline"
              >
                {{ r.instruction.title }}
              </NuxtLink>
              <span v-else class="text-steel">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="py-md text-body text-steel">
        Пока нет регистраций. Они появятся, когда покупатели отправят форму гарантии на опубликованной инструкции.
      </p>
    </div>
  </div>
</template>
