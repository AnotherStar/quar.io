// На старте Nitro восстанавливаем зависшие джобы массового импорта.
// Если предыдущий процесс упал в момент обработки, запись осталась в статусе
// PROCESSING — а реальной работы за ней не стоит. Переводим такие обратно в
// QUEUED и сразу даём воркеру шанс подхватить очередь.
import {
  recoverStaleInstructionImportJobs,
  tickInstructionImportRunner
} from '~~/server/utils/instructionImportRunner'

export default defineNitroPlugin(async () => {
  try {
    await recoverStaleInstructionImportJobs()
  } catch (e) {
    console.error('[instruction-import] recovery failed on boot', e)
  }
  tickInstructionImportRunner()
})
