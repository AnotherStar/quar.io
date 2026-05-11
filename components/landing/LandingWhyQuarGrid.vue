<script setup lang="ts">
const benefits = [
  { icon: 'lucide:scan-line', title: 'QR остаётся тем же', copy: 'Инструкцию можно обновлять после печати коробок: QR ведёт на актуальную версию.' },
  { icon: 'lucide:message-circle', title: 'Вопросы не уходят в отзывы', copy: 'Покупатель пишет продавцу прямо из нужного шага, пока проблема ещё решаема.' },
  { icon: 'lucide:shopping-bag', title: 'Допродажи после покупки', copy: 'Расходники, аксессуары и повторный заказ появляются в момент использования товара.' },
  { icon: 'lucide:sparkles', title: 'AI собирает черновик', copy: 'PDF, фото, скан или описание товара превращаются в мобильную структуру для редактора.' },
  { icon: 'lucide:bar-chart-3', title: 'Видно проблемные шаги', copy: 'Дочитывание, вопросы и отметки “непонятно” показывают, что чинить первым.' },
  { icon: 'lucide:users', title: 'Канал принадлежит вам', copy: 'Контакт с покупателем происходит вне карточки маркетплейса и не теряется после продажи.' },
  { icon: 'lucide:layers-3', title: 'Подходит для каталога', copy: 'Секции, модули и версии помогают масштабировать инструкции на десятки SKU.' },
  { icon: 'lucide:shield-check', title: 'Данные не удаляются тарифом', copy: 'Платные возможности можно скрыть на рендере, но история и контент сохраняются.' }
]
</script>

<template>
  <section id="why" class="bg-canvas">
    <div class="container-page py-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase text-steel">Почему quar.io?</p>
        <h2 class="mt-3 text-h2 text-navy">Инструкция становится рабочим каналом, а не PDF на всякий случай.</h2>
        <p class="mt-md text-h5 font-medium leading-[1.55] text-slate">
          Главные сценарии продукта собраны вокруг одного момента: покупатель уже получил товар и готов взаимодействовать.
        </p>
      </div>

      <div class="mt-section grid gap-x-2xl gap-y-3xl md:grid-cols-2 lg:grid-cols-4">
        <article v-for="item in benefits" :key="item.title" class="grid grid-cols-[28px_1fr] gap-md">
          <Icon :name="item.icon" class="mt-1 h-5 w-5 text-success" />
          <div>
            <h3 class="text-h5 text-navy">{{ item.title }}</h3>
            <p class="mt-sm text-body text-slate">{{ item.copy }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
