<script setup lang="ts">
const { startTrial, loading: trialLoading } = useStartTrial()

type Plan = {
  name: string
  price: string
  priceNote?: string
  copy: string
  features: string[]
  variant: 'default' | 'highlight' | 'premium'
  badge?: string
  cta: string
  // Если задан `to` — это обычная навигация (например, на /pricing). Если
  // нет — кнопка триггерит trial-сценарий.
  to?: string
}

const plans: Plan[] = [
  {
    name: 'Пилот',
    price: '500 ₽',
    priceNote: 'разово',
    copy: 'Проверить 5–10 товаров и понять, где инструкция влияет на вопросы, отзывы и повторный заказ.',
    features: ['AI-оцифровка первых инструкций', 'Публичные QR-ссылки', 'Базовая аналитика', 'Отчёт по проблемным шагам'],
    variant: 'default',
    cta: 'Попробовать бесплатно'
  },
  {
    name: 'Каталог',
    price: '4 500 ₽',
    priceNote: 'в месяц',
    copy: 'Перенести регулярную работу с инструкциями, секциями и QR-кодами в один кабинет.',
    features: ['До 100 инструкций', 'Reusable sections', 'Команда и роли', 'Модули feedback и warranty'],
    variant: 'highlight',
    badge: 'Популярный',
    cta: 'Попробовать бесплатно'
  },
  {
    name: 'Бренд',
    price: 'от 14 500 ₽',
    priceNote: 'индивидуально',
    copy: 'Брендирование, расширенные сценарии допродаж, переводы и интеграции под каталог.',
    features: ['Уникальные QR по партиям', 'Расширенная аналитика', 'AI-ассистент по инструкции', 'Приоритетная поддержка'],
    variant: 'premium',
    badge: 'Enterprise',
    cta: 'Связаться с нами',
    to: '/pricing'
  }
]
</script>

<template>
  <section id="pricing" class="bg-surface-soft shadow-[inset_0_16px_32px_-16px_rgba(15,15,15,0.15)]">
    <div class="container-page py-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase tracking-[0.18em] text-primary">Тарифы</p>
        <h2 class="mt-md text-h2 text-navy">Платите за результат, а не за лицензии</h2>
        <p class="mt-md text-body text-slate">
          Начните с пилота на 5–10 товаров, масштабируйте до полного каталога и подключайте брендовые сценарии — когда нужно.
        </p>
      </div>

      <div class="pricing-grid mt-section grid items-stretch gap-xl lg:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
          :class="[
            'pricing-card relative flex flex-col rounded-2xl p-xl transition-transform duration-300',
            plan.variant === 'default' && 'bg-canvas text-ink shadow-card',
            plan.variant === 'highlight' && 'bg-canvas text-ink shadow-mockup ring-2 ring-primary',
            plan.variant === 'premium' && 'premium-card text-white shadow-mockup'
          ]"
        >
          <span
            v-if="plan.badge"
            :class="[
              'absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-sm py-[3px] text-caption-bold uppercase tracking-wider',
              plan.variant === 'highlight' ? 'bg-primary text-white' : 'bg-white text-navy'
            ]"
          >
            {{ plan.badge }}
          </span>

          <h3
            :class="[
              'text-h4',
              plan.variant === 'premium' ? 'text-white' : 'text-navy'
            ]"
          >
            {{ plan.name }}
          </h3>

          <div class="mt-lg flex items-baseline gap-2">
            <span
              :class="[
                'text-[40px] font-semibold leading-none tracking-[-0.5px]',
                plan.variant === 'premium' ? 'text-white' : 'text-ink'
              ]"
            >
              {{ plan.price }}
            </span>
            <span
              v-if="plan.priceNote"
              :class="[
                'text-body-sm',
                plan.variant === 'premium' ? 'text-white/60' : 'text-steel'
              ]"
            >
              {{ plan.priceNote }}
            </span>
          </div>

          <p
            :class="[
              'mt-md text-body-sm leading-relaxed',
              plan.variant === 'premium' ? 'text-white/72' : 'text-slate'
            ]"
          >
            {{ plan.copy }}
          </p>

          <UiButton
            v-if="plan.to"
            class="mt-xl"
            :to="plan.to"
            :variant="plan.variant === 'premium' ? 'on-dark' : 'primary'"
            block
          >
            {{ plan.cta }}
          </UiButton>
          <UiButton
            v-else
            class="mt-xl"
            :variant="plan.variant === 'premium' ? 'on-dark' : 'primary'"
            :loading="trialLoading"
            block
            @click="startTrial"
          >
            {{ plan.cta }}
          </UiButton>

          <div
            :class="[
              'mt-xl h-px w-full',
              plan.variant === 'premium' ? 'bg-white/15' : 'bg-hairline'
            ]"
          />

          <ul class="mt-lg grid gap-sm">
            <li
              v-for="feature in plan.features"
              :key="feature"
              :class="[
                'flex items-start gap-sm text-body-sm-md',
                plan.variant === 'premium' ? 'text-white/82' : 'text-charcoal'
              ]"
            >
              <span
                :class="[
                  'mt-[2px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
                  plan.variant === 'premium' ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'
                ]"
              >
                <Icon name="lucide:check" class="h-3 w-3" />
              </span>
              <span>{{ feature }}</span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.premium-card {
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(123, 63, 242, 0.45) 0%, transparent 55%),
    radial-gradient(100% 80% at 0% 100%, rgba(12, 63, 233, 0.40) 0%, transparent 55%),
    linear-gradient(180deg, #0a1530 0%, #070f24 100%);
  position: relative;
}

.premium-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0) 45%, rgba(123, 63, 242, 0.45) 80%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}

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
