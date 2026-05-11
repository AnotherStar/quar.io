<template>
  <section class="bg-navy text-white">
    <div class="container-page py-section-lg">
      <div class="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p class="text-caption-bold uppercase text-white/50">Попробовать бесплатно</p>
          <h2 class="mt-3 max-w-3xl text-h2 text-white">Выберите несколько товаров, где покупатели чаще всего задают вопросы, и проверьте quar.io на них.</h2>
          <p class="mt-md max-w-2xl text-h5 font-medium leading-[1.55] text-white/62">
            За месяц можно оцифровать первые инструкции, привязать QR-коды и увидеть, где инструкция превращается в поддержку и повторную покупку.
          </p>
        </div>
        <div class="flex flex-col gap-sm sm:flex-row md:flex-col">
          <UiButton to="/auth/register" variant="on-dark" size="lg">Попробовать бесплатно</UiButton>
          <UiButton to="#pricing" variant="secondary-on-dark" size="lg">Смотреть тарифы</UiButton>
        </div>
      </div>
    </div>
  </section>
</template>
