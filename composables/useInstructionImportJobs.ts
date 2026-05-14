// Глобальный стор для джобов массового импорта инструкций.
// Источник правды — /api/instructions/import/jobs. Поллим адаптивно: пока
// есть активные задачи (QUEUED / PAUSED / PROCESSING) — раз в 1.5 c, иначе
// фон 30 c. Композабл предоставляет:
//  - state.jobs            — текущий список задач
//  - hasPending            — есть ли что-то незавершённое
//  - startPolling/stop     — управление поллером (вызывается из dashboard layout)
//  - refresh()             — форсированный опрос (страница импорта дёргает это
//                            сразу после аплоада, чтобы не ждать тика)
//
// Тост-нотификации: при первом опросе мы запоминаем текущие финальные id и
// тосты не показываем. На любом следующем опросе, как только встречается job
// с финальным статусом, которой не было в seen-set, — пушим тост (success
// или error) и добавляем id в seen-set. Это даёт ожидаемое поведение
// «уведомлять о новом», не спамя при возврате на страницу.

export interface ImportJob {
  id: string
  status: 'QUEUED' | 'PAUSED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
  fileName: string
  fileSize: number
  fileMimeType: string
  fileHash: string
  stage: string | null
  progressPercent: number | null
  errorMessage: string | null
  instructionId: string | null
  instruction: { id: string; title: string; slug: string } | null
  acknowledgedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

const ACTIVE = new Set<ImportJob['status']>(['QUEUED', 'PAUSED', 'PROCESSING'])
const FINAL = new Set<ImportJob['status']>(['SUCCEEDED', 'FAILED'])

export function useInstructionImportJobs() {
  const api = useApi()
  const { user } = useAuthState()
  const toast = useToast()

  const jobs = useState<ImportJob[]>('mo:importJobs', () => [])
  // ids финальных джобов, для которых тост уже был показан в этой сессии.
  // Инициализируется при первом успешном refresh — обработанные ранее задачи
  // не должны «всплывать» при заходе на страницу.
  const seenFinal = useState<Set<string>>('mo:importJobsSeen', () => new Set())
  const seeded = useState<boolean>('mo:importJobsSeeded', () => false)
  const pollHandle = useState<{
    timer: ReturnType<typeof setTimeout> | null
    stopped: boolean
  }>('mo:importJobsPoll', () => ({ timer: null, stopped: true }))

  const hasPending = computed(() => jobs.value.some((j) => ACTIVE.has(j.status)))

  function notifyTransitions(next: ImportJob[]) {
    if (!seeded.value) {
      // Первый снимок — фиксируем уже-финальные id без тостов.
      for (const j of next) if (FINAL.has(j.status)) seenFinal.value.add(j.id)
      seeded.value = true
      return
    }
    for (const j of next) {
      if (!FINAL.has(j.status)) continue
      if (seenFinal.value.has(j.id)) continue
      seenFinal.value.add(j.id)
      if (j.status === 'SUCCEEDED') {
        const title = j.instruction?.title || j.fileName
        toast.success(`Инструкция «${title}» готова`, {
          action: j.instruction
            ? { label: 'Открыть', to: `/dashboard/instructions/${j.instruction.id}/edit` }
            : undefined
        })
      } else if (j.status === 'FAILED') {
        toast.error(`Импорт «${j.fileName}» не удался`, {
          title: j.errorMessage ?? undefined
        })
      }
    }
  }

  async function refresh() {
    if (import.meta.server) return
    if (!user.value || pollHandle.value.stopped) return
    try {
      const { jobs: list } = await api<{ jobs: ImportJob[] }>('/api/instructions/import/jobs')
      notifyTransitions(list)
      jobs.value = list
    } catch {
      // 401 при логауте / временный network — оставляем стейт, следующий тик
      // попробует ещё раз.
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
    const delay = hasPending.value ? 1_500 : 30_000
    pollHandle.value.timer = setTimeout(() => refresh(), delay)
  }

  function startPolling() {
    if (import.meta.server || !user.value) return
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
    jobs.value = []
    seenFinal.value = new Set()
    seeded.value = false
  }

  // Локально добавить job сразу после аплоада, не дожидаясь следующего тика.
  function registerOptimistic(job: ImportJob) {
    if (!jobs.value.find((j) => j.id === job.id)) {
      jobs.value = [job, ...jobs.value]
    }
    // Сразу же запросим актуальный список и поднимем темп опроса.
    setTimeout(() => refresh(), 200)
  }

  return {
    jobs,
    hasPending,
    refresh,
    startPolling,
    stopPolling,
    registerOptimistic
  }
}
