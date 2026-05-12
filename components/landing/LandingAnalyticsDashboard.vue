<script setup lang="ts">
type Tone = 'primary' | 'success' | 'warning' | 'error' | 'plain'

const metrics: { value: string, label: string, tone: Tone }[] = [
  { value: '847', label: 'сканирований за месяц', tone: 'primary' },
  { value: '38%', label: 'бросили на шаге 4', tone: 'error' },
  { value: '64', label: 'открыли чат с продавцом', tone: 'plain' },
  { value: '12%', label: 'перешли к повторному заказу', tone: 'success' }
]

const steps: { label: string, pct: number, status: string, tone: 'success' | 'warning' | 'error' }[] = [
  { label: 'Шаг 1', pct: 95, status: 'ок', tone: 'success' },
  { label: 'Шаг 2', pct: 88, status: 'ок', tone: 'success' },
  { label: 'Шаг 3', pct: 71, status: 'слабо', tone: 'warning' },
  { label: 'Шаг 4', pct: 42, status: 'риск', tone: 'error' },
  { label: 'Шаг 5', pct: 29, status: 'риск', tone: 'error' }
]

const faqs = [
  { q: 'Сколько времени сохнет при высокой влажности?', a: 'Ответить всем → добавить в шаг 4', count: '23×' },
  { q: 'Можно ли использовать на металле?', a: 'Добавить предупреждение', count: '17×' },
  { q: 'Как убрать излишки после высыхания?', a: 'Добавить шаг 6', count: '11×' },
  { q: 'Подходит ли для аквариума?', a: '', count: '8×' }
]

const insights: { icon: string, title: string, body: string, tone: Tone }[] = [
  { icon: 'lucide:message-circle', title: '64 чата с продавцом', body: '38 закрыты без отзыва — вопрос решён внутри', tone: 'primary' },
  { icon: 'lucide:alert-triangle', title: 'Шаг 4 отмечен «непонятно»', body: 'Нажали кнопку 91 раз — переписать формулировку', tone: 'warning' },
  { icon: 'lucide:repeat', title: '102 перехода к офферу', body: 'Конверсия в заказ — 12%, средний чек 430 ₽', tone: 'success' }
]

const funnel = [
  { label: 'Сканирований', value: '847', width: 100, bar: 'bg-primary/85', text: 'text-white' },
  { label: 'Дочитали инструкцию', value: '71%', width: 78, bar: 'bg-primary/55', text: 'text-white/85' },
  { label: 'Открыли чат', value: '64', width: 55, bar: 'bg-primary/35', text: 'text-white/70' },
  { label: 'Заказали', value: '12%', width: 38, bar: 'bg-success/85', text: 'text-white' }
]

const toneText: Record<Tone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  plain: 'text-white'
}

const barColor: Record<'success' | 'warning' | 'error', string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error'
}

const flagColor: Record<'success' | 'warning' | 'error', string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error'
}
</script>

