<script setup lang="ts">
const cards = [
  {
    icon: 'lucide:scan-line',
    title: 'Инструкция всегда под рукой',
    copy: 'Если QR нанесён на устройство или вкладыш, покупателю не нужно искать PDF, коробку или переписку.'
  },
  {
    icon: 'lucide:sparkles',
    title: 'AI-конструктор',
    copy: 'Загрузи PDF, фото или просто напиши название товара — AI соберёт мобильную инструкцию за минуту. Без дизайнера, без верстки, без пересборки PDF.'
  },
  {
    icon: 'lucide:bar-chart-3',
    title: 'Где покупатель застрял — видно сразу',
    copy: 'Какие шаги не дочитывают, что отмечают непонятным, сколько дошли до оффера. Понятно, что чинить первым.'
  }
]
</script>

<template>
  <section data-section="shot-bonus-stack" class="border-b border-hairline bg-canvas">
    <div class="container-page grid gap-12 py-section-lg lg:grid-cols-[0.95fr_1.05fr]">
      <div>
        <LandingShotKicker label="Что получается бонусом" />
        <h2 class="mt-10 max-w-[620px] text-[44px] font-semibold leading-[1.16] text-navy md:text-[56px]">
          Одна QR-точка закрывает инструкцию, поддержку, аналитику и повторную покупку.
        </h2>
        <p class="mt-8 max-w-[560px] text-h4 font-medium leading-[1.6] text-slate">
          Раньше у продавца не было способа дотянуться до покупателя после маркетплейса.
          Теперь один вкладыш в коробку — и контакт ваш.
        </p>
      </div>

      <div class="grid gap-lg">
        <article
          v-for="card in cards"
          :key="card.title"
          class="rounded-2xl bg-surface p-xl md:p-2xl"
        >
          <Icon :name="card.icon" class="h-8 w-8 text-primary" />
          <h3 class="mt-8 text-h3 text-navy">{{ card.title }}</h3>
          <p class="mt-4 text-h5 font-medium leading-[1.55] text-slate">{{ card.copy }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
