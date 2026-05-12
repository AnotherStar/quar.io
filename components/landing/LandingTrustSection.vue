<script setup lang="ts">
const stats = [
  { target: 120, suffix: '+', label: 'инструкций в пилотах' },
  { target: 38, suffix: '%', label: 'средняя доля вопросов по сложным шагам' },
  { target: 12, suffix: '%', label: 'переходов к повторному заказу в демо-сценарии' }
]

const displayed = ref<number[]>(stats.map(() => 0))
const statsRoot = ref<HTMLElement | null>(null)
let countersStarted = false

function runCounters() {
  if (countersStarted) return
  countersStarted = true
  const duration = 1400
  const startTime = performance.now()
  function frame(now: number) {
    const progress = Math.min(1, (now - startTime) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayed.value = stats.map(stat => Math.round(stat.target * eased))
    if (progress < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

const testimonials = [
  { name: 'Анна', initials: 'АК', avatarTone: 'bg-tint-rose text-brand-pink-deep', company: 'бренд товаров для дома', role: 'операционный директор', quote: 'Раньше вопросы жили в отзывах. Теперь видим, где человек застрял, и можем исправить инструкцию до следующей партии.' },
  { name: 'Илья', initials: 'ИС', avatarTone: 'bg-tint-sky text-primary', company: 'магазин на маркетплейсах', role: 'основатель', quote: 'QR уже в коробке, покупатель уже у нас. Самое логичное место, чтобы предложить расходники и повторный заказ напрямую.' },
  { name: 'Мария', initials: 'МЛ', avatarTone: 'bg-tint-mint text-success', company: 'электроника', role: 'руководитель поддержки', quote: 'Нам важна не красота PDF, а меньше возвратов и меньше однотипных вопросов. quar.io попадает ровно в эту задачу.' },
  { name: 'Дмитрий', initials: 'ДР', avatarTone: 'bg-tint-lavender text-brand-purple', company: 'мебельный каталог', role: 'product lead', quote: 'Версии и переиспользуемые секции выглядят как система, которую можно масштабировать на каталог, а не делать вручную по SKU.' },
  { name: 'Олег', initials: 'ОП', avatarTone: 'bg-tint-yellow text-warning', company: 'товары для ремонта', role: 'category manager', quote: 'После скана QR покупатель не остаётся один с инструкцией. Он может спросить, а мы видим, какой шаг реально ломает сценарий.' },
  { name: 'Елена', initials: 'ЕМ', avatarTone: 'bg-tint-peach text-brand-orange-deep', company: 'детские товары', role: 'brand manager', quote: 'Для нас это канал после продажи: объяснить, успокоить, предложить аксессуар и не потерять человека в интерфейсе маркетплейса.' },
  { name: 'Павел', initials: 'ПГ', avatarTone: 'bg-tint-gray text-charcoal', company: 'спорттовары', role: 'ecommerce lead', quote: 'Понравилось, что QR не надо менять после печати. Исправили шаг, обновили оффер, а коробки остаются теми же.' },
  { name: 'Ксения', initials: 'КН', avatarTone: 'bg-primary/10 text-primary', company: 'косметика и уход', role: 'CRM lead', quote: 'Повторная покупка появляется в момент использования продукта, а не через холодную рассылку через месяц.' },
  { name: 'Роман', initials: 'РВ', avatarTone: 'bg-tint-cream text-brand-brown', company: 'инструменты', role: 'руководитель продукта', quote: 'Сразу видно, где люди нажимают “непонятно”. Это честнее, чем ждать плохой отзыв и гадать, что именно пошло не так.' },
  { name: 'Наталья', initials: 'НА', avatarTone: 'bg-tint-sky text-link-blue', company: 'зоотовары', role: 'операционный менеджер', quote: 'Хорошо, что это не просто страница. Есть инструкция, контакт с покупателем, аналитика и место для следующего предложения.' }
]

const testimonialSlides = [...testimonials, ...testimonials]
const marqueeTrack = ref<HTMLElement | null>(null)
const marqueeOffset = ref(0)
const marqueePaused = ref(false)

const marqueeTrackStyle = computed(() => ({
  transform: `translateX(${-marqueeOffset.value}px)`
}))

let marqueeFrame: number | undefined
let marqueeLastTime = 0
let marqueeSpeed = 0
const marqueeBaseSpeed = 24

function setMarqueePaused(value: boolean) {
  marqueePaused.value = value
}

function runMarquee(timestamp: number) {
  if (!marqueeLastTime) marqueeLastTime = timestamp
  const delta = Math.min(timestamp - marqueeLastTime, 64)
  marqueeLastTime = timestamp

  const targetSpeed = marqueePaused.value ? 0 : marqueeBaseSpeed
  const ease = 1 - Math.exp(-delta / 260)
  marqueeSpeed += (targetSpeed - marqueeSpeed) * ease

  const cycleWidth = (marqueeTrack.value?.scrollWidth ?? 0) / 2
  if (cycleWidth > 0) {
    marqueeOffset.value = (marqueeOffset.value + marqueeSpeed * delta / 1000) % cycleWidth
  }

  marqueeFrame = requestAnimationFrame(runMarquee)
}

let statsObserver: IntersectionObserver | undefined

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced) {
    displayed.value = stats.map(s => s.target)
  } else if (statsRoot.value) {
    statsObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          runCounters()
          statsObserver?.disconnect()
        }
      }
    }, { threshold: 0.4 })
    statsObserver.observe(statsRoot.value)
  }

  if (reduced) return
  marqueeFrame = requestAnimationFrame(runMarquee)
})

