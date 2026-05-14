<script setup lang="ts">
useHead({
  title: 'Мобильная инструкция по QR на товаре — quar.io',
  meta: [
    {
      name: 'description',
      content: 'quar.io открывает по QR на товаре мобильную инструкцию, AI-ассистента, обратную связь напрямую вам и блок повторной покупки. Меньше вопросов в поддержке, меньше негативных отзывов на маркетплейсе, больше повторных продаж.'
    }
  ]
})

type StorySlide = {
  eyebrow: string
  title: string
  copy: string
  screen: string
  points: string[]
  tone: 'sky' | 'peach' | 'mint' | 'lavender' | 'yellow' | 'rose' | 'cream'
}

type PainItem = {
  label: string
  cost: string
}

type ValueCard = {
  title: string
  copy: string
  icon: string
}

type NicheCase = {
  niche: string
  title: string
  body: string
  result: string
}

type FaqItem = {
  q: string
  a: string
}

type Tier = {
  code: string
  name: string
  price: string
  sub: string
  highlight: string
  features: string[]
  cta: string
  featured?: boolean
}

const painItems: PainItem[] = [
  {
    label: 'Покупатель не разобрался — оставил 1 звезду на карточке',
    cost: 'падает рейтинг и позиция в поиске'
  },
  {
    label: 'Чат маркетплейса ответил позже вас и хуже вас',
    cost: 'отзыв уже написан'
  },
  {
    label: 'Возврат с пометкой «не работает / не понял»',
    cost: 'товар возвращён, комиссия не возвращена'
  },
  {
    label: 'Расходник, фильтр, сменный картридж купили у конкурента',
    cost: 'повторная покупка ушла мимо вас'
  },
  {
    label: 'Нашли опечатку в инструкции — нужно перепечатывать тираж',
    cost: 'типография, склад, остановка отгрузки'
  }
]

