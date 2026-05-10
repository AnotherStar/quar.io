import { z } from 'zod'
import { productBarcodeSchema } from './instruction'

export const qrBatchCreateSchema = z.object({
  count: z.number().int().min(1).max(5000)
})
export type QrBatchCreateInput = z.infer<typeof qrBatchCreateSchema>

export const qrExportQuerySchema = z.object({
  ids: z.string().optional(),
  sizeMm: z.coerce.number().min(20).max(100).default(40),
  markPrinted: z.coerce.boolean().optional(),
  designLabel: z.string().trim().min(1).max(80).optional()
})
export type QrExportQueryInput = z.infer<typeof qrExportQuerySchema>

export const qrBindSchema = z.object({
  barcode: productBarcodeSchema,
  // Optional explicit instruction id. When provided, the linker has already
  // resolved which instruction the barcode belongs to (e.g. user picked it
  // from a modal). The server then writes the barcode onto that instruction
  // if it doesn't have one yet, and binds the QR.
  instructionId: z.string().optional()
})
export type QrBindInput = z.infer<typeof qrBindSchema>

// Edit / patch a single QR from dashboard (relink, unbind, edit notes)
export const qrUpdateSchema = z.object({
  instructionId: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional()
})
export type QrUpdateInput = z.infer<typeof qrUpdateSchema>

// Mark a batch of QR codes as "printed in design X". Stored as a run inside printRuns.
export const qrPrintRunSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(5000),
  designLabel: z.string().trim().min(1).max(80)
})
export type QrPrintRunInput = z.infer<typeof qrPrintRunSchema>

// One entry in ActivationQrCode.printRuns JSON array.
export interface QrPrintRunEntry {
  batchId: string
  designLabel: string
  printedAt: string
  count: number
}
