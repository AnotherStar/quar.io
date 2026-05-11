<script setup lang="ts">
const options = [
  { icon: 'lucide:upload', tag: 'Есть PDF или фото', copy: 'AI разбирает на шаги и собирает мобильную страницу' },
  { icon: 'lucide:sparkles', tag: 'Нет материалов', copy: 'Пишешь название товара — AI составляет инструкцию сам, редактируешь под себя' },
  { icon: 'lucide:tag', tag: 'Только оффер', copy: 'Скидка 15% на повторный заказ — без инструкции, сразу к делу' }
]

const steps = [
  {
    label: 'Шаг 01',
    title: 'Выбираешь, что откроет QR',
    copy: 'Инструкция, предложение со скидкой или и то, и другое. AI-редактор соберёт страницу из любых материалов — или с нуля, если материалов нет.'
  },
  {
    label: 'Шаг 02',
    title: 'Вкладываешь QR в коробку',
    copy: 'Один вкладыш или наклейка на упаковку. Если страница обновилась — QR менять не нужно, он ведёт на новую версию.',
    bullets: ['Уникальный код на каждый SKU', 'Партия или конкретная единица', 'Коробки перепечатывать не нужно']
  },
  {
    label: 'Шаг 03',
    title: 'Покупатель сканирует — заказывает напрямую',
    copy: 'Клей подсыхает, человек сидит с телефоном — в этот момент он видит вашу скидку. Заказ идёт к вам, без маркетплейса и без комиссии.',
    bullets: ['Данные клиента — у вас', 'Повторная покупка без комиссии', 'Сопутствующий товар рядом']
  }
]
</script>

<template>
  <section id="how" data-section="shot-order-flow" class="border-b border-hairline bg-canvas">
    <div class="container-page py-section-lg">
      <LandingShotKicker label="Как работает" tone="pill" />
      <h2 class="mt-lg text-h2 text-navy">От коробки до повторного заказа</h2>
      <p class="mt-md max-w-[900px] text-h5 font-medium leading-[1.55] text-slate">
        Не обязательно делать инструкцию. Можно сразу предложить скидку на следующий заказ —
        покупатель сканирует QR и видит оффер.
      </p>

      <div class="mt-section space-y-3xl">
        <article class="grid gap-10 border-b border-hairline pb-3xl lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <p class="text-caption-bold uppercase text-steel">{{ steps[0].label }}</p>
            <h3 class="mt-md text-h4 text-navy">{{ steps[0].title }}</h3>
            <p class="mt-md max-w-[640px] text-h5 font-medium leading-[1.55] text-slate">{{ steps[0].copy }}</p>
            <div class="mt-lg grid max-w-[620px] gap-sm">
              <div
                v-for="option in options"
                :key="option.tag"
                class="grid grid-cols-[32px_1fr] gap-md rounded-lg bg-surface p-md"
              >
                <Icon :name="option.icon" class="mt-1 h-5 w-5 text-primary" />
                <div>
                  <span class="rounded-sm bg-primary/10 px-sm py-xxs text-body-sm-md text-primary">{{ option.tag }}</span>
                  <p class="mt-sm text-body-sm-md leading-relaxed text-slate">{{ option.copy }}</p>
                </div>
              </div>
            </div>
          </div>

          <LandingShotPhone class="mx-auto">
            <div class="rounded-lg bg-navy-deep p-sm">
              <div class="rounded-md bg-white/8 p-sm">
                <p class="text-caption-bold text-white/45">Вариант А — инструкция</p>
                <ol class="mt-sm space-y-sm text-[11px] font-semibold text-white/78">
                  <li class="flex gap-xs"><span class="grid h-5 w-5 place-items-center rounded-full bg-primary text-white">1</span>Очистите поверхность от пыли</li>
                  <li class="flex gap-xs"><span class="grid h-5 w-5 place-items-center rounded-full bg-primary text-white">2</span>Нанесите клей тонким слоем</li>
                  <li class="flex gap-xs"><span class="grid h-5 w-5 place-items-center rounded-full bg-white text-primary">3</span>Прижмите на 30 секунд</li>
                </ol>
              </div>
              <div class="mt-sm rounded-md bg-tint-yellow p-sm text-warning">
                <p class="text-[11px] font-semibold">Вариант Б — оффер</p>
              </div>
              <div class="mt-sm rounded-md bg-white/8 p-sm">
                <p class="text-[22px] font-semibold text-primary">-15%</p>
                <p class="mt-xs text-[11px] font-semibold text-white/75">На следующий заказ напрямую у нас</p>
                <p class="mt-sm text-center text-[10px] font-semibold text-white/75">PROMO-WB15</p>
                <button class="mt-sm h-11 w-full rounded-md bg-primary text-[11px] font-semibold text-white">Заказать со скидкой</button>
              </div>
            </div>
          </LandingShotPhone>
        </article>

        <article
          v-for="step in steps.slice(1)"
          :key="step.label"
          class="grid gap-10 border-b border-hairline pb-3xl lg:grid-cols-[1fr_280px] lg:items-center"
        >
          <div>
            <p class="text-caption-bold uppercase text-steel">{{ step.label }}</p>
            <h3 class="mt-md text-h4 text-navy">{{ step.title }}</h3>
            <p class="mt-md max-w-[640px] text-h5 font-medium leading-[1.55] text-slate">{{ step.copy }}</p>
            <ul v-if="step.bullets" class="mt-lg grid gap-sm text-body-sm-md text-charcoal">
              <li v-for="bullet in step.bullets" :key="bullet" class="flex items-center gap-sm">
                <span class="h-sm w-sm rounded-full bg-primary" />
                {{ bullet }}
              </li>
            </ul>
          </div>

          <div v-if="step.label === 'Шаг 02'" class="mx-auto text-center">
            <div class="grid h-28 w-28 place-items-center rounded-lg border border-hairline bg-navy">
              <Icon name="lucide:qr-code" class="h-20 w-20 text-white" />
            </div>
            <p class="mt-md text-caption-bold text-steel">Вкладыш или наклейка<br>на упаковку</p>
            <span class="mt-sm inline-flex rounded-sm bg-primary/10 px-sm py-xxs text-caption-bold text-primary">SKU: CLR-SEAL-250</span>
          </div>

          <LandingShotPhone v-else class="mx-auto">
            <div class="space-y-sm rounded-lg bg-navy-deep p-sm">
              <div class="rounded-md bg-white/8 p-sm">
                <span class="rounded-sm bg-tint-yellow px-xs py-xxs text-[10px] font-semibold text-warning">Только для вас</span>
                <p class="mt-sm text-[24px] font-semibold text-primary">-15%</p>
                <p class="mt-xs text-[11px] font-semibold text-white/75">Следующий тюбик герметика со скидкой.</p>
                <button class="mt-sm h-11 w-full rounded-md bg-primary text-[11px] font-semibold text-white">Заказать за 340 ₽</button>
              </div>
              <div class="rounded-md bg-white/8 p-sm text-white/75">
                <p class="text-[11px]">Или добавить сопутствующее</p>
                <p class="mt-xs text-[13px] font-semibold text-white">Набор для сложных поверхностей</p>
                <p class="mt-sm text-center text-[11px] text-primary">Добавить · 890 ₽</p>
              </div>
            </div>
          </LandingShotPhone>
        </article>
      </div>
    </div>
  </section>
</template>