const storySlides: StorySlide[] = [
  {
    eyebrow: '01 · QR на товаре',
    title: 'Покупатель сканирует код — и видит инструкцию, а не PDF на 26 страниц.',
    copy: 'QR можно нанести на упаковку, вкладыш, корпус или гарантийный талон. Открывается мобильная страница: листается пальцем, есть поиск, фото показываются нормально без pinch-to-zoom. Скачивать ничего не нужно.',
    screen: 'Телефон с открытой инструкцией: заголовок шага, фото, блок «важно», кнопки «полезно / непонятно / ошибка» под каждым шагом.',
    points: [
      'Открывается с любого телефона без приложения',
      'Поиск по инструкции — покупатель находит свой шаг',
      'Видны предупреждения и фото, а не «PDF не читается»'
    ],
    tone: 'sky'
  },
  {
    eyebrow: '02 · AI-оцифровка',
    title: 'Загрузите старый PDF или фото — AI соберёт из этого редактируемую инструкцию.',
    copy: 'Если у вас десятки SKU и инструкции лежат как сканы, фотографии или экспорт из 1С — quar.io разбирает их на шаги, предупреждения, изображения и блоки. Не нужно нанимать верстальщика и переписывать всё руками.',
    screen: 'Слева — дроп-зона с PDF и сканами. Справа — черновик инструкции с распознанными шагами, подсветкой предупреждений и блоком «требует проверки».',
    points: [
      'PDF, фото, скан, экспорт из 1С',
      'AI собирает черновик за минуты, а не за неделю',
      'Любое распознавание можно править онлайн'
    ],
    tone: 'peach'
  },
  {
    eyebrow: '03 · Редактор без перепечатки',
    title: 'Нашли ошибку — поправили в браузере. На товарах ничего перепечатывать не нужно.',
    copy: 'Новая версия товара, изменился сертификат, вышло новое мобильное приложение, в шаге 4 опечатка — правка в редакторе и публикация. QR на упаковке остаётся тем же, покупатели видят актуальную версию.',
    screen: 'Онлайн-редактор: блоки шагов, drag-and-drop фото, кнопка «опубликовать новую версию». Справа — превью мобильной страницы.',
    points: [
      'Правка инструкции — 10 минут, без типографии',
      'История версий и кто что менял',
      'QR-код на упаковке не меняется'
    ],
    tone: 'mint'
  },
  {
    eyebrow: '04 · Уникальный QR на единицу товара',
    title: 'Каждый код — это конкретная единица. Привязка через приложение с камерой, без ручных опечаток.',
    copy: 'Партии, серии, разные варианты комплектации — каждому коду своя инструкция. Если поменялась модель или партия, привязку любого QR можно перепривязать в кабинете. Никакого Excel с SKU и кодами вручную.',
    screen: 'Мобильное приложение сканирует QR на товаре и привязывает к SKU, серии и активной инструкции. На экране — статус «привязан» и история привязок этого кода.',
    points: [
      'Один товар — один уникальный QR',
      'Привязка камерой, ошибки опечатки исключены',
      'Перепривязка — в любой момент, без перепечатки'
    ],
    tone: 'lavender'
  },
  {
    eyebrow: '05 · Канал жалобы внутри инструкции',
    title: 'Покупатель пишет недовольство вам, а не на витрину маркетплейса.',
    copy: 'В каждой инструкции — кнопки «непонятно», «ошибка» и форма обращения. Пока чат маркетплейса будет отвечать, покупатель уже получит ответ от вас. Один отвеченный вопрос — это не написанный отзыв с одной звездой.',
    screen: 'Мобильная страница инструкции: под шагом 4 кнопка «не работает». Открывается форма: фото, описание, контакт. В кабинете — карточка обращения с привязкой к шагу.',
    points: [
      'Жалоба идёт вам, а не в отзывы карточки',
      'Ответ — в день обращения, до плохого отзыва',
      'Видно, на каком именно шаге сорвалось'
    ],
    tone: 'rose'
  },
  {
    eyebrow: '06 · AI-ассистент по инструкции 24/7',
    title: 'Покупатель спрашивает текстом или голосом — ассистент знает вашу инструкцию.',
    copy: 'Ночь, выходные, чат маркетплейса спит. AI-ассистент отвечает на вопросы по конкретно вашей инструкции, ссылается на нужный шаг и снимает поток повторяющихся вопросов до того, как они доходят до поддержки.',
    screen: 'Чат AI-помощника внутри инструкции: вопрос покупателя, ответ со ссылкой «перейти к шагу 4», кнопка «всё ещё не работает — связаться с продавцом».',
    points: [
      'Ответ за секунды, без живой смены',
      'Знает только вашу инструкцию — не выдумывает',
      'Эскалация на вас, если ассистент не справился'
    ],
    tone: 'yellow'
  },
  {
    eyebrow: '07 · Допродажи в момент использования товара',
    title: 'Расходник, аксессуар, гарантия и скидка на повторный заказ — внутри инструкции.',
    copy: 'Покупатель меняет фильтр, заканчивается серум, нужен запасной картридж — он не идёт в поиск маркетплейса, где конкуренты, а заказывает у вас прямо из инструкции. Ваш QR — это ваш канал повторной покупки.',
    screen: 'В шаге «обслуживание раз в 6 месяцев» — карточка «пора менять фильтр», кнопки «заказать у продавца» и «напомнить через 5 месяцев».',
    points: [
      'Допродажи без комиссии за привлечение',
      'Напоминания о расходниках по таймеру',
      'Скидка на повторную покупку именно у вас'
    ],
    tone: 'cream'
  }
]

const valueCards: ValueCard[] = [
  {
    title: 'Минус негативные отзывы про «непонятную инструкцию»',
    copy: 'Покупатель сначала откроет AI-ассистента и кнопку «непонятно», и только потом — раздел отзывов на карточке. Большая часть жалоб теперь приходит вам в кабинет, а не в публичные 1-звёздочные отзывы.',
    icon: 'lucide:message-square-warning'
  },
  {
    title: 'Минус нагрузка на поддержку',
    copy: 'Повторяющиеся вопросы про «как подключить», «куда вставить батарейку», «что делать если мигает» закрывает AI на инструкции. До людей доходят только нестандартные случаи.',
    icon: 'lucide:bot'
  },
  {
    title: 'Плюс канал повторных продаж без комиссии маркетплейса',
    copy: 'Расходники, аксессуары, гарантия и скидки на повторный заказ — прямо внутри инструкции, со ссылкой к вам. Покупатель не уходит в чужой поиск.',
    icon: 'lucide:repeat'
  },
  {
    title: 'Инструкцию исправляете за 10 минут — без типографии',
    copy: 'Опечатка, новая версия товара, новое приложение — правите в браузере. Тираж вкладышей перепечатывать не нужно: QR на упаковке ведёт на актуальную версию.',
    icon: 'lucide:pencil-line'
  },
  {
    title: 'Видно, на каком шаге покупатель злится',
    copy: 'В отчёте — не «просмотры», а конкретные шаги, на которых низкое дочитывание, много пометок «непонятно» или «ошибка». Видно, что чинить, и видно — починилось ли это после правки.',
    icon: 'lucide:chart-no-axes-combined'
  },
  {
    title: 'QR работает на любой упаковке',
    copy: 'Наклейка на корпусе, вкладыш в коробке, печать на гарантийном талоне, гравировка. Один QR-код — и канал поддержки и повторных продаж работает столько, сколько живёт товар.',
    icon: 'lucide:scan-line'
  }
]

