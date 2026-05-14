<script setup lang="ts">
definePageMeta({ layout: 'blank' })

useHead({
  title: 'quar.io — investor pitch',
  meta: [
    {
      name: 'description',
      content: 'Investor pitch for quar.io: QR-ready mobile instructions that protect marketplace product ratings.'
    }
  ]
})

const problemSignals = [
  'Покупатель не понял сборку и ставит 1-3 звезды',
  'Поддержка отвечает на одни и те же вопросы',
  'PDF на телефоне не помогает в момент раздражения',
  'Ошибка в бумажной инструкции требует нового тиража'
]

const wedgeSteps = [
  {
    step: '01',
    title: 'Находим товары с явными жалобами',
    copy: 'Смотрим отзывы и вопросы: инструкция, сборка, настройка, комплектация, "не работает".'
  },
  {
    step: '02',
    title: 'За 48 часов переделываем инструкцию',
    copy: 'PDF, фото или скан превращаются в мобильные шаги с QR-ссылкой и быстрыми ответами для поддержки.'
  },
  {
    step: '03',
    title: 'Показываем, где покупатель застрял',
    copy: 'Просмотры, дочитывание, отметки "непонятно", комментарии и проблемные шаги становятся планом правок.'
  }
]

const marketCards = [
  {
    title: 'Первый ICP',
    value: '10-100 SKU',
    copy: 'Private-label селлеры и бренды на маркетплейсах с повторяющимися жалобами на сборку и использование.'
  },
  {
    title: 'Категории входа',
    value: 'High-confusion',
    copy: 'Мебель, тренажеры, детские товары, электроника, инструменты, товары для хобби и сборки.'
  },
  {
    title: 'Платный момент',
    value: 'Pilot first',
    copy: 'Не SaaS-тариф с первого дня, а пакет переноса 5-10 инструкций с отчетом через 2-4 недели.'
  }
]

const proofMetrics = [
  'QR-инструкции опубликованы',
  'Ссылки размещены в карточке, вкладыше или чате',
  'Покупатели реально открывают инструкции',
  'Проблемные шаги получают правки',
  'Селлер просит перенести остальные SKU',
  'Пилот переходит в оплату или подписку'
]

const moatItems = [
  {
    title: 'Review-to-instruction workflow',
    copy: 'Не просто хостинг PDF: продукт начинается с конкретных плохих отзывов и закрывает их новой инструкцией.'
  },
  {
    title: 'QR остается стабильным',
    copy: 'Инструкцию можно исправить без перепечатки коробки, вкладыша или инфографики в карточке товара.'
  },
  {
    title: 'Данные превращаются в правки',
    copy: 'Клиент видит не сухие просмотры, а список шагов, которые угрожают отзыву и поддержке.'
  }
]

const roadmap = [
  'Пилоты: 3 селлера, 15-30 инструкций, реальные просмотры покупателей.',
  'Каталог: массовый импорт SKU, единый стиль, библиотека ссылок для поддержки.',
  'Expansion: переводы, печатные вкладыши, брендирование, затем интеграции и warranty modules.'
]
</script>

