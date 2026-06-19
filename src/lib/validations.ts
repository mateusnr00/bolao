import { z } from 'zod'

export const emailSchema = z.string().email('Email inválido')

export const usernameSchema = z
  .string()
  .min(3, 'Mínimo 3 caracteres')
  .max(20, 'Máximo 20 caracteres')
  .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e _')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  username: usernameSchema,
  displayName: z.string().trim().min(1, 'Informe um nome').max(40).optional(),
})

export const magicLinkSchema = z.object({
  email: emailSchema,
})

export const newPasswordSchema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string().min(6, 'Mínimo 6 caracteres'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As senhas não conferem',
    path: ['confirm'],
  })

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Informe um nome').max(40, 'Máximo 40 caracteres'),
  avatarUrl: z
    .string()
    .trim()
    .url('Informe uma URL válida')
    .or(z.literal(''))
    .optional(),
})

export const createPoolSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres'),
})

export const inviteCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .length(8, 'O código tem 8 caracteres')
  .regex(/^[a-z0-9]+$/, 'Código inválido')

export const joinPoolSchema = z.object({
  inviteCode: inviteCodeSchema,
})

const scoreSchema = z.coerce
  .number()
  .int('Placar inválido')
  .min(0, 'Placar inválido')
  .max(30, 'Placar inválido')

export const predictionSchema = z.object({
  matchId: z.string().uuid('Jogo inválido'),
  homeScore: scoreSchema,
  awayScore: scoreSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type MagicLinkInput = z.infer<typeof magicLinkSchema>
export type NewPasswordInput = z.infer<typeof newPasswordSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type CreatePoolInput = z.infer<typeof createPoolSchema>
export type JoinPoolInput = z.infer<typeof joinPoolSchema>
export type PredictionInput = z.infer<typeof predictionSchema>