<template>
  <section class="bg-navy-deep">
    <div class="container-page py-section-lg">
      <div class="grid items-end gap-2xl lg:grid-cols-2">
        <div>
          <LandingShotKicker label="Статистика и улучшения" tone="pill" on-dark />
          <h2 class="mt-lg text-h2 text-white">Видите каждый шаг, где покупатель потерялся.</h2>
          <p class="mt-md text-h5 font-medium leading-[1.55] text-white/70">
            Не просто просмотры. Где застряли, что спросили, кто открыл чат — и сколько дошли до повторного заказа.
          </p>
        </div>

        <div class="rounded-xl border border-white/10 bg-navy p-lg">
          <p class="text-caption-bold uppercase text-white/50">Воронка · CLR-SEAL-250</p>
          <div class="mt-md grid gap-xs">
            <div v-for="row in funnel" :key="row.label" class="relative">
              <div
                :class="['flex h-9 items-center justify-between rounded-md px-md', row.bar]"
                :style="`width:${row.width}%`"
              >
                <span :class="['text-body-sm-md', row.text]">{{ row.label }}</span>
                <span :class="['text-body-sm-md', row.text]">{{ row.value }}</span>
              </div>
            </div>
          </div>
          <p class="mt-md text-body-sm text-white/55">
            Средний чек: <span class="font-semibold text-success">430 ₽ · без комиссии</span>
          </p>
        </div>
      </div>

      <div class="mt-section overflow-hidden rounded-2xl border border-white/10 bg-navy">
        <header class="flex flex-wrap items-center justify-between gap-sm border-b border-white/10 px-xl py-md">
          <span class="text-body-sm-md text-white/75">Герметик силиконовый универсальный 250мл</span>
          <span class="rounded-md border border-white/10 bg-navy-deep px-sm py-xxs text-body-sm text-white/55">
            SKU: CLR-SEAL-250
          </span>
        </header>

        <div class="grid grid-cols-2 md:grid-cols-4">
          <div
            v-for="(metric, i) in metrics"
            :key="metric.label"
            :class="[
              'p-lg text-center',
              i % 2 === 0 ? 'border-r border-white/10' : '',
              'md:border-r md:border-white/10',
              i === metrics.length - 1 ? 'md:border-r-0' : '',
              i < metrics.length - 2 ? 'border-b border-white/10 md:border-b-0' : ''
            ]"
          >
            <p :class="['text-[28px] font-semibold leading-none', toneText[metric.tone]]">{{ metric.value }}</p>
            <p class="mt-sm text-body-sm leading-snug text-white/55">{{ metric.label }}</p>
          </div>
        </div>

        <div class="grid border-t border-white/10 md:grid-cols-2">
          <div class="border-b border-white/10 md:border-b-0 md:border-r md:border-white/10">
            <p class="border-b border-white/10 px-xl py-sm text-caption-bold uppercase text-white/50">
              Дочитывание по шагам
            </p>
            <div
              v-for="(step, i) in steps"
              :key="step.label"
              :class="['flex items-center gap-md px-xl py-sm', i < steps.length - 1 ? 'border-b border-white/5' : '']"
            >
              <span class="w-14 shrink-0 text-body-sm text-white/70">{{ step.label }}</span>
              <div class="flex-1 overflow-hidden rounded-full bg-white/10">
                <div :class="['h-[6px] rounded-full', barColor[step.tone]]" :style="`width:${step.pct}%`" />
              </div>
              <span class="w-10 shrink-0 text-right text-body-sm-md text-white">{{ step.pct }}%</span>
              <span :class="['shrink-0 rounded px-xs py-xxs text-caption-bold uppercase', flagColor[step.tone]]">
                {{ step.status }}
              </span>
            </div>
          </div>

          <div>
            <p class="border-b border-white/10 px-xl py-sm text-caption-bold uppercase text-white/50">
              Частые вопросы покупателей
            </p>
            <div
              v-for="(faq, i) in faqs"
              :key="faq.q"
              :class="['flex items-start gap-md px-xl py-sm', i < faqs.length - 1 ? 'border-b border-white/5' : '']"
            >
              <div class="flex-1">
                <p class="text-body-sm leading-snug text-white/80">{{ faq.q }}</p>
                <p
                  v-if="faq.a"
                  class="mt-2 inline-flex rounded bg-primary/15 px-xs py-xxs text-caption-bold text-primary"
                >
                  {{ faq.a }}
                </p>
              </div>
              <span class="shrink-0 text-body-sm-md text-primary">{{ faq.count }}</span>
            </div>
          </div>
        </div>

        <div class="grid border-t border-white/10 md:grid-cols-3">
          <div
            v-for="(insight, i) in insights"
            :key="insight.title"
            :class="[
              'flex items-start gap-md p-lg',
              i < insights.length - 1 ? 'border-b border-white/10 md:border-b-0 md:border-r md:border-white/10' : ''
            ]"
          >
            <Icon :name="insight.icon" :class="['mt-1 h-5 w-5 shrink-0', toneText[insight.tone]]" />
            <div>
              <p class="text-body-sm-md text-white">{{ insight.title }}</p>
              <p class="mt-1 text-body-sm leading-snug text-white/60">{{ insight.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