<template>
  <main class="bg-canvas text-ink">
    <section class="relative overflow-hidden bg-navy text-white">
      <div class="pointer-events-none absolute inset-0 opacity-80">
        <div class="absolute left-[7%] top-[16%] h-4 w-4 rounded-sm bg-brand-yellow rotate-6" />
        <div class="absolute left-[18%] top-[68%] h-5 w-5 rounded-sm bg-brand-pink -rotate-12" />
        <div class="absolute right-[14%] top-[18%] h-4 w-4 rounded-sm bg-brand-green rotate-12" />
        <div class="absolute right-[7%] top-[54%] h-5 w-5 rounded-sm bg-brand-orange -rotate-6" />
        <div class="pitch-mesh pitch-mesh-left" />
        <div class="pitch-mesh pitch-mesh-right" />
      </div>

      <div class="container-page relative py-20 md:py-hero">
        <div class="mx-auto max-w-5xl text-center">
          <p class="text-micro uppercase tracking-[1px] text-white/60">
            quar.io investor pitch
          </p>
          <h1 class="mt-5 text-[44px] font-semibold leading-[1.05] md:text-[80px]">
            Защита рейтинга товара через QR-инструкции, которые покупатель понимает.
          </h1>
          <p class="mx-auto mt-6 max-w-3xl text-subtitle text-white/75">
            quar.io помогает селлерам маркетплейсов превращать плохие PDF, бумажные вкладыши
            и хаотичные инструкции в мобильные шаги, QR-коды и отчет по местам, которые портят отзывы.
          </p>
          <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#deck" class="inline-flex h-11 items-center justify-center rounded-md bg-primary px-xl text-btn text-white transition-colors hover:bg-primary-pressed">
              Смотреть pitch
            </a>
            <a href="#ask" class="inline-flex h-11 items-center justify-center rounded-md border border-white/35 px-xl text-btn text-white transition-colors hover:bg-white/10">
              Инвестиционный запрос
            </a>
          </div>
        </div>

        <div class="mx-auto mt-14 grid max-w-6xl gap-lg lg:grid-cols-[1.15fr_0.85fr]">
          <div class="rounded-xl border border-white/20 bg-white text-ink shadow-mockup">
            <div class="flex items-center gap-2 border-b border-hairline px-md py-sm">
              <span class="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span class="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span class="h-3 w-3 rounded-full bg-[#28c840]" />
              <span class="ml-md text-caption text-steel">quar.io/product/chair-42</span>
            </div>
            <div class="grid gap-lg p-lg md:grid-cols-[0.95fr_1.05fr] md:p-2xl">
              <div class="rounded-lg bg-tint-sky p-lg">
                <div class="flex items-center justify-between">
                  <p class="text-caption-bold text-charcoal">Mobile instruction</p>
                  <span class="rounded-sm bg-white px-sm py-xxs text-micro text-steel">QR live</span>
                </div>
                <div class="mt-lg rounded-lg bg-white p-md shadow-subtle">
                  <p class="text-h5">Шаг 4. Зафиксируйте направляющую</p>
                  <p class="mt-2 text-body-sm text-steel">
                    Совместите отверстия до щелчка. Если деталь идет туго, не применяйте силу.
                  </p>
                  <div class="mt-md h-32 rounded-md bg-tint-peach p-sm">
                    <div class="h-full rounded-sm border border-dashed border-[#dd5b00]/35 bg-white/60" />
                  </div>
                  <div class="mt-md grid grid-cols-3 gap-xs text-center text-micro text-steel">
                    <span class="rounded-sm bg-tint-mint px-xs py-xxs">полезно</span>
                    <span class="rounded-sm bg-tint-yellow px-xs py-xxs">непонятно</span>
                    <span class="rounded-sm bg-tint-rose px-xs py-xxs">ошибка</span>
                  </div>
                </div>
              </div>

              <div class="space-y-md">
                <div class="rounded-lg border border-hairline bg-canvas p-lg">
                  <div class="flex items-start justify-between gap-md">
                    <div>
                      <p class="text-caption-bold uppercase tracking-[1px] text-hairline-strong">Risk report</p>
                      <h2 class="mt-2 text-h3">3 шага угрожают отзывам</h2>
                    </div>
                    <div class="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-ink text-[10px] leading-tight text-white">
                      QR
                    </div>
                  </div>
                  <div class="mt-lg space-y-sm">
                    <div class="rounded-md bg-tint-rose p-md">
                      <div class="flex items-center justify-between gap-md">
                        <span class="text-body-sm-md">Шаг 4: низкое дочитывание</span>
                        <span class="text-caption-bold text-brand-orange">High</span>
                      </div>
                    </div>
                    <div class="rounded-md bg-tint-yellow p-md">
                      <div class="flex items-center justify-between gap-md">
                        <span class="text-body-sm-md">Шаг 7: много отметок "непонятно"</span>
                        <span class="text-caption-bold text-brand-orange">Med</span>
                      </div>
                    </div>
                    <div class="rounded-md bg-tint-mint p-md">
                      <div class="flex items-center justify-between gap-md">
                        <span class="text-body-sm-md">Ссылка отправлена поддержкой</span>
                        <span class="text-caption-bold text-success">42</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-sm">
                  <div class="rounded-lg bg-tint-lavender p-md">
                    <p class="text-h4">48ч</p>
                    <p class="mt-1 text-caption text-steel">до QR-ready версии</p>
                  </div>
                  <div class="rounded-lg bg-tint-peach p-md">
                    <p class="text-h4">5-10</p>
                    <p class="mt-1 text-caption text-steel">инструкций в пилоте</p>
                  </div>
                  <div class="rounded-lg bg-tint-mint p-md">
                    <p class="text-h4">1 SKU</p>
                    <p class="mt-1 text-caption text-steel">первый proof point</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="rounded-xl border border-white/20 bg-white/10 p-xl backdrop-blur">
            <p class="text-caption-bold uppercase tracking-[1px] text-white/50">Thesis</p>
            <p class="mt-4 text-h3 text-white">
              Плохая инструкция превращается в плохой отзыв быстрее, чем бренд успевает ответить.
            </p>
            <div class="mt-xl space-y-sm">
              <div
                v-for="signal in problemSignals"
                :key="signal"
                class="rounded-md border border-white/20 bg-white/10 px-md py-sm text-body-sm text-white/80"
              >
                {{ signal }}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section id="deck" class="container-page py-section-lg">
      <div class="grid gap-lg lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p class="text-micro uppercase tracking-[1px] text-hairline-strong">Problem</p>
          <h2 class="mt-3 text-[48px] font-semibold leading-[1.15]">Селлер защищает рейтинг всем, кроме нормальной инструкции.</h2>
        </div>
        <div class="grid gap-md md:grid-cols-2">
          <div class="rounded-lg bg-tint-peach p-xl">
            <p class="text-h4">Рейтинг управляет экономикой</p>
            <p class="mt-3 text-body-sm text-charcoal/80">
              Плохой отзыв снижает конверсию карточки, ухудшает рекламную экономику и создает новые вопросы.
            </p>
          </div>
          <div class="rounded-lg bg-tint-lavender p-xl">
            <p class="text-h4">Инструкция живет не там</p>
            <p class="mt-3 text-body-sm text-charcoal/80">
              PDF, вкладыш и ответы поддержки не связаны в единый канал, который можно быстро исправлять.
            </p>
          </div>
          <div class="rounded-lg bg-tint-mint p-xl">
            <p class="text-h4">Саппорт видит симптомы</p>
            <p class="mt-3 text-body-sm text-charcoal/80">
              Повторяющиеся вопросы остаются в чатах и Q&A, но редко превращаются в улучшение конкретного шага.
            </p>
          </div>
          <div class="rounded-lg bg-tint-sky p-xl">
            <p class="text-h4">Покупатель раздражен уже сейчас</p>
            <p class="mt-3 text-body-sm text-charcoal/80">
              Ему нужна короткая мобильная подсказка по текущему шагу, а не общий документ на двадцать страниц.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-surface">
      <div class="container-page py-section-lg">
        <div class="mx-auto max-w-3xl text-center">
          <p class="text-micro uppercase tracking-[1px] text-hairline-strong">Solution</p>
          <h2 class="mt-3 text-[48px] font-semibold leading-[1.15]">quar.io превращает инструкцию в управляемый post-purchase канал.</h2>
        </div>

        <div class="mt-section grid gap-md lg:grid-cols-3">
          <div
            v-for="item in wedgeSteps"
            :key="item.step"
            class="rounded-lg border border-hairline bg-canvas p-2xl shadow-subtle"
          >
            <p class="text-h3 text-primary">{{ item.step }}</p>
            <h3 class="mt-lg text-h4">{{ item.title }}</h3>
            <p class="mt-3 text-body-sm text-steel">{{ item.copy }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-section-lg">
      <div class="rounded-xl bg-navy p-lg text-white md:p-3xl">
        <div class="grid gap-2xl lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p class="text-micro uppercase tracking-[1px] text-white/50">Market wedge</p>
            <h2 class="mt-3 text-[48px] font-semibold leading-[1.15]">Начинаем там, где боль уже видна публично.</h2>
          </div>
          <p class="text-subtitle text-white/70">
            Лучшие первые клиенты не говорят абстрактно “улучшить документацию”.
            У них уже есть карточки, отзывы и вопросы, где покупатели прямо жалуются на инструкцию.
          </p>
        </div>
        <div class="mt-2xl grid gap-md lg:grid-cols-3">
          <div
            v-for="card in marketCards"
            :key="card.title"
            class="rounded-lg border border-white/20 bg-white/10 p-xl"
          >
            <p class="text-caption-bold uppercase tracking-[1px] text-white/50">{{ card.title }}</p>
            <p class="mt-3 text-h3 text-white">{{ card.value }}</p>
            <p class="mt-3 text-body-sm text-white/70">{{ card.copy }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page pb-section-lg">
      <div class="grid gap-lg lg:grid-cols-[1fr_1fr]">
        <div class="rounded-xl bg-tint-yellow-bold p-2xl">
          <p class="text-micro uppercase tracking-[1px] text-brand-orange">Proof plan</p>
          <h2 class="mt-3 text-[36px] font-semibold leading-[1.2]">Что доказываем до масштабирования</h2>
          <div class="mt-xl grid gap-sm">
            <div
              v-for="metric in proofMetrics"
              :key="metric"
              class="rounded-md bg-white/70 px-md py-sm text-body-sm-md text-charcoal"
            >
              {{ metric }}
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-hairline bg-canvas p-2xl shadow-card">
          <p class="text-micro uppercase tracking-[1px] text-hairline-strong">Business model</p>
          <h2 class="mt-3 text-[36px] font-semibold leading-[1.2]">Пилот сначала, SaaS после доказанного спроса.</h2>
          <div class="mt-xl space-y-md">
            <div class="rounded-lg bg-surface p-lg">
              <p class="text-h5">Pilot</p>
              <p class="mt-2 text-body-sm text-steel">Фиксированная цена за перенос 5-10 инструкций, QR-ссылки, разбор отзывов и отчет.</p>
            </div>
            <div class="rounded-lg bg-tint-sky p-lg">
              <p class="text-h5">Catalog</p>
              <p class="mt-2 text-body-sm text-steel">Подписка для 50-200 SKU: массовый импорт, единый стиль, быстрые ответы и отчеты.</p>
            </div>
            <div class="rounded-lg bg-tint-lavender p-lg">
              <p class="text-h5">Brand / Enterprise</p>
              <p class="mt-2 text-body-sm text-steel">Брендирование, переводы, роли, интеграции и compliance только после реальных pull requests от клиентов.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-surface">
      <div class="container-page py-section-lg">
        <div class="grid gap-lg lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p class="text-micro uppercase tracking-[1px] text-hairline-strong">Differentiation</p>
            <h2 class="mt-3 text-[48px] font-semibold leading-[1.15]">Конкурируем не количеством фич, а моментом боли.</h2>
            <p class="mt-4 text-subtitle text-steel">
              QR-хостинг PDF, редакторы инструкций и AI-manual tools уже существуют.
              quar.io должен выигрывать конкретным входом: плохие отзывы в карточке товара.
            </p>
          </div>
          <div class="grid gap-md">
            <div
              v-for="item in moatItems"
              :key="item.title"
              class="rounded-lg border border-hairline bg-canvas p-xl"
            >
              <h3 class="text-h4">{{ item.title }}</h3>
              <p class="mt-2 text-body-sm text-steel">{{ item.copy }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-section-lg">
      <div class="grid gap-lg lg:grid-cols-[1.05fr_0.95fr]">
        <div class="rounded-xl border border-hairline bg-canvas p-2xl shadow-card">
          <p class="text-micro uppercase tracking-[1px] text-hairline-strong">Roadmap</p>
          <h2 class="mt-3 text-[36px] font-semibold leading-[1.2]">Следующие 90 дней</h2>
          <div class="mt-xl space-y-md">
            <div
              v-for="(item, index) in roadmap"
              :key="item"
              class="grid gap-md rounded-lg bg-surface p-lg md:grid-cols-[72px_1fr]"
            >
              <p class="text-h3 text-primary">0{{ index + 1 }}</p>
              <p class="text-body-md text-charcoal">{{ item }}</p>
            </div>
          </div>
        </div>

        <div id="ask" class="rounded-xl bg-ink p-2xl text-white">
          <p class="text-micro uppercase tracking-[1px] text-white/50">Investor ask</p>
          <h2 class="mt-3 text-[36px] font-semibold leading-[1.2]">Раунд должен купить скорость проверки, не раздутый продукт.</h2>
          <p class="mt-4 text-body text-white/70">
            Деньги нужны на founder-led sales, ручные пилоты, качество AI-переноса инструкций
            и быстрый цикл “отзывы → инструкция → размещение → данные → правка”.
          </p>
          <div class="mt-xl rounded-lg border border-white/20 bg-white/10 p-lg">
            <p class="text-caption-bold uppercase tracking-[1px] text-white/50">Milestone</p>
            <p class="mt-3 text-h4 text-white">
              Доказать, что селлер платит за перенос каталога после первого измеримого пилота.
            </p>
          </div>
          <div class="mt-lg grid grid-cols-2 gap-sm">
            <div class="rounded-lg bg-white p-md text-ink">
              <p class="text-h4">3</p>
              <p class="mt-1 text-caption text-steel">пилотных клиента</p>
            </div>
            <div class="rounded-lg bg-white p-md text-ink">
              <p class="text-h4">30</p>
              <p class="mt-1 text-caption text-steel">опубликованных инструкций</p>
            </div>
            <div class="rounded-lg bg-white p-md text-ink">
              <p class="text-h4">100+</p>
              <p class="mt-1 text-caption text-steel">реальных просмотров</p>
            </div>
            <div class="rounded-lg bg-white p-md text-ink">
              <p class="text-h4">1+</p>
              <p class="mt-1 text-caption text-steel">платный переход</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.pitch-mesh {
  position: absolute;
  width: 220px;
  height: 150px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 12px;
  background-image:
    linear-gradient(rgb(255 255 255 / 12%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 12%) 1px, transparent 1px);
  background-size: 22px 22px;
  transform: rotate(-8deg) skewX(-10deg);
}

.pitch-mesh-left {
  left: -54px;
  top: 300px;
}

.pitch-mesh-right {
  right: -48px;
  top: 96px;
  transform: rotate(9deg) skewX(10deg);
}
</style>
