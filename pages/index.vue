<script setup lang="ts">
useHead({ title: 'ManualOnline — инструкции, которые работают' })
</script>

<template>
  <div>
    <section class="bg-navy text-white">
      <div class="container-page py-hero text-center">
        <p class="text-caption-bold uppercase tracking-widest text-white/60">SaaS для производителей и продавцов</p>
        <h1 class="mt-4 text-hero-display leading-[1.05] tracking-tight">
          Инструкции, которые<br>покупатели реально читают.
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-subtitle text-white/80">
          Размещайте инструкции к товарам по короткому QR-коду. Редактируйте без программистов,
          собирайте обратную связь от покупателей, снижайте нагрузку на саппорт.
        </p>
        <div class="mt-8 flex items-center justify-center gap-3">
          <UiButton to="/auth/register" size="md">Начать бесплатно</UiButton>
          <UiButton to="/pricing" variant="secondary-on-dark" size="md">Тарифы</UiButton>
        </div>

        <!-- Mock workspace card per design -->
        <div class="mx-auto mt-16 max-w-4xl rounded-lg bg-canvas text-ink shadow-mockup">
          <div class="border-b border-hairline px-md py-sm flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span class="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span class="h-3 w-3 rounded-full bg-[#28c840]" />
            <span class="ml-md text-caption text-steel">manual.online/atvel/f-16</span>
          </div>
          <div class="p-2xl text-left">
            <h2 class="text-h2">F-16 · Сборка модели 1:48</h2>
            <p class="mt-2 text-body text-charcoal">Полная инструкция по сборке. Нажмите ⌘K для поиска.</p>
            <div class="mt-md rounded-md bg-tint-peach p-md text-charcoal">
              ⚠️ <span class="text-caption-bold">Внимание</span> · Используйте защитные очки при работе с клеем.
            </div>
            <div class="mt-md grid grid-cols-2 gap-md">
              <div class="rounded-md bg-tint-mint p-md text-caption">✓ Шаг выполнен</div>
              <div class="rounded-md bg-tint-sky p-md text-caption">ℹ️ Совет</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="features" class="container-page py-section-lg">
      <h2 class="text-h2 text-ink text-center">Всё, что нужно для современной инструкции</h2>
      <div class="mt-section grid grid-cols-1 gap-md md:grid-cols-3">
        <UiCard tint="lavender" :bordered="false">
          <h3 class="text-h4">Notion-like редактор</h3>
          <p class="mt-2 text-body text-charcoal/80">Заголовки, списки, картинки, видео, спец-блоки безопасности — без программистов.</p>
        </UiCard>
        <UiCard tint="mint" :bordered="false">
          <h3 class="text-h4">История версий</h3>
          <p class="mt-2 text-body text-charcoal/80">Каждая публикация — иммутабельный snapshot. Знаешь, какая версия была в момент покупки.</p>
        </UiCard>
        <UiCard tint="peach" :bordered="false">
          <h3 class="text-h4">Аналитика и отзывы</h3>
          <p class="mt-2 text-body text-charcoal/80">Какой блок сложный, где уходят покупатели — точные данные, чтобы инструкция работала.</p>
        </UiCard>
        <UiCard tint="sky" :bordered="false">
          <h3 class="text-h4">Workflow одобрения</h3>
          <p class="mt-2 text-body text-charcoal/80">Редакторы готовят, владелец одобряет. Ничего не уезжает в прод случайно.</p>
        </UiCard>
        <UiCard tint="rose" :bordered="false">
          <h3 class="text-h4">Подключаемые модули</h3>
          <p class="mt-2 text-body text-charcoal/80">Регистрация гарантии, чат с консультантом — добавляются без релизов платформы.</p>
        </UiCard>
        <UiCard tint="yellow-bold" :bordered="false">
          <h3 class="text-h4">Не платите — ссылки живут</h3>
          <p class="mt-2 text-body text-charcoal/80">Если перестали платить, основной контент инструкций остаётся доступен по тем же URL.</p>
        </UiCard>
      </div>
    </section>

    <section class="bg-surface">
      <div class="container-page py-section text-center">
        <h2 class="text-h2 text-ink">Начните за 2 минуты</h2>
        <p class="mt-2 text-body text-slate">Бесплатно — до трёх инструкций.</p>
        <UiButton to="/auth/register" class="mt-6">Создать аккаунт</UiButton>
      </div>
    </section>
  </div>
</template>
