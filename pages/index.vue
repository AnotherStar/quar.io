<script setup lang="ts">
useHead({
  title: 'quar.io — QR-инструкции, AI и продажи после покупки',
  meta: [
    {
      name: 'description',
      content: 'quar.io превращает старые инструкции в мобильный QR-канал после покупки: AI-оцифровка, редактор, уникальные QR-коды, поддержка, допродажи и аналитика понятности.'
    }
  ]
})

const storySlides = [
  {
    eyebrow: '01 · Оцифровка',
    title: 'Загрузите старую инструкцию, которую уже невозможно нормально править.',
    copy: 'PDF, фото или скан попадает в AI-разбор: quar.io превращает его в структуру шагов, предупреждений, изображений и блоков для мобильной страницы.',
    screen: 'Плейсхолдер: загрузка PDF, AI распознал шаги, справа черновик мобильной инструкции',
    points: ['PDF, фото, скан или текст', 'AI собирает черновик инструкции', 'Результат сразу можно править онлайн']
  },
  {
    eyebrow: '02 · Редактор',
    title: 'Исправляйте инструкцию без верстки, типографии и нового PDF.',
    copy: 'Если товар обновился, вышло новое приложение или покупатели нашли ошибку, команда меняет текст, порядок шагов, фото и предупреждения в удобном конструкторе.',
    screen: 'Плейсхолдер: редактор с шагами, предупреждением и кнопкой публикации новой версии',
    points: ['Правки после обратной связи', 'Новые версии товара и приложения', 'QR остается тем же после публикации']
  },
  {
    eyebrow: '03 · QR на товаре',
    title: 'Каждая единица товара может получить свой QR-код.',
    copy: 'Привязывайте QR через приложение с камерой, отслеживайте конкретную единицу товара и меняйте привязку кода в любой момент, если партия, модель или инструкция изменились.',
    screen: 'Плейсхолдер: мобильное приложение сканирует код и привязывает его к SKU, партии и инструкции',
    points: ['Уникальный QR для каждой единицы', 'Привязка через камеру без ручных ошибок', 'Любой код можно перепривязать позже']
  },
  {
    eyebrow: '04 · Поддержка и AI',
    title: 'Отвечайте на вопрос покупателя до того, как он уйдет писать негативный отзыв.',
    copy: 'Покупатель открывает QR, задает вопрос по товару или получает ссылку на нужный шаг. AI-ассистент знает инструкцию и помогает разобраться даже ночью.',
    screen: 'Плейсхолдер: чат покупателя с AI-ассистентом внутри инструкции и кнопка связи с продавцом',
    points: ['Ссылка на конкретный шаг', 'AI-помощь по инструкции 24/7', 'Канал для недовольства вне отзыва маркетплейса']
  },
  {
    eyebrow: '05 · Повторные продажи',
    title: 'Превратите момент использования товара в прямую продажу.',
    copy: 'В инструкции можно предложить расходники, допники, похожие товары, сервис, гарантию или скидку на повторную покупку именно у вас.',
    screen: 'Плейсхолдер: блок в инструкции с расходниками, скидкой и кнопкой прямого заказа',
    points: ['Допродажи после покупки', 'Расходники и аксессуары', 'Скидка на следующий заказ напрямую']
  }
]

const proofCards = [
  {
    metric: 'AI + редактор',
    label: 'старая инструкция становится живым онлайн-каналом'
  },
  {
    metric: 'Уникальный QR',
    label: 'можно отслеживать каждую единицу товара отдельно'
  },
  {
    metric: 'Повторная продажа',
    label: 'расходники, допники и скидки прямо после покупки'
  }
]

const bonusFeatures = [
  {
    title: 'Инструкция всегда под рукой',
    copy: 'Если QR нанесен на устройство или вкладыш, покупателю не нужно искать PDF, коробку или переписку.',
    icon: 'lucide:scan-line'
  },
  {
    title: 'Не тратитесь на верстку',
    copy: 'Конструктор собирает аккуратную мобильную инструкцию без дизайнера, ручной верстки и пересборки PDF.',
    icon: 'lucide:layout-template'
  },
  {
    title: 'Статистика понятности',
    copy: 'Видно, какие инструкции открывают, где покупатели застревают, что отмечают как непонятное и что нужно исправить.',
    icon: 'lucide:chart-no-axes-combined'
  }
]

