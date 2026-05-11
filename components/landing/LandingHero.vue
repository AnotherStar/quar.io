<template>
  <section class="border-b border-hairline bg-canvas">
    <div class="container-page grid gap-10 py-section-lg lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
      <div>
        <p class="text-micro uppercase text-steel">Инструкции, AI и QR после покупки</p>
        <h1 class="mt-5 max-w-3xl text-[40px] font-semibold leading-[1.08] text-navy md:text-[52px]">
          quar.io превращает вопросы покупателей в продажи.
        </h1>
        <p class="mt-6 max-w-2xl text-subtitle text-slate">
          Когда покупатель сканирует QR на товаре, quar.io открывает не статичный PDF, а живой канал:
          инструкцию, AI-помощника, обратную связь, прямые допродажи и аналитику того, что понятно, а что нет.
        </p>

        <LandingCtaButtons class="mt-8" />
      </div>

      <LandingMockupFrame>
        <div class="grid gap-lg bg-surface-soft p-lg md:grid-cols-[0.95fr_1.05fr] md:p-2xl">
          <div class="rounded-lg bg-canvas p-md shadow-subtle">
            <div class="flex items-center justify-between gap-md">
              <p class="text-caption-bold text-charcoal">Мобильная инструкция</p>
              <span class="rounded-sm bg-surface px-sm py-xxs text-micro text-slate">QR активен</span>
            </div>

            <div class="mt-md rounded-md border border-hairline bg-canvas p-md">
              <p class="text-h5 text-navy">Шаг 4. Зафиксируйте направляющую</p>
              <p class="mt-2 text-body-sm text-slate">
                Совместите отверстия до щелчка. Если деталь идет туго, проверьте сторону крепления.
              </p>
              <div class="mt-md rounded-md bg-surface p-sm">
                <p class="text-caption-bold text-charcoal">Важно</p>
                <p class="mt-1 text-caption text-slate">Не затягивайте винт до установки второй направляющей.</p>
              </div>
              <div class="mt-md grid grid-cols-3 gap-xs text-center text-micro text-slate">
                <span class="rounded-sm bg-surface px-xs py-xxs">полезно</span>
                <span class="rounded-sm bg-surface px-xs py-xxs">непонятно</span>
                <span class="rounded-sm bg-surface px-xs py-xxs">ошибка</span>
              </div>
            </div>
          </div>

          <div class="space-y-md">
            <div class="rounded-lg border border-hairline bg-canvas p-lg">
              <div class="flex items-start justify-between gap-md">
                <div>
                  <p class="text-caption-bold uppercase text-steel">Канал после покупки</p>
                  <h2 class="mt-2 text-h3 text-navy">Вопрос, правка, допродажа</h2>
                </div>
                <div class="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-ink text-micro text-white">
                  QR
                </div>
              </div>

              <div class="mt-lg space-y-sm">
                <div class="rounded-md bg-surface p-md">
                  <div class="flex items-start justify-between gap-md">
                    <span class="text-body-sm-md text-charcoal">Покупатель не понял шаг</span>
                    <span class="shrink-0 text-caption-bold text-primary">ответить</span>
                  </div>
                </div>
                <div class="rounded-md bg-surface p-md">
                  <div class="flex items-start justify-between gap-md">
                    <span class="text-body-sm-md text-charcoal">Инструкция обновлена</span>
                    <span class="shrink-0 text-caption-bold text-primary">без печати</span>
                  </div>
                </div>
                <div class="rounded-md bg-surface p-md">
                  <div class="flex items-start justify-between gap-md">
                    <span class="text-body-sm-md text-charcoal">Расходники к товару</span>
                    <span class="shrink-0 text-caption-bold text-success">заказать</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-lg bg-surface p-lg">
              <p class="text-caption-bold uppercase text-steel">Что получает селлер</p>
              <p class="mt-2 text-body-sm text-charcoal">
                QR-код ведет покупателя туда, где можно разобраться, задать вопрос,
                получить AI-подсказку и купить нужные допники напрямую у вас.
              </p>
            </div>
          </div>
        </div>
      </LandingMockupFrame>
    </div>
  </section>
</template>
