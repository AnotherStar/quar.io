// Глобальный стор для асинхронных AI image-edit джобов.
// Источник правды — /api/ai/image-edit/jobs. Поллим его, пока есть активные
// (PENDING/PROCESSING) задачи или непросмотренные результаты. Все компоненты
// (ImageMagicModal в редакторе, глобальная модалка «было → стало», тосты)
// читают одно и то же состояние через useState.
//
// Применение результата к редактору сделано через window-события: модалка
// эмитит `image-edit-apply`, любой смонтированный <ResizableImageView> со
// совпадающим src ловит его и обновляет узел. Если в текущей странице нет
// подходящего инстанса (юзер был на другой странице, когда генерация
// завершилась), мы знаем instructionId и можем увести его в редактор с
// параметром ?applyImageEdit=<jobId>.

export interface ImageEditJob {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
  sourceUrl: string
  prompt: string
  resultUrl: string | null
  errorMessage: string | null
  instructionId: string | null
  createdAt: string
  completedAt: string | null
}

// Полностью клиентское состояние — на сервере воркер сам пишет в БД, SSR
// этого стора не нужен. useState достаточно для расшаривания между
// компонентами в рамках одной сессии.
export function useImageEditJobs() {
  const api = useApi()
  const { user } = useAuthState()
  const jobs = useState<ImageEditJob[]>('mo:imageEditJobs', () => [])
  const activeResultJobId = useState<string | null>('mo:imageEditActiveResult', () => null)
  // stopped: после stopPolling() in-flight refresh не должен заново арм-ить таймер.
  // Иначе после логаута поллер «оживает» через schedule() в конце refresh().
  const pollHandle = useState<{ timer: ReturnType<typeof setTimeout> | null; stopped: boolean }>(
    'mo:imageEditPoll',
    () => ({ timer: null, stopped: true })
  )

  // Активные = ещё не закончились. Результаты = закончились, но юзер их не
  // подтвердил. Если ничего из этого нет — поллинг можно остановить.
  const pendingJobs = computed(() =>
    jobs.value.filter((j) => j.status === 'PENDING' || j.status === 'PROCESSING')
  )
  const finishedUnacknowledged = computed(() =>
    jobs.value.filter((j) => j.status === 'SUCCEEDED' || j.status === 'FAILED')
  )
  const hasPending = computed(() => pendingJobs.value.length > 0)

  // Первый по очереди результат — его рендерит ImageEditJobResultModal.
  // Если есть activeResultJobId, держимся за него (даже когда подъехали новые),
  // чтобы модалка не «прыгала» под пальцем.
  const currentResult = computed<ImageEditJob | null>(() => {
    if (activeResultJobId.value) {
      const pinned = finishedUnacknowledged.value.find((j) => j.id === activeResultJobId.value)
      if (pinned) return pinned
    }
    return finishedUnacknowledged.value[0] ?? null
  })

  async function refresh() {
    if (import.meta.server) return
    // Если юзер не залогинен — не дёргаем приватный endpoint вообще, иначе
    // получим 401 в консоли сразу после logout. stopPolling выставляет
    // stopped=true, но refresh может быть уже in-flight в момент логаута.
    if (!user.value || pollHandle.value.stopped) return
    try {
      const { jobs: list } = await api<{ jobs: ImageEditJob[] }>('/api/ai/image-edit/jobs')
      jobs.value = list
      if (activeResultJobId.value && !list.find((j) => j.id === activeResultJobId.value)) {
        activeResultJobId.value = null
      }
      if (!activeResultJobId.value) {
        const first = list.find((j) => j.status === 'SUCCEEDED' || j.status === 'FAILED')
        if (first) activeResultJobId.value = first.id
      }
    } catch {
      // Молчим: 401/network — стор просто остаётся прежним, следующий тик
      // попробует ещё раз. Шуметь логом нет смысла, дашборд периодически
      // делает анонимные запросы при логауте.
    }
    schedule()
  }

  function schedule() {
    if (import.meta.server) return
    if (pollHandle.value.timer) {
      clearTimeout(pollHandle.value.timer)
      pollHandle.value.timer = null
    }
    if (pollHandle.value.stopped || !user.value) return
    // Если что-то в работе — поллим часто, чтобы момент завершения был
    // заметен. Иначе достаточно ленивого фонового опроса.
    const delay = hasPending.value ? 4_000 : 30_000
    pollHandle.value.timer = setTimeout(() => {
      refresh()
    }, delay)
  }

  // Регистрируется единожды в layout — отсюда запускается фоновый поллинг.
  function startPolling() {
    if (import.meta.server) return
    if (!user.value) return
    pollHandle.value.stopped = false
    if (pollHandle.value.timer) return
    refresh()
  }

  function stopPolling() {
    pollHandle.value.stopped = true
    if (pollHandle.value.timer) {
      clearTimeout(pollHandle.value.timer)
      pollHandle.value.timer = null
    }
    // Сбрасываем локальный стор — после логаута стейт прошлой сессии не
    // должен моргнуть в новом аккаунте/в гостевом режиме.
    jobs.value = []
    activeResultJobId.value = null
  }

  // Локально регистрирует новый джоб, чтобы UI обновился, не дожидаясь
  // следующего тика поллера. Сразу после возврата мы поллим чаще.
  function registerOptimistic(job: ImageEditJob) {
    if (!jobs.value.find((j) => j.id === job.id)) {
      jobs.value = [job, ...jobs.value]
    }
    schedule()
    // Дополнительный быстрый refresh — пользователь только что кликнул
    // «Сгенерировать», логично сразу подтянуть актуальный статус из БД.
    setTimeout(refresh, 1_000)
  }

  // Запрос на применение результата к открытому редактору. Сначала шлём
  // событие, любой подходящий <ResizableImageView> заменит src сам. Если
  // никто не откликнулся (юзер ушёл на другую страницу), уводим его обратно
  // в редактор с параметром, который этот же applier распарсит на mount.
  async function requestApply(job: ImageEditJob) {
    if (!job.resultUrl) return
    if (import.meta.server) return

    let applied = false
    const onApplied = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.jobId === job.id) applied = true
    }
    window.addEventListener('image-edit-applied', onApplied as EventListener)

    window.dispatchEvent(
      new CustomEvent('image-edit-apply', {
        detail: { jobId: job.id, sourceUrl: job.sourceUrl, resultUrl: job.resultUrl }
      })
    )

    // Ждём короткий тик — TipTap-узел обновляет атрибуты синхронно, но
    // флаг прилетит через event-цикл. 250 мс с запасом.
    await new Promise((r) => setTimeout(r, 250))
    window.removeEventListener('image-edit-applied', onApplied as EventListener)

    if (applied) {
      await acknowledge(job.id)
      return
    }

    // Не нашлось подходящего инстанса — пробуем дойти ножками. Если
    // instructionId есть, переходим на редактор и кладём jobId в query;
    // applier в редакторе подберёт и применит. Ack произойдёт после применения.
    if (job.instructionId) {
      await navigateTo({
        path: `/dashboard/instructions/${job.instructionId}/edit`,
        query: { applyImageEdit: job.id }
      })
      return
    }

    // Совсем некуда применять — просто закрываем модалку и ack'аем.
    await acknowledge(job.id)
  }

  async function acknowledge(jobId: string) {
    try {
      await api(`/api/ai/image-edit/jobs/${jobId}/ack`, { method: 'POST' })
    } catch {
      // Сервер может вернуть 404, если джоб исчез (race с другой вкладкой) —
      // всё равно убираем из локального состояния.
    }
    jobs.value = jobs.value.filter((j) => j.id !== jobId)
    if (activeResultJobId.value === jobId) activeResultJobId.value = null
    schedule()
  }

  return {
    jobs,
    pendingJobs,
    hasPending,
    currentResult,
    refresh,
    startPolling,
    stopPolling,
    registerOptimistic,
    requestApply,
    acknowledge
  }
}
