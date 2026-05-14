<script setup lang="ts">
const steps = [
  {
    label: 'Шаг 01',
    title: 'Создайте или загрузите инструкцию',
    copy: 'Вы можете загрузить уже готовый файл с вашей инструкцией или создать ее с нуля в нашем редакторе. ИИ-ассистент поможет ее улучшить, превратит фотографии в профессиональные иллюстрации, подскажет как сделать инструкцию понятнее.',
    bullets: ['Сгенерируем инструкцию из DOC, PDF и других форматов', 'Встроенный ИИ-редактор изображений', 'Вносите правки и дополнения без дизайнера']
  },
  {
    label: 'Шаг 02',
    title: 'Приложите QR-код к заказу',
    copy: 'Это может быть наклейка на упаковке, буклет-вкладыш, краткое руководство, визитная карточка, нанесение на самом товаре или любой другой носитель. Выберите подходящий дизайн из нашей библиотеки и отправьте в печать.',
    bullets: ['Встроенный конструктор для создания уникальных дизайнов', 'Приложение для умной активации QR-кодов', 'Ссылку можно поменять даже после получения товара'],
    image: '/landing/step-2.png',
    imageAlt: 'Коробка с QR-кодом внутри заказа'
  },
  {
    label: 'Шаг 03',
    title: 'Клиент переходит по ссылке',
    copy: 'Когда покупатель знакомится с покупкой, вместо статичного PDF он видит профессионально подготовленную инструкцию, может задать вопросы по сборке, узнать больше о вашем товаре, совершить заказ на другие ваши товары.',
    bullets: ['Отвечайте на негатив до публикации плохого отзыва', 'Расскажите о скорых обновлениях в линейке товаров', 'Изменяйте инструкцию на основе обратной связи'],
    image: '/landing/step-3-2.png',
    imageAlt: 'Публичная инструкция с обратной связью и оффером'
  },
  {
    label: 'Шаг 04',
    title: 'Теперь это ваш покупатель',
    copy: 'Вы можете просматривать аналитику, делать рассылки по своим покупателям, дарить им промокоды или анонсировать новинки. Исправлять ошибки или проверять гипотезы без участия дизайнеров или печати новых тиражей.',
    bullets: ['Используйте данные для улучшения вашего продукта', 'Повышайте уровень продаж и рейтинг товаров', 'Работайте над узнаваемостью вашего бренда и репутацией'],

    image: '/landing/step-4.png',
    imageAlt: 'Аналитика и коммуникация с покупателями после покупки'
  }
]
</script>

