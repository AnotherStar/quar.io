<script setup lang="ts">
const stats = [
  { value: '120+', label: 'инструкций в пилотах' },
  { value: '38%', label: 'средняя доля вопросов по сложным шагам' },
  { value: '12%', label: 'переходов к повторному заказу в демо-сценарии' }
]

const testimonials = [
  { name: 'Анна, бренд товаров для дома', role: 'операционный директор', quote: 'Раньше вопросы жили в отзывах. Теперь видим, где человек застрял, и можем исправить инструкцию.' },
  { name: 'Илья, продавец на маркетплейсах', role: 'основатель магазина', quote: 'Самая понятная идея: QR уже в коробке, покупатель уже у нас, значит можно предложить расходники напрямую.' },
  { name: 'Мария, электроника', role: 'руководитель поддержки', quote: 'Нам важна не красота PDF, а меньше возвратов и меньше однотипных вопросов. quar.io ложится ровно туда.' },
  { name: 'Дмитрий, мебельный каталог', role: 'product lead', quote: 'Версии и переиспользуемые секции выглядят как то, что можно масштабировать на каталог, а не ручной лендинг на каждый SKU.' }
]
</script>

<template>
  <section class="border-y border-hairline bg-surface-soft">
    <div class="container-page py-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase text-steel">Почему нам доверяют</p>
        <h2 class="mt-3 text-h2 text-navy">Пока это рыба: сюда поставим реальные цифры, логотипы и отзывы.</h2>
        <p class="mt-md text-h5 font-medium leading-[1.55] text-slate">
          Блок уже подготовлен под social proof: метрики, короткие цитаты и карточки клиентов.
        </p>
      </div>

      <div class="mt-section grid divide-y divide-hairline rounded-2xl border border-hairline bg-canvas md:grid-cols-3 md:divide-x md:divide-y-0">
        <div v-for="stat in stats" :key="stat.value" class="p-xl text-center">
          <p class="text-[54px] font-semibold leading-none text-primary">{{ stat.value }}</p>
          <p class="mt-sm text-body-sm-md text-steel">{{ stat.label }}</p>
        </div>
      </div>

      <div class="mt-lg grid gap-md md:grid-cols-2">
        <article v-for="item in testimonials" :key="item.name" class="rounded-xl border border-hairline bg-canvas p-xl">
          <div class="flex items-center gap-md">
            <div class="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-body-sm-md text-primary">
              {{ item.name.slice(0, 1) }}
            </div>
            <div>
              <h3 class="text-h5 text-navy">{{ item.name }}</h3>
              <p class="text-body-sm text-steel">{{ item.role }}</p>
            </div>
          </div>
          <p class="mt-lg text-body text-charcoal">“{{ item.quote }}”</p>
        </article>
      </div>
    </div>
  </section>
</template>
