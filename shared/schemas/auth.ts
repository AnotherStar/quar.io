import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(100).optional(),
  tenantName: z.string().min(1).max(100),
  tenantSlug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'Только латиница, цифры, дефис'),
  // Подтверждение пользовательского соглашения. literal(true) валится сервер-сайд,
  // если кто-то прислал false или пропустил поле.
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Нужно принять пользовательское соглашение' })
  })
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
export type LoginInput = z.infer<typeof loginSchema>

// "Дорегистрация" anonymous-trial аккаунта: задаём email/пароль (обязательно),
// опционально переименовываем tenant и его slug.
export const completeSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(100).optional(),
  tenantName: z.string().min(1).max(100).optional(),
  tenantSlug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'Только латиница, цифры, дефис').optional(),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Нужно принять пользовательское соглашение' })
  })
})
export type CompleteSignupInput = z.infer<typeof completeSignupSchema>