onBeforeUnmount(() => {
  if (marqueeFrame) cancelAnimationFrame(marqueeFrame)
  statsObserver?.disconnect()
})
</script>

<template>
  <section id="trust" class="trust-section bg-[linear-gradient(180deg,var(--color-surface)_0%,var(--color-surface)_45%,var(--color-canvas)_100%)] text-ink">
    <div class="container-page py-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase text-steel">Почему нам доверяют</p>
      </div>

      <div ref="statsRoot" class="mt-section grid divide-y divide-hairline rounded-2xl border border-hairline bg-canvas md:grid-cols-3 md:divide-x md:divide-y-0">
        <div v-for="(stat, i) in stats" :key="stat.label" class="p-xl text-center">
          <p class="stat-num text-[54px] font-semibold leading-none text-primary">{{ displayed[i] }}{{ stat.suffix }}</p>
          <p class="mt-sm text-body-sm-md text-steel">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <div
      class="trust-marquee relative left-1/2 w-screen -translate-x-1/2 overflow-hidden pb-section-lg"
    >
      <div
        class="trust-marquee-hitbox"
        @pointerenter="setMarqueePaused(true)"
        @pointerleave="setMarqueePaused(false)"
      >
        <div
          ref="marqueeTrack"
          class="trust-marquee-track flex w-max gap-md px-md will-change-transform"
          :style="marqueeTrackStyle"
        >
          <article
            v-for="(item, index) in testimonialSlides"
            :key="`${item.name}-${index}`"
            class="trust-card flex min-h-[360px] w-[280px] shrink-0 flex-col justify-between rounded-2xl bg-canvas p-xl shadow-card md:w-[320px]"
          >
            <div>
              <div class="flex items-center justify-between">
                <div :class="['grid h-14 w-14 place-items-center rounded-full text-body-sm-md shadow-subtle ring-4 ring-canvas', item.avatarTone]">
                  {{ item.initials }}
                </div>
                <Icon name="lucide:quote" class="h-6 w-6 text-primary/30" />
              </div>
              <p class="mt-xl text-h5 leading-[1.45] text-charcoal">“{{ item.quote }}”</p>
            </div>

            <div class="mt-xl border-t border-hairline pt-lg">
              <h3 class="text-h5 text-navy">{{ item.name }}</h3>
              <p class="mt-1 text-body-sm text-steel">{{ item.role }}</p>
              <p class="mt-sm text-caption-bold uppercase text-primary">{{ item.company }}</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stat-num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
</style>
