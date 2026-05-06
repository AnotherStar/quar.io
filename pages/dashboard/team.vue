<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <div class="space-y-xl">
    <h1 class="text-h2 text-ink">Команда</h1>
    <UiAlert kind="info">
      Multi-user в схеме готов (роли OWNER / EDITOR / VIEWER через таблицу <code>Membership</code>).
      UI приглашений добавим в следующей итерации — см. <code>TODO.md → Multi-user</code>.
    </UiAlert>
  </div>
</template>
