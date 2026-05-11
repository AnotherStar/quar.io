<script setup lang="ts">
const averageOrder = ref(2000)
const marketplaceFee = ref(20)
const monthlyRepeats = ref(15)

const monthlySavings = computed(() => Math.round(averageOrder.value * marketplaceFee.value / 100 * monthlyRepeats.value))
const yearlySavings = computed(() => monthlySavings.value * 12)
const payback = computed(() => Math.max(1, Math.ceil(4500 / Math.max(monthlySavings.value, 1))))

const money = (value: number) => new Intl.NumberFormat('ru-RU').format(value)
</script>

<template>
  <section data-section="shot-savings-calculator" class="bg-navy text-white">
    <div class="container-page py-section-lg">
      <LandingShotKicker label="Калькулятор" tone="pill" on-dark />
      <h2 class="mt-lg max-w-[1100px] text-h2 text-white">
        Сколько стоит одна повторная продажа мимо маркетплейса
      </h2>
      <p class="mt-md text-h4 text-white/62">Подставь свои цифры — считает сам.</p>

      <div class="mt-section rounded-2xl border border-white/12 bg-white/[0.06] p-xl md:p-3xl">
        <div class="space-y-8">
          <label class="block">
            <span class="flex items-center justify-between gap-md text-h4 text-white/70">
              <span>Средний чек</span>
              <span class="font-mono text-white">{{ money(averageOrder) }} ₽</span>
            </span>
            <input v-model.number="averageOrder" min="500" max="10000" step="100" type="range" class="mt-xl w-full accent-primary">
          </label>

          <label class="block">
            <span class="flex items-center justify-between gap-md text-h4 text-white/70">
              <span>Комиссия маркетплейса</span>
              <span class="font-mono text-white">{{ marketplaceFee }}%</span>
            </span>
            <input v-model.number="marketplaceFee" min="5" max="35" step="1" type="range" class="mt-xl w-full accent-primary">
          </label>

          <label class="block">
            <span class="flex items-center justify-between gap-md text-h4 text-white/70">
              <span>Повторных продаж в месяц</span>
              <span class="font-mono text-white">{{ monthlyRepeats }}</span>
            </span>
            <input v-model.number="monthlyRepeats" min="1" max="100" step="1" type="range" class="mt-xl w-full accent-primary">
          </label>
        </div>

        <div class="mt-10 grid gap-md border-t border-white/10 pt-xl text-center md:grid-cols-3">
          <div>
            <p class="font-mono text-[38px] text-white">{{ money(monthlySavings) }} ₽</p>
            <p class="mt-xs text-body-sm-md uppercase text-white/45">экономия/мес на комиссии</p>
          </div>
          <div>
            <p class="font-mono text-[38px] text-white">{{ money(yearlySavings) }} ₽</p>
            <p class="mt-xs text-body-sm-md uppercase text-white/45">за год</p>
          </div>
          <div>
            <p class="font-mono text-[38px] text-white">{{ payback }} мес</p>
            <p class="mt-xs text-body-sm-md uppercase text-white/45">окупаемость quar.io</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
