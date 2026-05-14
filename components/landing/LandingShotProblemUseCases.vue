<script setup lang="ts">
const cards = [
  {
    icon: 'lucide:package',
    iconTone: 'text-primary bg-primary/10',
    title: 'У меня сложный товар',
    copy: 'Силиконовый клей, электроника, сборная мебель. Покупатели пишут "непонятно как пользоваться" в отзывах, возвращают, ставят три звезды.',
    quote: 'quar.io: нормальная мобильная инструкция по QR. Обновляется без перепечатки коробок.',
    cta: 'Оцифровать инструкцию'
  },
  {
    icon: 'lucide:store',
    iconTone: 'text-warning bg-warning/10',
    title: 'Продаю через маркетплейс',
    copy: 'Wildberries, Ozon, Яндекс Маркет. Плачу 15-25% с каждого заказа. Клиент купил — ушёл. Купит снова — заплачу снова.',
    quote: 'quar.io: QR в коробке, клиент попадает к вам напрямую. Повторная покупка — без комиссии. Данные клиента — у вас.',
    cta: 'Забрать клиента с маркетплейса'
  }
]
</script>

<template>
  <section data-section="shot-problem-use-cases" class="border-b border-hairline bg-surface">
    <div class="container-page grid gap-md py-section-lg md:grid-cols-2">
      <article
        v-for="card in cards"
        :key="card.title"
        class="rounded-2xl border border-hairline bg-canvas p-xl md:p-2xl"
      >
        <div class="grid h-16 w-16 place-items-center rounded-xl" :class="card.iconTone">
          <Icon :name="card.icon" class="h-8 w-8" />
        </div>
        <h2 class="mt-10 text-h3 text-navy">{{ card.title }}</h2>
        <p class="mt-lg max-w-[680px] text-h4 font-medium leading-[1.45] text-steel">
          {{ card.copy }}
        </p>
        <p class="mt-8 max-w-[690px] border-l-4 border-primary pl-lg text-h4 font-semibold leading-[1.45] text-ink">
          {{ card.quote }}
        </p>
        <LandingShotButton class="mt-8" size="md" variant="secondary">
          {{ card.cta }}
          <Icon name="lucide:arrow-right" class="h-6 w-6" />
        </LandingShotButton>
      </article>
    </div>
  </section>
</template>
