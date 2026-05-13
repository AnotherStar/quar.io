<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Пользовательское соглашение — quar.io' })
</script>

<template>
  <article class="container-page mx-auto max-w-3xl py-section">
    <h1 class="text-h2 text-ink">Пользовательское соглашение</h1>
    <p class="mt-md text-body-sm text-steel">Версия 1.0 · последнее обновление: 13.05.2026</p>

    <div class="prose-mo mt-xl">
      <h2 class="text-h3 text-ink">1. Общие положения</h2>
      <p class="mt-sm text-body text-charcoal">
        Настоящее Соглашение регулирует отношения между сервисом quar.io (далее — «Сервис») и пользователем (далее — «Пользователь»),
        зарегистрировавшимся в Сервисе и использующим его функциональность.
      </p>

      <h2 class="mt-lg text-h3 text-ink">2. Регистрация</h2>
      <p class="mt-sm text-body text-charcoal">
        Регистрируясь в Сервисе, Пользователь подтверждает, что ознакомился с настоящим Соглашением и принимает его условия в полном объёме.
        Пользователь несёт ответственность за достоверность предоставленных данных и сохранность учётных данных.
      </p>

      <h2 class="mt-lg text-h3 text-ink">3. Использование Сервиса</h2>
      <p class="mt-sm text-body text-charcoal">
        Пользователь обязуется использовать Сервис в законных целях и не размещать материалы, нарушающие действующее законодательство
        Российской Федерации, права третьих лиц или причиняющие вред другим пользователям.
      </p>

      <h2 class="mt-lg text-h3 text-ink">4. Тарифы и оплата</h2>
      <p class="mt-sm text-body text-charcoal">
        Сервис предоставляется на условиях, описанных на странице тарифов. Бесплатные тарифы и пробный период не предполагают
        каких-либо обязательств Пользователя по оплате.
      </p>

      <h2 class="mt-lg text-h3 text-ink">5. Ответственность</h2>
      <p class="mt-sm text-body text-charcoal">
        Сервис не несёт ответственности за содержание инструкций и материалов, размещённых Пользователями. Ответственность за достоверность,
        полноту и законность размещаемого контента полностью лежит на Пользователе.
      </p>

      <h2 class="mt-lg text-h3 text-ink">6. Изменение условий</h2>
      <p class="mt-sm text-body text-charcoal">
        Сервис оставляет за собой право вносить изменения в настоящее Соглашение. Актуальная редакция Соглашения публикуется на данной странице.
      </p>

      <h2 class="mt-lg text-h3 text-ink">7. Контакты</h2>
      <p class="mt-sm text-body text-charcoal">
        По вопросам, связанным с настоящим Соглашением, пишите в нашу поддержку через
        <a href="https://t.me/quar_io_chat" class="text-link hover:underline" target="_blank" rel="noopener">Telegram</a>.
      </p>
    </div>
  </article>
</template>

<style scoped>
.prose-mo h2 { @apply mt-12 mb-3; }
.prose-mo p { @apply leading-relaxed mb-4; }
</style>
