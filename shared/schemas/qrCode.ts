import { z } from 'zod'
import { productBarcodeSchema } from './instruction'

export const qrBatchCreateSchema = z.object({
  count: z.number().int().min(1).max(5000)
})
export type QrBatchCreateInput = z.infer<typeof qrBatchCreateSchema>

export const qrExportQuerySchema = z.object({
  ids: z.string().optional(),
  sizeMm: z.coerce.number().min(20).max(100).default(40)
})
export type QrExportQueryInput = z.infer<typeof qrExportQuerySchema>

export const qrBindSchema = z.object({
  barcode: productBarcodeSchema
})
export type QrBindInput = z.infer<typeof qrBindSchema>
