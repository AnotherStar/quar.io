<script setup lang="ts">
useHead({ title: 'Тарифы — quar.io' })

const tiers = [
  {
    code: 'free',
    name: 'Free',
    price: '0 ₽',
    sub: 'навсегда',
    features: [
      'До 3 инструкций',
      'Notion-like редактор',
      'Версионирование',
      'Базовая аналитика (30 дней)',
      'Публичные страницы по slug'
    ]
  },
  {
    code: 'plus',
    name: 'Plus',
    price: '1 900 ₽',
    sub: 'в месяц',
    featured: true,
    features: [
      'До 50 инструкций',
      'Кастомные секции',
      'Модуль гарантии',
      'Workflow одобрения',
      'Аналитика 1 год',
      'До 3 пользователей'
    ]
  },
  {
    code: 'business',
    name: 'Business',
    price: '4 900 ₽',
    sub: 'в месяц',
    features: [
      'Безлимит инструкций',
      'Все модули включая чат',
      'Кастомный домен',
      'Безлимитная аналитика',
      'До 25 пользователей',
      'API + webhooks (скоро)'
    ]
  }
]
</script>

<template>
  <div class="container-page py-section-lg">
    <h1 class="text-h1 text-ink text-center">Простые тарифы</h1>
    <p class="mt-3 text-subtitle text-slate text-center">Старт бесплатно. Платный тариф открывает кастомные блоки и модули.</p>

    <div class="mt-section grid grid-cols-1 gap-md md:grid-cols-3">
      <div
        v-for="t in tiers"
        :key="t.code"
        :class="[
          'rounded-lg p-2xl',
          t.featured ? 'border-2 border-primary bg-surface' : 'border border-hairline bg-canvas'
        ]"
      >
        <div class="flex items-start justify-between">
          <h3 class="text-h3">{{ t.name }}</h3>
          <UiBadge v-if="t.featured" variant="popular">Популярно</UiBadge>
        </div>
        <p class="mt-md text-h2">{{ t.price }}</p>
        <p class="text-caption text-steel">{{ t.sub }}</p>
        <UiButton :to="t.code === 'free' ? '/auth/register' : '/auth/register'" class="mt-md" block :variant="t.featured ? 'primary' : 'secondary'">
          {{ t.code === 'free' ? 'Начать' : 'Выбрать' }}
        </UiButton>
        <ul class="mt-md space-y-2">
          <li v-for="f in t.features" :key="f" class="flex items-start gap-2 text-body-sm text-charcoal">
            <span class="text-success">✓</span><span>{{ f }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
