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
    icon: 'lucide:store',
    tone: 'warning' as const,
    title: 'Продаю через маркетплейс',
    body: 'Wildberries, Ozon, Яндекс Маркет — после покупки клиент никак не связан с вами, а вы платите за это 30-50% комиссии с каждого заказа. У вас нет возможности повторно продать товар или рассказать о новинках.',
    solution: 'quar.io: QR в коробке — клиент попадает к вам напрямую. Повторная покупка без комиссии. Данные клиента у вас.',
    cta: 'Забрать клиента с маркетплейса',
    href: '/auth/register'
  }
]

const iconTone = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning'
}
</script>

<template>
  <section class="bg-[linear-gradient(180deg,var(--color-surface-soft)_0%,var(--color-canvas)_100%)]">
    <div class="container-page pb-hero pt-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase text-steel">Для кого</p>
        <h2 class="mt-3 text-h2 text-navy">Два сценария — одно решение</h2>
        <p class="mt-md text-h5 font-medium leading-[1.55] text-slate">
          Один QR в коробке закрывает обе боли: сложный товар без понятной инструкции и потерю клиента после маркетплейса.
        </p>
      </div>

      <div class="mt-section grid gap-2xl md:grid-cols-2">
        <article v-for="scenario in scenarios" :key="scenario.title">
          <div class="flex items-center gap-md">
            <div :class="['grid h-12 w-12 shrink-0 place-items-center rounded-xl', iconTone[scenario.tone]]">
              <Icon :name="scenario.icon" class="h-6 w-6" />
            </div>
            <h3 class="text-h4 text-navy">{{ scenario.title }}</h3>
          </div>
          <p class="mt-md max-w-[560px] text-body leading-relaxed text-slate">{{ scenario.body }}</p>
          <p class="mt-lg max-w-[560px] border-l-2 border-primary pl-md text-body font-medium leading-relaxed text-ink">
            {{ scenario.solution }}
          </p>
          <UiButton :to="scenario.href" class="mt-xl" variant="primary">
            {{ scenario.cta }}
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </UiButton>
        </article>
      </div>
    </div>
  </section>
</template>
