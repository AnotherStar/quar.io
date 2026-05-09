import { z } from 'zod'

export const productBarcodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[0-9A-Za-z._ -]+$/, 'ШК может содержать цифры, латиницу, пробел, дефис, точку или подчёркивание')

export const instructionCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  language: z.string().min(2).max(10).default('en'),
  productGroupId: z.string().optional(),
  productBarcode: productBarcodeSchema.optional().nullable()
})
export type InstructionCreateInput = z.infer<typeof instructionCreateSchema>

export const instructionUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  language: z.string().min(2).max(10).optional(),
  draftContent: z.any().optional(),       // TipTap doc — loose
  productGroupId: z.string().optional().nullable(),
  productBarcode: productBarcodeSchema.optional().nullable()
})
export type InstructionUpdateInput = z.infer<typeof instructionUpdateSchema>

export const publishSchema = z.object({
  changelog: z.string().max(500).optional()
})
