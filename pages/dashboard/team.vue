<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <div>
    <PageHeader icon="lucide:users" title="Команда" />
    <UiAlert kind="info" class="mt-sm">
      Multi-user в схеме готов (роли OWNER / EDITOR / VIEWER через таблицу <code>Membership</code>).
      UI приглашений добавим в следующей итерации — см. <code>TODO.md → Multi-user</code>.
    </UiAlert>
  </div>
</template>
