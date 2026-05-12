import { z } from 'zod'

export const printBatchCreateSchema = z.object({
  templateCode: z.string().min(1).max(100),
  count: z.number().int().min(1).max(5000)
})
export type PrintBatchCreateInput = z.infer<typeof printBatchCreateSchema>

// Снапшот manifest'а шаблона, который сохраняется в PrintBatch.templateSnapshot.
// Если код шаблона в репо изменится (или шаблон будет удалён), мы всё равно
// сможем показать тираж в списке и понять, из чего он собирался.
export interface PrintTemplateSnapshot {
  code: string
  name: string
  version: number
  size: { widthMm: number; heightMm: number }
}

export interface PrintBatchListItem {
  id: string
  templateCode: string
  templateName: string                  // из snapshot, чтобы UI не лез в registry
  templateSizeMm: { width: number; height: number }
  count: number
  status: 'GENERATING' | 'READY' | 'FAILED'
  pdfSizeBytes: number | null
  error: string | null
  createdAt: string
  createdByEmail: string | null
  archivedAt: string | null
}

export interface PrintTemplateListItem {
  code: string
  name: string
  description: string
  size: { widthMm: number; heightMm: number }
  previewUrl: string | null
  version: number
}
