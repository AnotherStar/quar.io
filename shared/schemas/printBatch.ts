import { z } from 'zod'

export const printBatchCreateSchema = z.object({
  templateCode: z.string().min(1).max(100),
  count: z.number().int().min(1).max(5000)
})
export type PrintBatchCreateInput = z.infer<typeof printBatchCreateSchema>

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const printTemplateDesignCreateSchema = z.object({
  name: z.string().min(1).max(100),
  backgroundUrl: z.string().min(1).max(1000),
  backgroundMimeType: z.string().min(1).max(200).optional().nullable(),
  backgroundWidthPx: z.number().int().min(1).max(20000),
  backgroundHeightPx: z.number().int().min(1).max(20000),
  widthMm: z.number().min(10).max(500),
  heightMm: z.number().min(10).max(500),
  backgroundXmm: z.number().min(-1000).max(1000),
  backgroundYmm: z.number().min(-1000).max(1000),
  backgroundWidthMm: z.number().min(1).max(1000),
  backgroundHeightMm: z.number().min(1).max(1000),
  qrXmm: z.number().min(0).max(500),
  qrYmm: z.number().min(0).max(500),
  qrSizeMm: z.number().min(8).max(300),
  qrDarkColor: hexColorSchema,
  qrLightColor: hexColorSchema,
  qrLightTransparent: z.boolean().optional().default(false)
}).refine((v) => v.qrXmm + v.qrSizeMm <= v.widthMm, {
  message: 'QR выходит за правый край',
  path: ['qrXmm']
}).refine((v) => v.qrYmm + v.qrSizeMm <= v.heightMm, {
  message: 'QR выходит за нижний край',
  path: ['qrYmm']
})
export type PrintTemplateDesignCreateInput = z.infer<typeof printTemplateDesignCreateSchema>

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
  // 'system' — встроенный в код, 'custom' — кастомный шаблон своего тенанта,
  // 'public' — кастомный шаблон, помеченный админом как публичный, виден
  // всем тенантам в каталоге.
  kind?: 'system' | 'custom' | 'public'
  // True, если шаблон сейчас публичный. Заполняется только для своих
  // шаблонов (kind='custom'); у чужих публичных это и так подразумевается
  // самим kind='public', а для system всегда undefined.
  isPublic?: boolean
}