const nicheCases: NicheCase[] = [
  {
    niche: 'Бытовая техника / гаджеты',
    title: 'Робот-пылесос на 12 SKU',
    body: 'Вопросы «как подключить к Wi-Fi» и «почему мигает индикатор» уходят AI-ассистенту. Замена щёток и фильтров — заказывается из шага «обслуживание» прямо у продавца.',
    result: 'Ответ покупателю — за секунды, поток в поддержку — короче, фильтры покупают у вас.'
  },
  {
    niche: 'Мебель и сборка',
    title: 'Стол на самостоятельную сборку',
    body: 'После первой партии в шаге 7 видно низкое дочитывание и пометки «отверстия не совпадают». Шаг переписали и добавили фото — за 15 минут, без новой типографии.',
    result: 'Возвраты «не разобрался со сборкой» снижаются уже на следующей партии.'
  },
  {
    niche: 'Косметика и уход',
    title: 'Серум на 30 мл',
    body: 'Покупатель сканирует QR на флаконе, видит схему ухода и таймер «пора повторить заказ через 25 дней». В нужный день — пуш и карточка с тем же серумом со скидкой.',
    result: 'Повторные заказы идут напрямую, а не через поиск конкурентов.'
  }
]

const reportRows = [
  { label: 'Шаг 4: низкое дочитывание', value: 'риск отзыва', tone: 'rose' as const },
  { label: 'Шаг 7: много пометок «непонятно»', value: 'исправить', tone: 'yellow' as const },
  { label: 'Ссылка на шаг отправлена поддержкой', value: '42 раза', tone: 'mint' as const }
]

const beforeAfter = [
  {
    title: 'До quar.io',
    bullets: [
      'Шаг 4 непонятен — узнаём через отзыв с 1 звездой через 6 недель',
      'Опечатка ⇒ новый тираж вкладышей и склад',
      'Покупатель уходит за фильтром в поиск маркетплейса',
      'Чат поддержки тонет в одинаковых вопросах'
    ],
    tone: 'rose'
  },
  {
    title: 'С quar.io',
    bullets: [
      'Шаг 4 непонятен — видно в отчёте на 3-й день, правится за 10 минут',
      'Опечатка правится в редакторе, QR на упаковке не меняется',
      'Покупатель заказывает фильтр прямо из инструкции у вас',
      'AI снимает повторяющиеся вопросы, поддержка занимается сложным'
    ],
    tone: 'mint'
  }
]

const tiers: Tier[] = [
  {
    code: 'pilot',
    name: 'Пилот',
    price: '500 ₽',
    sub: 'единоразовый запуск',
    highlight: 'Проверить сценарий на 5–10 товарах',
    features: [
      'Перенос 5–10 инструкций (AI-оцифровка входит)',
      'QR-ссылки для карточки, вкладыша и поддержки',
      'Разбор текущих отзывов и вопросов по этим SKU',
      '1 месяц триала кабинета',
      'Отчёт по проблемным шагам через 2–4 недели'
    ],
    cta: 'Запустить пилот'
  },
  {
    code: 'catalog',
    name: 'Каталог',
    price: '4 500 ₽',
    sub: 'в месяц',
    highlight: 'Перевести каталог на QR-канал',
    featured: true,
    features: [
      '50–200 инструкций',
      'Массовый импорт SKU и PDF',
      'Единый стиль мобильных инструкций',
      'AI-ассистент по инструкции и обратная связь',
      'Библиотека быстрых ссылок для поддержки',
      'Регулярный отчёт по рисковым SKU'
    ],
    cta: 'Перевести каталог'
  },
  {
    code: 'brand',
    name: 'Бренд',
    price: 'от 14 500 ₽',
    sub: 'в месяц',
    highlight: 'Зрелый каталог, команда и переводы',
    features: [
      'Брендирование публичных инструкций',
      'Языковые версии и переводы',
      'Роли команды и история правок',
      'Уникальные QR-коды на единицу товара',
      'Расширенные сценарии допродаж и сегменты',
      'Интеграции под подтверждённый сценарий'
    ],
    cta: 'Обсудить пакет'
  }
]