const reportRows = [
  { label: 'Шаг 4: низкое дочитывание', value: 'риск отзыва', tone: 'rose' },
  { label: 'Шаг 7: много отметок "непонятно"', value: 'исправить', tone: 'yellow' },
  { label: 'Ссылка на шаг отправлена поддержкой', value: '42 раза', tone: 'mint' }
]

const packageCards = [
  {
    name: 'Пилот',
    price: '500 ₽',
    copy: '5-10 инструкций, QR-ссылки, AI-оцифровка и отчет по проблемным шагам через 2-4 недели.'
  },
  {
    name: 'Каталог',
    price: '4 500 ₽ / мес.',
    copy: 'Массовый перенос SKU, единый стиль, библиотека ссылок для поддержки, регулярная аналитика.'
  },
  {
    name: 'Бренд',
    price: 'от 14 500 ₽',
    copy: 'Брендирование, переводы, роли команды, уникальные QR-коды, расширенные сценарии допродаж.'
  }
]
</script>

<template>
  <div class="bg-canvas text-ink">
    <section class="relative overflow-hidden bg-navy text-white">
      <div class="absolute inset-0 opacity-70">
        <div class="absolute left-[8%] top-[18%] h-5 w-5 rotate-6 rounded-sm bg-brand-yellow" />
        <div class="absolute bottom-[18%] left-[14%] h-4 w-4 -rotate-12 rounded-sm bg-brand-pink" />
        <div class="absolute right-[9%] top-[22%] h-4 w-4 rotate-12 rounded-sm bg-brand-green" />
        <div class="absolute bottom-[26%] right-[16%] h-5 w-5 -rotate-6 rounded-sm bg-brand-orange" />
      </div>

      <div class="container-page relative py-8 md:py-10">
        <div class="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <p class="text-micro uppercase text-white/60">Инструкции, AI и QR после покупки</p>
            <h1 class="mt-5 max-w-3xl text-[40px] font-semibold leading-[1.06] md:text-[52px]">
              quar.io превращает вопросы покупателей в продажи.
            </h1>
            <p class="mt-6 max-w-2xl text-subtitle text-white/78">
              Когда покупатель сканирует QR на товаре, quar.io открывает не статичный PDF, а живой канал:
              инструкцию, AI-помощника, обратную связь, прямые допродажи и аналитику того, что понятно, а что нет.
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <UiButton to="/auth/register" size="md">
                Запустить триал на 1 месяц
                <Icon name="lucide:arrow-right" class="h-4 w-4" />
              </UiButton>
              <UiButton to="/pricing" variant="secondary-on-dark" size="md">
                Посмотреть пакеты
              </UiButton>
            </div>

          </div>

          <div class="max-h-[430px] overflow-hidden rounded-lg border border-white/18 bg-white text-ink shadow-mockup">
            <div class="flex items-center gap-2 border-b border-hairline px-md py-sm">
              <span class="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span class="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span class="h-3 w-3 rounded-full bg-[#28c840]" />
              <span class="ml-md truncate text-caption text-steel">quar.io/chair-42/setup</span>
            </div>

            <div class="grid gap-lg p-lg md:grid-cols-[0.95fr_1.05fr] md:p-2xl">
              <div class="rounded-lg bg-tint-sky p-md">
                <div class="flex items-center justify-between gap-md">
                  <p class="text-caption-bold text-charcoal">Мобильная инструкция</p>
                  <span class="rounded-sm bg-white px-sm py-xxs text-micro text-slate">QR активен</span>
                </div>

                <div class="mt-md rounded-md bg-white p-md shadow-subtle">
                  <p class="text-h5">Шаг 4. Зафиксируйте направляющую</p>
                  <p class="mt-2 text-body-sm text-slate">
                    Совместите отверстия до щелчка. Если деталь идет туго, проверьте сторону крепления.
                  </p>
                  <div class="mt-md rounded-md bg-tint-peach p-sm">
                    <p class="text-caption-bold text-charcoal">Важно</p>
                    <p class="mt-1 text-caption text-slate">Не затягивайте винт до установки второй направляющей.</p>
                  </div>
                  <div class="mt-md grid grid-cols-3 gap-xs text-center text-micro text-slate">
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
                      <p class="text-caption-bold uppercase text-stone">Канал после покупки</p>
                      <h2 class="mt-2 text-h3">Вопрос, правка, допродажа</h2>
                    </div>
                    <div class="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-ink text-micro text-white">
                      QR
                    </div>
                  </div>

                  <div class="mt-lg space-y-sm">
                    <div class="rounded-md bg-tint-rose p-md">
                      <div class="flex items-start justify-between gap-md">
                        <span class="text-body-sm-md">Покупатель не понял шаг</span>
                        <span class="shrink-0 text-caption-bold text-brand-orange">ответить</span>
                      </div>
                    </div>
                    <div class="rounded-md bg-tint-yellow p-md">
                      <div class="flex items-start justify-between gap-md">
                        <span class="text-body-sm-md">Инструкция обновлена</span>
                        <span class="shrink-0 text-caption-bold text-brand-orange">без печати</span>
                      </div>
                    </div>
                    <div class="rounded-md bg-tint-mint p-md">
                      <div class="flex items-start justify-between gap-md">
                        <span class="text-body-sm-md">Расходники к товару</span>
                        <span class="shrink-0 text-caption-bold text-success">заказать</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg bg-tint-lavender p-lg">
                  <p class="text-caption-bold uppercase text-[var(--color-brand-purple-800)]">Что получает селлер</p>
                  <p class="mt-2 text-body-sm text-charcoal">
                    QR-код ведет покупателя туда, где можно разобраться, задать вопрос,
                    получить AI-подсказку и купить нужные допники напрямую у вас.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-hairline bg-canvas">
      <div class="container-page grid gap-sm py-lg sm:grid-cols-3">
        <div
          v-for="card in proofCards"
          :key="card.metric"
          class="rounded-md border border-hairline bg-surface-soft p-md"
        >
          <p class="text-h4 text-ink">{{ card.metric }}</p>
          <p class="mt-1 text-caption text-slate">{{ card.label }}</p>
        </div>
      </div>
    </section>

    <section id="features" class="container-page py-section-lg">
      <div class="max-w-3xl">
        <p class="text-caption-bold uppercase text-stone">Как это работает</p>
        <h2 class="mt-3 text-h2 text-ink">Пять слайдов продукта: от старого PDF до прямой продажи после покупки.</h2>
      </div>

      <div class="mt-section space-y-lg">
        <article
          v-for="(slide, index) in storySlides"
          :key="slide.title"
          class="grid gap-lg rounded-lg border border-hairline bg-surface-soft p-lg md:grid-cols-[0.95fr_1.05fr] md:p-2xl"
        >
          <div>
            <p class="text-caption-bold uppercase text-stone">{{ slide.eyebrow }}</p>
            <h3 class="mt-3 text-h3 text-ink">{{ slide.title }}</h3>
            <p class="mt-3 text-body text-slate">{{ slide.copy }}</p>
            <ul class="mt-lg grid gap-sm">
              <li
                v-for="point in slide.points"
                :key="point"
                class="flex items-start gap-sm text-body-sm text-charcoal"
              >
                <Icon name="lucide:check" class="mt-[2px] h-4 w-4 shrink-0 text-success" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>

          <div
            :class="[
              'min-h-[260px] rounded-md border border-hairline bg-canvas p-md',
              index === 0 && 'bg-tint-sky',
              index === 1 && 'bg-tint-peach',
              index === 2 && 'bg-tint-mint',
              index === 3 && 'bg-tint-lavender',
              index === 4 && 'bg-tint-yellow'
            ]"
          >
            <div class="flex items-center gap-2 border-b border-black/10 pb-sm">
              <span class="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span class="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span class="h-3 w-3 rounded-full bg-[#28c840]" />
              <span class="ml-sm text-caption text-slate">плейсхолдер скриншота</span>
            </div>
            <div class="grid h-[210px] place-items-center text-center">
              <p class="max-w-md text-body-sm-md text-charcoal">{{ slide.screen }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="bg-ink text-white">
      <div class="container-page py-section-lg">
        <div class="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p class="text-caption-bold uppercase text-white/50">Что получается бонусом</p>
            <h2 class="mt-3 text-h2">Одна QR-точка закрывает инструкцию, поддержку, аналитику и повторную покупку.</h2>
            <p class="mt-4 text-body text-white/72">
              Эти фичи стоит показывать после главного сценария: они усиливают ценность продукта,
              но не размывают первое обещание.
            </p>
          </div>

          <div class="grid gap-md md:grid-cols-3 lg:grid-cols-1">
            <div
              v-for="feature in bonusFeatures"
              :key="feature.title"
              class="rounded-lg border border-white/14 bg-white/8 p-lg"
            >
              <Icon :name="feature.icon" class="h-6 w-6 text-brand-yellow" />
              <h3 class="mt-4 text-h4">{{ feature.title }}</h3>
              <p class="mt-2 text-body-sm text-white/70">{{ feature.copy }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-hairline bg-surface-soft">
      <div class="container-page py-section-lg">
        <div class="max-w-3xl">
          <p class="text-caption-bold uppercase text-stone">Статистика и улучшения</p>
          <h2 class="mt-3 text-h2 text-ink">Понимайте, что работает, а что превращает покупателя в недовольного.</h2>
          <p class="mt-3 text-body text-slate">
            quar.io показывает не только просмотры. Он помогает увидеть непонятные шаги,
            повторяющиеся вопросы, слабые места инструкции и товары, где QR-канал нужно улучшить первым.
          </p>
        </div>
        <div class="mt-section grid gap-md md:grid-cols-3">
          <div
            v-for="row in reportRows"
            :key="row.label"
            :class="[
              'rounded-md p-lg',
              row.tone === 'rose' && 'bg-tint-rose',
              row.tone === 'yellow' && 'bg-tint-yellow',
              row.tone === 'mint' && 'bg-tint-mint'
            ]"
          >
            <p class="text-body-sm-md text-charcoal">{{ row.label }}</p>
            <p class="mt-3 text-h4 text-ink">{{ row.value }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-section-lg">
      <div class="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <div>
          <p class="text-caption-bold uppercase text-stone">Пакеты</p>
          <h2 class="mt-3 text-h2 text-ink">Начните с пилота, а затем масштабируйте QR-канал на каталог.</h2>
          <p class="mt-4 text-body text-slate">
            Первый месяц нужен, чтобы проверить сценарий на реальных товарах,
            QR-кодах, вопросах покупателей и первых повторных продажах.
          </p>
          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <UiButton to="/auth/register">
              Запустить триал
              <Icon name="lucide:arrow-right" class="h-4 w-4" />
            </UiButton>
            <UiButton to="/pricing" variant="secondary">Выбрать пакет</UiButton>
          </div>
        </div>

        <div class="grid gap-md md:grid-cols-3 lg:grid-cols-1">
          <div
            v-for="pack in packageCards"
            :key="pack.name"
            class="rounded-lg border border-hairline bg-canvas p-lg"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 class="text-h4">{{ pack.name }}</h3>
              <p class="text-body-sm-md text-primary">{{ pack.price }}</p>
            </div>
            <p class="mt-3 text-body-sm text-slate">{{ pack.copy }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-navy text-white">
      <div class="container-page py-section text-center">
        <p class="text-caption-bold uppercase text-white/50">Call to action</p>
        <h2 class="mx-auto mt-3 max-w-3xl text-h2">
          Выберите 5-10 товаров, где покупатели чаще всего задают вопросы, и проверьте quar.io на них.
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-body text-white/72">
          За месяц можно оцифровать первые инструкции, привязать QR-коды, собрать обратную связь
          и понять, где инструкция превращается в поддержку и повторную покупку.
        </p>
        <div class="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <UiButton to="/auth/register">Запустить триал на 1 месяц</UiButton>
          <UiButton to="/pricing" variant="secondary-on-dark">Посмотреть пакеты</UiButton>
        </div>
      </div>
    </section>
  </div>
</template>
