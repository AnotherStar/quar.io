<script setup lang="ts">
const scenarios = [
  {
    icon: 'lucide:store',
    tone: 'warning' as const,
    title: 'Продаю через маркетплейс',
    body: 'Wildberries, Ozon, Яндекс Маркет — после покупки клиент никак не связан с вами, а вы платите за это 30-50% комиссии с каждого заказа. У вас нет возможности повторно продать товар или рассказать о новинках.',
    solution: 'quar.io: Клиент попадает напрямую к вам. Возможность повторной покупки без комиссии. Данные клиента у вас.',
    cta: 'Забрать клиента с маркетплейса',
    href: '/auth/register'
  },
  {
    icon: 'lucide:package',
    tone: 'primary' as const,
    title: 'Мне нужны понятные инструкции',
    body: 'Инструкция по сборке, настройка электроники, процесс подготовки к использованию. Покупатели пишут «непонятно» в отзывах, возвращают, ставят три звезды. Но чаще всего проблема в том, что инструкция не понятна.',
    solution: 'quar.io: Понятная онлайн инструкция по QR. Обновляется без перепечатки тиражей и всегда актуальна.',
    cta: 'Оцифровать инструкцию',
    href: '/auth/register'
  }
]

const iconTone = {
  primary: 'bg-tint-sky text-primary',
  warning: 'bg-tint-peach text-warning'
}
</script>

<template>
  <section class="bg-[linear-gradient(180deg,var(--color-surface-soft)_0%,var(--color-canvas)_100%)]">
    <div class="container-page pb-hero pt-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="mt-3 text-h2 text-navy">Два сценария — одно решение</h2>
        <Icon name="lucide:split" class="mx-auto mt-lg h-12 w-12 rotate-180 text-primary" />
      </div>

      <div class="mt-section grid gap-2xl md:grid-cols-2">
        <article
          v-for="scenario in scenarios"
          :key="scenario.title"
          class="flex flex-col rounded-2xl bg-surface p-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_-6px_rgba(70,55,40,0.18)]"
        >
          <div class="flex items-center gap-md">
            <div :class="['grid h-12 w-12 shrink-0 place-items-center rounded-full', iconTone[scenario.tone]]">
              <Icon :name="scenario.icon" class="h-6 w-6" />
            </div>
            <h3 class="text-h4 text-navy">{{ scenario.title }}</h3>
          </div>
          <p class="mt-md max-w-[560px] text-body leading-relaxed text-slate">{{ scenario.body }}</p>
          <p class="mt-lg max-w-[560px] border-l-2 border-primary pl-md text-body font-medium leading-relaxed text-ink">
            {{ scenario.solution }}
          </p>
          <div class="mt-auto pt-xl">
            <UiButton :to="scenario.href" class="uppercase tracking-wide" variant="primary" block>
              {{ scenario.cta }}
              <Icon name="lucide:arrow-right" class="h-4 w-4" />
            </UiButton>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
