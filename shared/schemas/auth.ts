import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(100).optional(),
  tenantName: z.string().min(1).max(100),
  tenantSlug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'Только латиница, цифры, дефис')
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
export type LoginInput = z.infer<typeof loginSchema>