const faqItems: FaqItem[] = [
  {
    q: 'А если QR-код уже напечатан на коробке, а инструкцию надо изменить?',
    a: 'Поменять можно только содержимое — сам QR на упаковке остаётся тем же. После публикации новой версии все, кто отсканирует тот же код, увидят актуальную инструкцию.'
  },
  {
    q: 'Получится перенести наши старые PDF, или нужно переписывать с нуля?',
    a: 'Не нужно. quar.io принимает PDF, фото, сканы и текстовые экспорты. AI собирает из них черновик инструкции с шагами, предупреждениями и фото — дальше остаётся проверить и опубликовать.'
  },
  {
    q: 'Это работает без приложения у покупателя?',
    a: 'Да. Покупатель открывает камеру телефона, сканирует QR и попадает на мобильную страницу. Никаких установок и регистраций.'
  },
  {
    q: 'Где смотреть, что инструкция действительно помогает?',
    a: 'В кабинете виден отчёт по каждой инструкции: какие шаги дочитывают, на каких ставят «непонятно» или «ошибка», сколько вопросов закрыл AI-ассистент и сколько обращений ушло в поддержку. Виден эффект до и после правки.'
  },
  {
    q: 'Можно ли продавать расходники и аксессуары прямо из инструкции?',
    a: 'Да. Внутри шагов и в конце инструкции можно показывать карточки расходников, аксессуаров, гарантии и скидку на повторную покупку — со ссылкой на ваш канал продаж, не маркетплейса.'
  }
]

const toneClass: Record<StorySlide['tone'], string> = {
  sky: 'bg-tint-sky',
  peach: 'bg-tint-peach',
  mint: 'bg-tint-mint',
  lavender: 'bg-tint-lavender',
  yellow: 'bg-tint-yellow',
  rose: 'bg-tint-rose',
  cream: 'bg-surface'
}
</script>

