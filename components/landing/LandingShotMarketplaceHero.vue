<template>
  <section data-section="shot-marketplace-hero" class="bg-navy text-white">
    <div class="container-page grid gap-12 py-section-lg lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div>
        <LandingShotKicker label="AI-редактор · QR в коробке · прямые продажи" on-dark />
        <h1 class="mt-10 max-w-[720px] text-[44px] font-semibold leading-[1.08] md:text-[64px]">
          Инструкция за минуту.<br>
          Повторный заказ — без <span class="text-primary">маркетплейса</span>.
        </h1>
        <p class="mt-8 max-w-[670px] text-h4 font-medium leading-[1.55] text-white/64">
          AI собирает мобильную инструкцию из любых материалов или с нуля.
          QR в коробке делает покупателя вашим: повторная покупка идёт к вам напрямую, без комиссии.
        </p>
        <div class="mt-10 flex flex-col gap-md sm:max-w-[500px]">
          <LandingShotButton>
            Запустить триал на 1 месяц
            <Icon name="lucide:arrow-right" class="h-6 w-6" />
          </LandingShotButton>
          <LandingShotButton to="/pricing" size="md" variant="outline-on-dark">Посмотреть пакеты</LandingShotButton>
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-white/16 bg-canvas text-ink shadow-mockup">
        <div class="flex items-center gap-sm border-b border-hairline px-xl py-md">
          <span class="h-md w-md rounded-full bg-[#ff5f57]" />
          <span class="h-md w-md rounded-full bg-[#febc2e]" />
          <span class="h-md w-md rounded-full bg-[#28c840]" />
          <span class="ml-lg font-mono text-h5 font-semibold text-hairline-strong">quar.io/seal-250/setup</span>
        </div>
        <div class="grid md:grid-cols-[1.35fr_1fr]">
          <div class="border-b border-hairline p-xl md:border-b-0 md:border-r md:p-2xl">
            <div class="flex items-start justify-between gap-lg">
              <h2 class="text-h5 text-charcoal">Мобильная<br>инструкция</h2>
              <span class="rounded-md bg-success/10 px-md py-sm text-body-sm-md text-success">QR<br>активен</span>
            </div>
            <div class="mt-xl rounded-lg bg-surface p-lg">
              <p class="text-h5 text-ink">Шаг 3. Нанесите клей</p>
              <p class="mt-sm text-body text-steel">Тонкий слой по периметру. Отступ от края — 5 мм.</p>
            </div>
            <div class="mt-lg rounded-lg bg-tint-yellow p-lg">
              <p class="text-body-sm-md text-warning">Важно</p>
              <p class="mt-sm text-body text-steel">Не применять при температуре ниже +5°C</p>
            </div>
            <div class="mt-lg rounded-lg bg-surface p-lg">
              <p class="text-h5 text-ink">Шаг 4. Прижмите на 30 сек</p>
              <p class="mt-sm text-body text-steel">Совместите поверхности до полного контакта.</p>
            </div>
            <div class="mt-lg grid grid-cols-3 gap-sm text-center text-caption-bold uppercase text-steel">
              <span class="rounded-sm bg-tint-gray py-xs">понятно</span>
              <span class="rounded-sm bg-tint-gray py-xs">непонятно</span>
              <span class="rounded-sm bg-tint-gray py-xs">вопрос</span>
            </div>
          </div>

          <div class="p-xl md:p-2xl">
            <div class="flex items-start justify-between gap-md">
              <h2 class="text-h5 text-charcoal">Канал<br>после<br>покупки</h2>
              <span class="rounded-md bg-primary/10 px-md py-sm text-body-sm-md text-primary">прямые<br>продажи</span>
            </div>
            <div class="mt-10 divide-y divide-hairline text-body">
              <p class="py-md">Покупатель не понял шаг <span class="float-right text-body-sm-md text-warning">ответить</span></p>
              <p class="py-md">Инструкция обновлена <span class="float-right text-body-sm-md text-primary">без печати</span></p>
              <p class="py-md">Частый вопрос: металл? <span class="float-right text-body-sm-md text-primary">добавить в шаг</span></p>
            </div>
            <div class="mt-lg rounded-lg bg-primary/10 p-lg text-center">
              <p class="text-body-sm-md text-primary">Только для вас</p>
              <p class="mt-sm text-[30px] font-semibold text-primary">-15%</p>
              <p class="mt-sm text-body-sm text-steel">На следующий тюбик напрямую</p>
              <button class="mt-md h-14 rounded-md bg-primary px-lg text-body-sm-md text-white">
                Заказать за 340 ₽
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