<template>
  <section id="how" data-section="shot-order-flow" class="bg-canvas">
    <div class="container-page py-section-sm md:py-section-lg">
      <div class="mx-auto max-w-[900px] text-center">
        <LandingShotKicker label="Как работает" tone="pill" />
        <h2 class="mt-lg text-h2 text-navy">Ваш путь от идеи к продажи</h2>
        <!--<p class="mx-auto mt-md max-w-[900px] text-h5 font-medium leading-[1.55] text-steel">
          Не обязательно делать техническую инструкцию. Можно сразу предложить скидку на следующий заказ —
          покупатель сканирует QR и видит ваше предложение.
        </p>-->
      </div>

      <div class="mt-section">
        <article class="timeline-step grid lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10">
          <div class="timeline-rail">
            <div class="timeline-marker">01</div>
          </div>
          <div class="pb-xl md:pb-section-lg">
            <h3 class="flex min-h-12 items-center gap-md text-h4 text-navy">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-body-sm-md text-white lg:hidden">01</span>
              <span>{{ steps[0].title }}</span>
            </h3>
            <p class="mt-md max-w-[640px] text-body font-medium leading-[1.55] text-steel md:text-h5">{{ steps[0].copy }}</p>
            <ul class="mt-2xl flex flex-col items-start gap-sm">
              <li v-for="bullet in steps[0].bullets" :key="bullet" class="inline-flex items-center rounded-full bg-surface px-md py-xs text-body-sm-md text-charcoal">
                {{ bullet }}
              </li>
            </ul>
          </div>

          <div class="pb-section-lg lg:col-start-3 lg:row-start-1">
            <img
              src="/landing/step-1.png"
              alt="Мобильная инструкция рядом с товаром"
              class="h-full min-h-[440px] w-full rounded-2xl object-cover"
              draggable="false"
            >
          </div>
        </article>

        <!-- <div class="timeline-step grid lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10">
          <div class="timeline-rail" />
          <div class="col-span-1 flex justify-center pb-3xl lg:col-span-2 lg:col-start-2">
            <LandingMiniEditorPhone />
          </div>
        </div> -->

        <article
          v-for="(step, index) in steps.slice(1)"
          :key="step.label"
          class="timeline-step grid lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10"
        >
          <div class="timeline-rail">
            <div class="timeline-marker">{{ String(index + 2).padStart(2, '0') }}</div>
          </div>
          <div class="pb-xl md:pb-section-lg">
            <h3 class="flex min-h-12 items-center gap-md text-h4 text-navy">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-body-sm-md text-white lg:hidden">{{ String(index + 2).padStart(2, '0') }}</span>
              <span>{{ step.title }}</span>
            </h3>
            <p v-if="step.copy" class="mt-md max-w-[640px] text-body font-medium leading-[1.55] text-steel md:text-h5">{{ step.copy }}</p>
            <ul v-if="step.bullets" class="mt-2xl flex flex-col items-start gap-sm">
              <li v-for="bullet in step.bullets" :key="bullet" class="inline-flex items-center rounded-full bg-surface px-md py-xs text-body-sm-md text-charcoal">
                {{ bullet }}
              </li>
            </ul>
          </div>

          <div v-if="step.image" class="pb-section-lg lg:col-start-3 lg:row-start-1">
            <img
              :src="step.image"
              :alt="step.imageAlt"
              class="h-full min-h-[440px] w-full rounded-2xl object-cover"
              draggable="false"
              style="box-shadow:  0 0 10px 10px inset white;"
            >
          </div>

        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.timeline-rail {
  --timeline-marker-size: 48px;
  display: none;
}

@media (min-width: 1024px) {
  .timeline-rail {
    position: relative;
    display: flex;
    justify-content: center;
    align-self: stretch;
  }
}

@media (min-width: 1024px) {
  .timeline-rail::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 4px;
    transform: translateX(-50%);
    border-radius: 9999px;
    background: var(--color-primary);
  }
}

.timeline-step:first-child .timeline-rail::before {
  top: calc(var(--timeline-marker-size) / 2);
}

.timeline-step:last-child .timeline-rail::before {
  bottom: calc(100% - var(--timeline-marker-size) / 2);
}

@supports (animation-timeline: view()) {
  @media (min-width: 1024px) {
    .timeline-step > div:not(.timeline-rail) {
      animation: timeline-fade-in linear both;
      animation-timeline: view();
      animation-range: cover 0% cover 35%;
    }
  }
}

@keyframes timeline-fade-in {
  from {
    opacity: 0;
    transform: translateY(40px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .timeline-step > div:not(.timeline-rail) {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.timeline-marker {
  position: relative;
  z-index: 1;
  display: grid;
  width: var(--timeline-marker-size);
  height: var(--timeline-marker-size);
  place-items: center;
  border-radius: 9999px;
  background: var(--color-primary);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  box-shadow: rgba(15, 15, 15, 0.08) 0 4px 12px 0;
}

@media (min-width: 1024px) {
  .timeline-rail {
    padding-bottom: 200px;
  }

  .timeline-marker {
    position: sticky;
    top: 96px;
  }

  .timeline-step:last-child .timeline-rail {
    padding-bottom: 0;
  }

  .timeline-step:last-child .timeline-marker {
    position: relative;
    top: auto;
  }
}
</style>