<template>
  <div class="bg-canvas text-ink">
    <section class="relative overflow-hidden border-b border-hairline bg-surface">
      <div class="container-page relative py-md">
        <nav class="flex items-center justify-between gap-md rounded-md border border-hairline bg-white/80 px-md py-sm shadow-subtle backdrop-blur">
          <NuxtLink to="/" class="flex min-w-0 items-center gap-sm text-body-sm-md text-ink">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink text-caption-bold text-white">q</span>
            <span class="truncate">quar.io</span>
          </NuxtLink>
          <div class="hidden items-center gap-lg text-body-sm-md text-steel md:flex">
            <a href="#how" class="transition-colors hover:text-ink">Как работает</a>
            <a href="#effects" class="transition-colors hover:text-ink">Эффект</a>
            <a href="#pricing" class="transition-colors hover:text-ink">Тарифы</a>
          </div>
          <UiButton to="/auth/register" size="sm" variant="dark">
            Запустить пилот
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </UiButton>
        </nav>
      </div>

      <div class="container-page grid gap-10 pb-section pt-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:pb-section-lg lg:pt-section-sm">
        <div>
          <div class="inline-flex max-w-full items-center gap-2 rounded-full border border-hairline bg-canvas px-sm py-xxs text-caption-bold text-charcoal shadow-subtle">
            <Icon name="lucide:scan-line" class="h-4 w-4 shrink-0 text-primary" />
            <span class="truncate">QR-инструкция, AI и повторные продажи после покупки</span>
          </div>

          <h1 class="mt-5 max-w-4xl text-[42px] font-semibold leading-[1.04] text-ink md:text-[58px] lg:text-[68px]">
            Покупатель отсканировал QR — и не пошёл писать злой отзыв.
          </h1>
          <p class="mt-6 max-w-2xl text-subtitle text-steel">
            quar.io открывает по QR на товаре мобильную инструкцию, AI-ассистента, кнопку обратной связи прямо вам и блок повторной покупки.
            PDF никто не скачивает. Тираж инструкций перепечатывать не нужно.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <UiButton to="/auth/register" size="md">
              Попробовать на 5 товарах за месяц
              <Icon name="lucide:arrow-right" class="h-4 w-4" />
            </UiButton>
            <UiButton href="#how" variant="secondary" size="md">
              Как это работает
            </UiButton>
          </div>

          <div class="mt-6 flex flex-wrap gap-2 text-caption text-steel">
            <span class="rounded-sm border border-hairline bg-canvas px-sm py-xs">Пилот — 500 ₽</span>
            <span class="rounded-sm border border-hairline bg-canvas px-sm py-xs">Без приложения у покупателя</span>
            <span class="rounded-sm border border-hairline bg-canvas px-sm py-xs">QR не меняется после правок</span>
          </div>
        </div>

        <div class="relative">
          <div class="absolute -right-6 -top-6 hidden h-24 w-24 rounded-md bg-tint-yellow-bold md:block" />
          <div class="absolute -bottom-5 -left-5 hidden h-20 w-20 rounded-md bg-tint-mint md:block" />
          <div class="relative overflow-hidden rounded-lg border border-hairline bg-canvas shadow-mockup">
            <div class="flex items-center justify-between gap-md border-b border-hairline bg-white px-md py-sm">
              <div class="flex min-w-0 items-center gap-2">
                <span class="h-3 w-3 shrink-0 rounded-full bg-[#ff5f57]" />
                <span class="h-3 w-3 shrink-0 rounded-full bg-[#febc2e]" />
                <span class="h-3 w-3 shrink-0 rounded-full bg-[#28c840]" />
                <span class="ml-sm truncate text-caption text-steel">quar.io/acme/robot-vacuum-x2/setup</span>
              </div>
              <span class="hidden rounded-sm bg-tint-mint px-sm py-xxs text-micro text-charcoal sm:inline-flex">QR активен</span>
            </div>

            <div class="grid gap-0 lg:grid-cols-[0.84fr_1.16fr]">
              <div class="border-b border-hairline bg-tint-sky p-lg lg:border-b-0 lg:border-r">
                <div class="mx-auto max-w-[300px] rounded-[28px] border-[10px] border-ink bg-white shadow-card">
                  <div class="flex items-center justify-between border-b border-hairline px-md py-sm">
                    <span class="text-micro text-steel">09:41</span>
                    <Icon name="lucide:wifi" class="h-4 w-4 text-steel" />
                  </div>
                  <div class="space-y-md p-md">
                    <div>
                      <p class="text-caption-bold uppercase text-hairline-strong">Робот-пылесос X2</p>
                      <h2 class="mt-1 text-h4">Шаг 4. Подключение к Wi‑Fi</h2>
                    </div>
                    <div class="h-28 rounded-md bg-surface">
                      <div class="flex h-full items-center justify-center">
                        <Icon name="lucide:router" class="h-10 w-10 text-primary" />
                      </div>
                    </div>
                    <p class="text-body-sm text-steel">
                      Если индикатор мигает синим — нажмите кнопку питания на 3 секунды.
                    </p>
                    <div class="rounded-md bg-tint-peach p-sm">
                      <p class="text-caption-bold text-charcoal">Если не получается</p>
                      <p class="mt-1 text-caption text-steel">Проверьте, что телефон подключён к сети 2,4 ГГц.</p>
                    </div>
                    <div class="grid grid-cols-3 gap-xs text-center text-micro text-steel">
                      <span class="rounded-sm bg-tint-mint px-xs py-xxs">полезно</span>
                      <span class="rounded-sm bg-tint-yellow px-xs py-xxs">непонятно</span>
                      <span class="rounded-sm bg-tint-rose px-xs py-xxs">не работает</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-lg md:p-2xl">
                <div class="flex items-start justify-between gap-md">
                  <div>
                    <p class="text-caption-bold uppercase text-hairline-strong">В кабинете продавца</p>
                    <h2 class="mt-2 text-h3">Сегодня по этой инструкции</h2>
                  </div>
                  <div class="grid h-20 w-20 shrink-0 grid-cols-3 gap-1 rounded-md bg-ink p-2">
                    <span v-for="i in 9" :key="i" class="rounded-[2px] bg-white" />
                  </div>
                </div>

                <div class="mt-lg grid gap-sm">
                  <div class="rounded-md bg-tint-rose p-md">
                    <div class="flex items-start justify-between gap-md">
                      <span class="text-body-sm-md">Шаг 4: 14 пометок «не работает»</span>
                      <span class="shrink-0 text-caption-bold text-brand-orange">проверить</span>
                    </div>
                  </div>
                  <div class="rounded-md bg-tint-yellow p-md">
                    <div class="flex items-start justify-between gap-md">
                      <span class="text-body-sm-md">AI ответил на 38 вопросов про Wi‑Fi</span>
                      <span class="shrink-0 text-caption-bold text-brand-orange">−38 в поддержку</span>
                    </div>
                  </div>
                  <div class="rounded-md bg-tint-mint p-md">
                    <div class="flex items-start justify-between gap-md">
                      <span class="text-body-sm-md">Заказы фильтров через инструкцию</span>
                      <span class="shrink-0 text-caption-bold text-success">+12 за неделю</span>
                    </div>
                  </div>
                </div>

                <div class="mt-lg grid gap-sm rounded-md border border-hairline bg-surface p-md sm:grid-cols-3">
                  <div>
                    <p class="text-h4">3 мин</p>
                    <p class="text-caption text-steel">до ответа AI</p>
                  </div>
                  <div>
                    <p class="text-h4">10 мин</p>
                    <p class="text-caption text-steel">на правку шага</p>
                  </div>
                  <div>
                    <p class="text-h4">0 ₽</p>
                    <p class="text-caption text-steel">на перепечатку</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-hairline bg-canvas">
      <div class="container-page py-section-sm">
        <div class="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-start">
          <div>
            <p class="text-caption-bold uppercase text-hairline-strong">Что забирает у вас деньги после покупки</p>
            <h2 class="mt-3 text-h2 text-ink">
              Главные потери продавца происходят не до заказа, а после получения товара.
            </h2>
          </div>
          <div class="grid gap-sm md:grid-cols-2">
            <div
              v-for="item in painItems"
              :key="item.label"
              class="group rounded-md border border-hairline bg-surface p-md transition-colors hover:bg-canvas"
            >
              <p class="text-body-sm-md text-charcoal">{{ item.label }}</p>
              <p class="mt-2 text-caption text-steel">{{ item.cost }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-canvas">
      <div class="container-page py-section-sm">
        <div class="grid gap-lg rounded-lg border border-ink bg-ink p-lg text-white md:grid-cols-[0.72fr_1.28fr] md:p-2xl">
          <p class="text-caption-bold uppercase text-white/50">Один QR-код вместо пяти каналов</p>
          <h2 class="text-h2">
            QR на товаре превращается в канал, через который покупатель спрашивает, разбирается, жалуется и заказывает заново — у вас, а не на витрине маркетплейса.
          </h2>
        </div>
      </div>
    </section>

    <section id="how" class="container-page py-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase text-hairline-strong">Как покупатель проходит путь от QR на коробке до новой покупки</p>
        <h2 class="mt-3 text-h2 text-ink">Семь моментов, ради которых quar.io вообще нужен.</h2>
      </div>

      <div class="mt-section grid gap-md">
        <article
          v-for="(slide, index) in storySlides"
          :key="slide.title"
          class="grid gap-lg rounded-lg border border-hairline bg-surface p-lg md:grid-cols-[0.9fr_1.1fr] md:p-2xl"
        >
          <div :class="index % 2 === 1 && 'md:order-2'">
            <p class="text-caption-bold uppercase text-hairline-strong">{{ slide.eyebrow }}</p>
            <h3 class="mt-3 text-h3 text-ink">{{ slide.title }}</h3>
            <p class="mt-3 text-body text-steel">{{ slide.copy }}</p>
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

          <div :class="['min-h-[280px] rounded-md border border-hairline p-md', toneClass[slide.tone]]">
            <div class="flex items-center justify-between gap-md border-b border-black/10 pb-sm">
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span class="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span class="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <span class="text-caption text-steel">продуктовый экран</span>
            </div>
            <div class="grid min-h-[220px] place-items-center px-md text-center">
              <p class="max-w-md text-body-sm-md text-charcoal">{{ slide.screen }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section id="effects" class="border-y border-hairline bg-surface">
      <div class="container-page py-section-lg">
        <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <p class="text-caption-bold uppercase text-hairline-strong">Не функции, а бизнес-эффект</p>
            <h2 class="mt-3 text-h2 text-ink">
              Что меняется в кабинете продавца через 4 недели после запуска.
            </h2>
            <p class="mt-4 text-body text-steel">
              Это не «возможности платформы». Это то, ради чего продавцы маркетплейсов и private-label бренды приходят и остаются в quar.io.
            </p>
          </div>

          <div class="grid gap-md md:grid-cols-2">
            <div
              v-for="value in valueCards"
              :key="value.title"
              class="rounded-md border border-hairline bg-canvas p-lg"
            >
              <Icon :name="value.icon" class="h-6 w-6 text-primary" />
              <h3 class="mt-4 text-h4">{{ value.title }}</h3>
              <p class="mt-2 text-body-sm text-steel">{{ value.copy }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-section-lg">
      <div class="max-w-3xl">
        <p class="text-caption-bold uppercase text-hairline-strong">Как это выглядит в реальных нишах</p>
        <h2 class="mt-3 text-h2 text-ink">Три коротких сценария — техника, мебель и косметика.</h2>
      </div>
      <div class="mt-section grid gap-md md:grid-cols-3">
        <article
          v-for="item in nicheCases"
          :key="item.title"
          class="rounded-md border border-hairline bg-canvas p-lg shadow-subtle"
        >
          <UiBadge variant="tag-blue">{{ item.niche }}</UiBadge>
          <h3 class="mt-4 text-h4 text-ink">{{ item.title }}</h3>
          <p class="mt-3 text-body-sm text-steel">{{ item.body }}</p>
          <div class="mt-md rounded-md bg-tint-mint p-md">
            <p class="text-caption-bold text-charcoal">Результат</p>
            <p class="mt-1 text-body-sm text-charcoal">{{ item.result }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="border-y border-hairline bg-canvas">
      <div class="container-page py-section-lg">
        <div class="grid gap-10 lg:grid-cols-[0.76fr_1.24fr]">
          <div>
            <p class="text-caption-bold uppercase text-hairline-strong">Что вы видите в кабинете</p>
            <h2 class="mt-3 text-h2 text-ink">
              Видно, на каком шаге покупатель злится — и можно починить это за 10 минут.
            </h2>
            <p class="mt-3 text-body text-steel">
              quar.io показывает не просто «просмотры». Видно конкретные шаги с риском отзыва, повторяющиеся вопросы и инструкции, где QR-канал нужно улучшить первым.
            </p>
          </div>

          <div>
            <div class="grid gap-md md:grid-cols-3">
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

            <div class="mt-md grid gap-md md:grid-cols-2">
              <article
                v-for="block in beforeAfter"
                :key="block.title"
                :class="[
                  'rounded-md p-lg',
                  block.tone === 'rose' ? 'bg-tint-rose' : 'bg-tint-mint'
                ]"
              >
                <h3 class="text-h4 text-ink">{{ block.title }}</h3>
                <ul class="mt-md grid gap-sm">
                  <li
                    v-for="bullet in block.bullets"
                    :key="bullet"
                    class="flex items-start gap-sm text-body-sm text-charcoal"
                  >
                    <Icon
                      :name="block.tone === 'rose' ? 'lucide:x' : 'lucide:check'"
                      class="mt-[2px] h-4 w-4 shrink-0"
                      :class="block.tone === 'rose' ? 'text-brand-orange' : 'text-success'"
                    />
                    <span>{{ bullet }}</span>
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="container-page py-section-lg">
      <div class="grid gap-10 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
        <div>
          <p class="text-caption-bold uppercase text-hairline-strong">Тарифы</p>
          <h2 class="mt-3 text-h2 text-ink">Начните с пилота на товарах, где инструкция уже влияет на отзывы.</h2>
          <p class="mt-4 text-body text-steel">
            Бесплатного тарифа нет. Месяц триала кабинета входит в пакет «Пилот»: за это время вы переносите первые инструкции, привязываете QR на реальные SKU и получаете отчёт по проблемным шагам.
          </p>
          <ul class="mt-lg grid gap-sm">
            <li class="flex items-start gap-sm text-body-sm text-charcoal">
              <Icon name="lucide:check" class="mt-[2px] h-4 w-4 shrink-0 text-success" />
              <span>AI-оцифровка старых PDF и сканов входит в каждый пакет</span>
            </li>
            <li class="flex items-start gap-sm text-body-sm text-charcoal">
              <Icon name="lucide:check" class="mt-[2px] h-4 w-4 shrink-0 text-success" />
              <span>Мобильная инструкция, обратная связь и AI-ассистент работают на любом тарифе</span>
            </li>
            <li class="flex items-start gap-sm text-body-sm text-charcoal">
              <Icon name="lucide:check" class="mt-[2px] h-4 w-4 shrink-0 text-success" />
              <span>Уникальный QR на единицу товара — на тарифе «Бренд»</span>
            </li>
          </ul>
        </div>

        <div class="grid gap-md md:grid-cols-3">
          <div
            v-for="tier in tiers"
            :key="tier.code"
            :class="[
              'flex flex-col rounded-md p-lg',
              tier.featured ? 'border-2 border-primary bg-surface shadow-card' : 'border border-hairline bg-canvas'
            ]"
          >
            <div class="flex items-start justify-between gap-sm">
              <h3 class="text-h3">{{ tier.name }}</h3>
              <UiBadge v-if="tier.featured" variant="popular">Чаще всего</UiBadge>
            </div>
            <p class="mt-md text-h2">{{ tier.price }}</p>
            <p class="text-caption text-steel">{{ tier.sub }}</p>
            <p class="mt-md text-body-sm-md text-charcoal">{{ tier.highlight }}</p>
            <UiButton to="/auth/register" class="mt-md" block :variant="tier.featured ? 'primary' : 'secondary'">
              {{ tier.cta }}
            </UiButton>
            <ul class="mt-md space-y-2">
              <li
                v-for="feature in tier.features"
                :key="feature"
                class="flex items-start gap-2 text-body-sm text-charcoal"
              >
                <Icon name="lucide:check" class="mt-[2px] h-4 w-4 shrink-0 text-success" />
                <span>{{ feature }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="border-t border-hairline bg-surface">
      <div class="container-page py-section-lg">
        <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <p class="text-caption-bold uppercase text-hairline-strong">Частые вопросы</p>
            <h2 class="mt-3 text-h2 text-ink">Что обычно спрашивают перед запуском пилота.</h2>
          </div>
          <div class="grid gap-sm">
            <details
              v-for="item in faqItems"
              :key="item.q"
              class="group rounded-md border border-hairline bg-canvas p-lg open:bg-white"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-md text-h5 text-ink">
                <span>{{ item.q }}</span>
                <Icon name="lucide:chevron-down" class="h-5 w-5 shrink-0 text-steel transition-transform group-open:rotate-180" />
              </summary>
              <p class="mt-3 text-body text-steel">{{ item.a }}</p>
            </details>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-ink text-white">
      <div class="container-page py-section text-center">
        <p class="text-caption-bold uppercase text-white/50">С чего начать</p>
        <h2 class="mx-auto mt-3 max-w-3xl text-h2">
          Возьмите 5 SKU, по которым у вас чаще всего возвраты или вопросы — и проверьте quar.io за месяц.
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-body text-white/72">
          За 4 недели вы оцифруете первые инструкции, привяжете QR к товарам, увидите отчёт по непонятным шагам и поймаете первые повторные заказы напрямую — мимо комиссии маркетплейса.
        </p>
        <div class="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <UiButton to="/auth/register">Запустить пилот за 500 ₽</UiButton>
          <UiButton to="/pricing" variant="secondary-on-dark">Сравнить тарифы</UiButton>
        </div>
      </div>
    </section>
  </div>
</template>
