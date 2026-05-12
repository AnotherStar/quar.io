<script setup lang="ts">
const plans = [
  {
    name: 'Пилот',
    price: '500 ₽',
    copy: 'Проверить 5-10 товаров и понять, где инструкция влияет на вопросы, отзывы и повторный заказ.',
    features: ['AI-оцифровка первых инструкций', 'Публичные QR-ссылки', 'Базовая аналитика', 'Отчёт по проблемным шагам'],
    dark: false
  },
  {
    name: 'Каталог',
    price: '4 500 ₽ / мес.',
    copy: 'Перенести регулярную работу с инструкциями, секциями и QR-кодами в один кабинет.',
    features: ['До 100 инструкций', 'Reusable sections', 'Команда и роли', 'Модули feedback и warranty'],
    dark: false
  },
  {
    name: 'Бренд',
    price: 'от 14 500 ₽',
    copy: 'Брендирование, расширенные сценарии допродаж, переводы и интеграции под каталог.',
    features: ['Уникальные QR по партиям', 'Расширенная аналитика', 'AI-ассистент по инструкции', 'Приоритетная поддержка'],
    dark: true
  }
]
</script>

<template>
  <section id="pricing" class="bg-surface-soft">
    <div class="container-page py-section-lg">
      <div class="mx-auto max-w-4xl text-center">
        <p class="text-caption-bold uppercase text-steel">Тарифы</p>
        <h2 class="mt-3 text-h2 text-navy">Начните с пилота, потом масштабируйте QR-канал на каталог.</h2>
        <p class="mt-md text-h5 font-medium text-slate">Первый месяц нужен, чтобы проверить сценарий на реальных товарах и первых вопросах покупателей.</p>
      </div>

      <div class="pricing-grid mt-section grid gap-md lg:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
          :class="[
            'pricing-card rounded-2xl p-xl shadow-card',
            plan.dark ? 'bg-navy text-white' : 'bg-canvas text-ink'
          ]"
        >
          <h3 :class="['text-h4', plan.dark ? 'text-white' : 'text-navy']">{{ plan.name }}</h3>
          <p :class="['mt-lg text-[42px] font-semibold leading-none', plan.dark ? 'text-white' : 'text-ink']">{{ plan.price }}</p>
          <p :class="['mt-lg text-body leading-relaxed', plan.dark ? 'text-white/62' : 'text-slate']">{{ plan.copy }}</p>
          <UiButton class="mt-xl" :variant="plan.dark ? 'on-dark' : 'primary'" block>
            {{ plan.dark ? 'Связаться' : 'Попробовать бесплатно' }}
          </UiButton>
          <ul class="mt-xl grid gap-sm">
            <li
              v-for="feature in plan.features"
              :key="feature"
              :class="['flex items-start gap-sm text-body-sm-md', plan.dark ? 'text-white/72' : 'text-charcoal']"
            >
              <Icon name="lucide:check" class="mt-[2px] h-4 w-4 shrink-0 text-primary" />
              <span>{{ feature }}</span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
@supports (animation-timeline: view()) {
  .pricing-card {
    animation: pricing-fade-in linear both;
    animation-timeline: view();
    animation-range: cover 0% cover 35%;
  }

  @media (min-width: 1024px) {
    .pricing-grid {
      view-timeline-name: --pricing-grid;
    }

    .pricing-card {
      animation-timeline: --pricing-grid;
    }

    .pricing-card:nth-child(1) {
      animation-range: cover 0% cover 28%;
    }

    .pricing-card:nth-child(2) {
      animation-range: cover 10% cover 38%;
    }

    .pricing-card:nth-child(3) {
      animation-range: cover 20% cover 48%;
    }
  }
}

@keyframes pricing-fade-in {
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
  .pricing-card {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
