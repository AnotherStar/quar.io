<template>
  <section class="overflow-hidden bg-canvas">
    <div class="container-page pb-section-lg pt-section-lg text-center md:pb-hero md:pt-hero">
      <h1 class="mx-auto max-w-5xl text-[40px] font-semibold leading-[1.08] text-navy md:text-[58px]">
        quar.io превращает инструкцию в канал для
        <span class="text-primary">обратной связи и допродаж</span>
        уже после продажи
      </h1>
      <p class="mx-auto mt-lg max-w-3xl text-h4 font-medium leading-[1.55] text-slate">
        Покупатель сканирует QR в коробке, получает понятную мобильную инструкцию,
        задаёт вопрос продавцу и видит релевантный оффер для повторного заказа.
      </p>
      <div class="mt-8 flex flex-col items-center justify-center gap-md sm:flex-row">
        <UiButton to="/auth/register" size="lg">
          Попробовать бесплатно
          <Icon name="lucide:arrow-right" class="h-5 w-5" />
        </UiButton>
        <UiButton to="#cases" variant="secondary" size="lg">Посмотреть кейсы</UiButton>
      </div>
    </div>
  </section>
</template>
