<script setup lang="ts">
useHead({ title: 'Тарифы — quar.io' })

const { track } = useTrackGoal()
onMounted(() => track('pricing_view'))

function onTierClick(code: string) {
  track('pricing_plan_selected', { code })
}

const tiers = [
  {
    code: 'pilot',
    name: 'Пилот',
    price: '500 ₽',
    sub: 'разовый запуск',
    features: [
      'Перенос 5-10 инструкций',
      'QR-ссылки для карточки, вкладыша и поддержки',
      'Разбор текущих отзывов и вопросов',
      'Отчет по проблемным шагам через 2-4 недели',
      '1 месяц триала в кабинете'
    ]
  },
  {
    code: 'catalog',
    name: 'Каталог',
    price: '4 500 ₽',
    sub: 'в месяц',
    featured: true,
    features: [
      '50-200 инструкций',
      'Массовый импорт SKU и PDF',
      'Единый стиль мобильных инструкций',
      'Библиотека быстрых ссылок для поддержки',
      'Регулярные отчеты по рисковым товарам'
    ]
  },
  {
    code: 'brand',
    name: 'Бренд',
    price: 'от 14 500 ₽',
    sub: 'для зрелого каталога',
    features: [
      'Брендирование публичных инструкций',
      'Переводы и языковые версии',
      'Роли команды и история правок',
      'Расширенная аналитика',
      'Интеграции после подтвержденного сценария'
    ]
  }
]
</script>

<template>
  <div class="container-page py-section-lg">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-caption-bold uppercase text-hairline-strong">Пакеты запуска</p>
      <h1 class="mt-3 text-h1 text-ink">Начните с пилота на товарах, где инструкция уже влияет на отзывы.</h1>
      <p class="mt-4 text-subtitle text-steel">
        1 месяц триала входит в запуск: перенесите первые инструкции, поставьте QR-ссылки
        в реальные каналы и посмотрите, какие шаги мешают покупателям.
      </p>
    </div>

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
        <UiButton to="/auth/register" class="mt-md" block :variant="t.featured ? 'primary' : 'secondary'" @click="onTierClick(t.code)">
          {{ t.code === 'pilot' ? 'Запустить триал' : 'Обсудить пакет' }}
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
