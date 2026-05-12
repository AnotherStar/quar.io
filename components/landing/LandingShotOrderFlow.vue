<script setup lang="ts">
const steps = [
  {
    label: 'Шаг 01',
    title: 'Создайте или загрузите инструкцию',
    copy: 'Вы можете загрузить уже готовый файл с вашей инструкцией или создать ее с нуля в нашем редакторе. ИИ-ассистент поможет ее улучшить, превратит фотографии в профессиональные иллюстрации, подскажет как сделать инструкцию понятнее.',
    bullets: ['Сгенерируем инструкцию из файла DOC, PDF', 'Встроенный редактор изображений', 'Редактируйте без дизайнера']
  },
  {
    label: 'Шаг 02',
    title: 'Приложите QR-код к заказу',
    copy: 'Это может быть наклейка, буклет, краткое руководство или любой другой носитель.',
    bullets: ['Библиотека из 50+ работающих дизайнов', 'Приложение для умной активации QR-кодов', 'Ссылку можно поменять даже после получения товара'],
    image: '/landing/step-2.png',
    imageAlt: 'Коробка с QR-кодом внутри заказа'
  },
  {
    label: 'Шаг 03',
    title: 'Клиент переходит по ссылке',
    copy: 'Вместо статичного PDF ваш покупатель видит профессионально подготовленную инструкцию, может задать вопросы по сборке, подписаться на вашу рассылку, совершить заказ на другие ваши товары.',
    bullets: ['Отвечайте на негатив до публикации отзыва', 'Предлагайте другие ваши товары или скидки на повторный заказ', 'Изменяйте инструкцию на основе обратной связи'],
    image: '/landing/step-3-2.png',
    imageAlt: 'Публичная инструкция с обратной связью и оффером'
  },
  {
    label: 'Шаг 04',
    title: 'Теперь это ваш покупатель',
    copy: 'Вы можете просматривать аналитику, делать рассылки по своим покупателям, дарить им промокоды или анонсировать новинки. Исправлять ошибки или проверять гипотезы без участия дизайнеров или печати новых тиражей.',
    image: '/landing/step-4.png',
    imageAlt: 'Аналитика и коммуникация с покупателями после покупки'
  }
]
</script>

<template>
  <section id="how" data-section="shot-order-flow" class="bg-canvas">
    <div class="container-page py-section-lg">
      <div class="mx-auto max-w-[900px] text-center">
        <LandingShotKicker label="Как работает" tone="pill" />
        <h2 class="mt-lg text-h2 text-navy">Ваш путь от идеи к продажи</h2>
        <p class="mx-auto mt-md max-w-[900px] text-h5 font-medium leading-[1.55] text-slate">
          Не обязательно делать техническую инструкцию. Можно сразу предложить скидку на следующий заказ —
          покупатель сканирует QR и видит ваше предложение.
        </p>
      </div>

      <div class="mt-section">
        <article class="timeline-step grid grid-cols-[48px_minmax(0,1fr)] gap-x-md lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10">
          <div class="timeline-rail">
            <div class="timeline-marker">01</div>
          </div>
          <div class="pb-section-lg">
            <h3 class="flex min-h-12 items-center text-h4 text-navy">{{ steps[0].title }}</h3>
            <p class="mt-md max-w-[640px] text-h5 font-medium leading-[1.55] text-slate">{{ steps[0].copy }}</p>
            <ul class="mt-lg grid gap-sm text-body-sm-md text-charcoal">
              <li v-for="bullet in steps[0].bullets" :key="bullet" class="flex items-center gap-sm">
                <span class="h-sm w-sm rounded-full bg-primary" />
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

        <!-- <div class="timeline-step grid grid-cols-[48px_minmax(0,1fr)] gap-x-md lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10">
          <div class="timeline-rail" />
          <div class="col-span-1 flex justify-center pb-3xl lg:col-span-2 lg:col-start-2">
            <LandingMiniEditorPhone />
          </div>
        </div> -->

        <article
          v-for="(step, index) in steps.slice(1)"
          :key="step.label"
          class="timeline-step grid grid-cols-[48px_minmax(0,1fr)] gap-x-md lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10"
        >
          <div class="timeline-rail">
            <div class="timeline-marker">{{ String(index + 2).padStart(2, '0') }}</div>
          </div>
          <div class="pb-section-lg">
            <h3 class="flex min-h-12 items-center text-h4 text-navy">{{ step.title }}</h3>
            <p v-if="step.copy" class="mt-md max-w-[640px] text-h5 font-medium leading-[1.55] text-slate">{{ step.copy }}</p>
            <ul v-if="step.bullets" class="mt-lg grid gap-sm text-body-sm-md text-charcoal">
              <li v-for="bullet in step.bullets" :key="bullet" class="flex items-center gap-sm">
                <span class="h-sm w-sm rounded-full bg-primary" />
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
  position: relative;
  display: flex;
  justify-content: center;
  align-self: stretch;
}

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

.timeline-step:first-child .timeline-rail::before {
  top: calc(var(--timeline-marker-size) / 2);
}

.timeline-step:last-child .timeline-rail::before {
  bottom: calc(100% - var(--timeline-marker-size) / 2);
}

@supports (animation-timeline: view()) {
  .timeline-step > div:not(.timeline-rail) {
    animation: timeline-fade-in linear both;
    animation-timeline: view();
    animation-range: cover 0% cover 35%;
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
  .timeline-marker {
    position: sticky;
    top: 96px;
  }

  .timeline-step:last-child .timeline-marker {
    position: relative;
    top: auto;
  }
}
</style>
