<script setup lang="ts">
const benefits = [
  { icon: 'lucide:qr-code', iconTone: 'bg-tint-sky text-primary group-hover:bg-primary group-hover:text-surface', title: 'Инструкция меняется, QR остаётся', copy: 'Инструкцию можно обновлять после печати коробок: QR ведёт всегда на актуальную версию.' },
  { icon: 'lucide:message-circle', iconTone: 'bg-tint-peach text-brand-orange group-hover:bg-brand-orange group-hover:text-surface', title: 'Негатив не уходят в плохие отзывы', copy: 'Покупатель пишет продавцу прямо из нужного шага, пока проблема ещё решаема.' },
  { icon: 'lucide:shopping-bag', iconTone: 'bg-tint-mint text-success group-hover:bg-success group-hover:text-surface', title: 'Допродажи после покупки', copy: 'Расходники, аксессуары и повторный заказ появляются в момент использования товара.' },
  { icon: 'lucide:sparkles', iconTone: 'bg-tint-lavender text-brand-purple group-hover:bg-brand-purple group-hover:text-surface', title: 'Такую инструкцию хочется прочитать', copy: 'ИИ анализирует контент и делает инструкцию структурированной и понятной.' },
  { icon: 'lucide:bar-chart-3', iconTone: 'bg-tint-mint text-brand-teal group-hover:bg-brand-teal group-hover:text-surface', title: 'Улучшайте пользовательский опыт', copy: 'Аналитика по дочитыванию, вопросам и отметкам “непонятно” помогут сделать материал точнее.' },
  { icon: 'lucide:user-plus', iconTone: 'bg-tint-rose text-brand-pink group-hover:bg-brand-pink group-hover:text-surface', title: 'Покупатель становится вашим', copy: 'Контакт с покупателем происходит вне карточки маркетплейса и не теряется после продажи.' },
  { icon: 'lucide:layers-3', iconTone: 'bg-tint-sky text-link group-hover:bg-link group-hover:text-surface', title: 'Подходит для больших каталогов', copy: 'Переиспользуемые секции, версионирование помогают масштабировать инструкции на десятки и тысячи SKU.' },
  { icon: 'lucide:bot', iconTone: 'bg-tint-yellow-bold text-warning group-hover:bg-warning group-hover:text-surface', title: 'Персональный ИИ ассистент ', copy: 'Ответит на вопросы покупателя и предложит дополнительные товары или скидки, даже ночью.' }
]
</script>

<template>
  <section id="why" class="bg-surface text-ink">
    <div class="container-page py-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase text-steel">Почему quar.io?</p>
        <h2 class="mt-3 text-h3 text-navy text-balance md:text-h2">Инструкция становится не просто PDF-файлом, а инструментом для дополнительных продаж и работы с репутацией</h2>
        <p class="mt-md text-h5 font-medium leading-[1.55] text-steel text-balance">
          Покупатель открывает упаковку и в этот момент он максимально вовлечён в ваш товар: используйте это преимущество.
        </p>
      </div>

      <div class="mt-section grid gap-x-2xl gap-y-3xl md:grid-cols-2 lg:grid-cols-4">
        <article v-for="item in benefits" :key="item.title" class="group grid grid-cols-[40px_1fr] gap-x-md">
          <div :class="['grid h-10 w-10 self-center place-items-center rounded-full transition-colors duration-300', item.iconTone]">
            <Icon :name="item.icon" class="h-5 w-5" />
          </div>
          <h3 class="self-center text-h5 text-navy">{{ item.title }}</h3>
          <p class="col-start-2 mt-sm text-body text-steel">{{ item.copy }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
