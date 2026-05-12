<template>
  <section class="relative bg-surface">
    <div class="container-page pb-section-lg pt-section-lg text-center md:pb-hero md:pt-hero">
      <h1 class="mx-auto max-w-5xl text-[40px] font-semibold leading-[1.08] text-navy md:text-[58px]">
        quar.io превращает инструкцию в канал для
        <span class="text-primary">обратной связи и дополнительных продаж</span>
      </h1>
      <p class="mx-auto mt-lg max-w-3xl text-h4 font-medium leading-[1.55] text-slate">
        Покупатель сканирует QR после покупки и получает онлайн-инструкцию и возможность напрямую связаться с вами.
      </p>
    </div>
    <div class="absolute bottom-0 left-1/2 z-20 w-full -translate-x-1/2 translate-y-1/2 px-md">
      <div class="mx-auto flex w-fit flex-col items-center gap-md rounded-2xl bg-canvas px-xl py-lg text-center shadow-2xl md:flex-row md:gap-xl md:py-md">
        <h2 class="text-h2 text-navy">QUAR — больше чем QR</h2>
        <UiButton to="/auth/register" size="lg">
          Попробовать бесплатно
          <Icon name="lucide:arrow-right" class="h-5 w-5" />
        </UiButton>
      </div>
    </div>
  </section>
</template>
