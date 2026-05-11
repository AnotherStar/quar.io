<script setup lang="ts">
type StepTone = 'ok' | 'weak' | 'risk'

const steps: Array<{ label: string, value: number, tone: StepTone }> = [
  { label: 'Шаг 1', value: 95, tone: 'ok' },
  { label: 'Шаг 2', value: 88, tone: 'ok' },
  { label: 'Шаг 3', value: 71, tone: 'weak' },
  { label: 'Шаг 4', value: 42, tone: 'risk' },
  { label: 'Шаг 5', value: 29, tone: 'risk' }
]

const questions = [
  { question: 'Сколько времени сохнет при высокой влажности?', action: 'Ответить всем → добавить в шаг 4', count: '23×' },
  { question: 'Можно ли использовать на металле?', action: 'Добавить предупреждение', count: '17×' },
  { question: 'Как убрать излишки после высыхания?', action: 'Добавить шаг 6', count: '11×' },
  { question: 'Подходит ли для аквариума?', action: '', count: '8×' }
]

const stepToneClass = {
  ok: 'bg-success',
  weak: 'bg-warning',
  risk: 'bg-error'
} as const

const badgeToneClass = {
  ok: 'bg-success/10 text-success',
  weak: 'bg-warning/10 text-warning',
  risk: 'bg-error/10 text-error'
} as const
</script>

<template>
  <section data-section="shot-analytics" class="bg-surface-soft">
    <div class="container-page py-section-lg">
      <LandingShotKicker label="Статистика" />
      <h2 class="mt-8 max-w-[900px] text-[44px] font-semibold leading-[1.16] text-navy md:text-[56px]">
        Видите каждый шаг, где покупатель потерялся.
      </h2>
      <p class="mt-6 max-w-[960px] text-h4 font-medium leading-[1.55] text-slate">
        Не просто просмотры. Где застряли, что спросили, кто открыл чат с вами —
        и сколько дошли до повторного заказа.
      </p>

      <div class="mt-12 overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-subtle">
        <div class="flex flex-col gap-md border-b border-hairline p-xl md:flex-row md:items-center md:justify-between">
          <h3 class="text-h4 text-charcoal">Герметик силиконовый универсальный 250мл</h3>
          <span class="self-start rounded-md bg-surface px-md py-xs text-h5 font-semibold text-stone md:self-auto">SKU: CLR-SEAL-250</span>
        </div>

        <div class="grid border-b border-hairline md:grid-cols-4">
          <div class="border-b border-hairline p-xl text-center md:border-b-0 md:border-r">
            <p class="text-[40px] font-semibold leading-none text-primary">847</p>
            <p class="mt-sm text-h5 font-semibold leading-tight text-stone">сканирований<br>за месяц</p>
          </div>
          <div class="border-b border-hairline p-xl text-center md:border-b-0 md:border-r">
            <p class="text-[40px] font-semibold leading-none text-error">38%</p>
            <p class="mt-sm text-h5 font-semibold leading-tight text-stone">бросили на<br>шаге 4</p>
          </div>
          <div class="border-b border-hairline p-xl text-center md:border-b-0 md:border-r">
            <p class="text-[40px] font-semibold leading-none text-ink">64</p>
            <p class="mt-sm text-h5 font-semibold leading-tight text-stone">открыли чат<br>с продавцом</p>
          </div>
          <div class="p-xl text-center">
            <p class="text-[40px] font-semibold leading-none text-success">12%</p>
            <p class="mt-sm text-h5 font-semibold leading-tight text-stone">перешли к<br>повторному заказу</p>
          </div>
        </div>

        <div class="grid md:grid-cols-[1fr_1fr]">
          <div class="border-b border-hairline md:border-b-0 md:border-r">
            <p class="border-b border-hairline p-md text-h5 uppercase text-stone">Дочитывание по шагам</p>
            <div class="divide-y divide-hairline-soft">
              <div
                v-for="step in steps"
                :key="step.label"
                class="grid grid-cols-[86px_1fr_64px_68px] items-center gap-md px-md py-sm text-h5"
              >
                <span class="font-semibold text-slate">{{ step.label }}</span>
                <span class="h-sm overflow-hidden rounded-full bg-surface">
                  <span
                    class="block h-full rounded-full"
                    :class="stepToneClass[step.tone]"
                    :style="{ width: `${step.value}%` }"
                  />
                </span>
                <span class="text-right font-semibold text-ink">{{ step.value }}%</span>
                <span class="rounded-sm px-sm py-xxs text-center text-body-sm-md" :class="badgeToneClass[step.tone]">
                  {{ step.tone === 'ok' ? 'ок' : step.tone === 'weak' ? 'слабо' : 'риск' }}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p class="border-b border-hairline p-md text-h5 uppercase text-stone">Частые вопросы покупателей</p>
            <div class="divide-y divide-hairline-soft">
              <div v-for="item in questions" :key="item.question" class="grid grid-cols-[1fr_auto] gap-md p-md">
                <div>
                  <p class="text-h4 text-charcoal">{{ item.question }}</p>
                  <p v-if="item.action" class="mt-sm inline-flex rounded-sm bg-primary/10 px-sm py-xxs text-h5 text-primary">
                    {{ item.action }}
                  </p>
                </div>
                <p class="text-h4 font-semibold text-primary">{{ item.count }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid divide-y divide-hairline border-t border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
          <div class="flex gap-md p-xl">
            <Icon name="lucide:message-circle" class="mt-1 h-6 w-6 text-primary" />
            <p class="text-h5 text-ink">64 чата с продавцом<br><span class="text-slate">38 закрыты без отзыва — вопрос решён внутри</span></p>
          </div>
          <div class="flex gap-md p-xl">
            <Icon name="lucide:triangle-alert" class="mt-1 h-6 w-6 text-warning" />
            <p class="text-h5 text-ink">Шаг 4 отмечен "непонятно"<br><span class="text-slate">Нажали кнопку 91 раз — переписать формулировку</span></p>
          </div>
          <div class="flex gap-md p-xl">
            <Icon name="lucide:repeat-2" class="mt-1 h-6 w-6 text-success" />
            <p class="text-h5 text-ink">102 перехода к офферу<br><span class="text-slate">Конверсия в заказ — 12%, средний чек 430 ₽</span></p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
