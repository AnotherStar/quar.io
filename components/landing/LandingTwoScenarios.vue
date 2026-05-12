<script setup lang="ts">
const scenarios = [
  {
    icon: 'lucide:package',
    tone: 'primary' as const,
    title: 'У меня сложный товар',
    body: 'Инструкция по сборке, настройка электроники, процесс подготовки к использованию. Покупатели пишут «непонятно» в отзывах, возвращают, ставят три звезды.',
    solution: 'quar.io: нормальная мобильная инструкция по QR. Обновляется без перепечатки коробок.',
    cta: 'Оцифровать инструкцию',
    href: '/auth/register'
  },
  {
    icon: 'lucide:monitor',
    tone: 'orange' as const,
    title: 'Продаю через маркетплейс',
    body: 'Wildberries, Ozon, Яндекс Маркет — после покупки клиент никак не связан с вами, а вы платите за это 30-50% комиссии с каждого заказа. У вас нет возможности повторно продать товар или рассказать о новинках.',
    solution: 'quar.io: QR в коробке — клиент попадает к вам напрямую. Повторная покупка без комиссии. Данные клиента у вас.',
    cta: 'Забрать клиента с маркетплейса',
    href: '/auth/register'
  }
]

const iconBg = {
  primary: 'bg-primary/10 text-primary',
  orange: 'bg-tint-peach text-brand-orange'
}
</script>

<template>
  <section class="bg-surface">
    <div class="container-page py-section-lg">
      <div class="max-w-3xl">
        <LandingShotKicker label="Для кого" tone="pill" />
        <h2 class="mt-lg text-h2 text-navy">Два сценария — одно решение</h2>
      </div>

      <div class="mt-section grid gap-md md:grid-cols-2">
        <article
          v-for="scenario in scenarios"
          :key="scenario.title"
          class="flex flex-col rounded-2xl border border-hairline bg-canvas p-2xl"
        >
          <div :class="['grid h-12 w-12 place-items-center rounded-xl', iconBg[scenario.tone]]">
            <Icon :name="scenario.icon" class="h-6 w-6" />
          </div>
          <h3 class="mt-lg text-h4 text-navy">{{ scenario.title }}</h3>
          <p class="mt-md text-body leading-relaxed text-slate">{{ scenario.body }}</p>

          <div class="mt-lg rounded-r-lg border-l-2 border-primary bg-primary/5 px-md py-md">
            <p class="text-caption-bold uppercase text-primary">Решение</p>
            <p class="mt-2 text-body leading-relaxed text-charcoal">{{ scenario.solution }}</p>
          </div>

          <div class="mt-xl">
            <UiButton :to="scenario.href" variant="primary">
              {{ scenario.cta }}
              <Icon name="lucide:arrow-right" class="h-4 w-4" />
            </UiButton>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
