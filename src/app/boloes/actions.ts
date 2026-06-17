'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getPoolByInviteCode } from '@/lib/queries/pools'
import { createClient } from '@/lib/supabase/server'
import { createPoolSchema, joinPoolSchema } from '@/lib/validations'

export type PoolActionResult = { error: string }

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 7)
  return base ? `${base}-${suffix}` : suffix
}

export async function createPool(
  _prev: PoolActionResult | null,
  formData: FormData,
): Promise<PoolActionResult> {
  const parsed = createPoolSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/boloes/criar')

  // A trigger trg_pool_defaults cria scoring_rules e adiciona o owner como
  // membro automaticamente — aqui só inserimos o bolão.
  const { error } = await supabase.from('pools').insert({
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    owner_id: user.id,
  })
  if (error) {
    return { error: `Não foi possível criar o bolão: ${error.message}` }
  }

  revalidatePath('/boloes')
  redirect('/boloes')
}

export async function joinPool(
  _prev: PoolActionResult | null,
  formData: FormData,
): Promise<PoolActionResult> {
  const parsed = joinPoolSchema.safeParse({
    inviteCode: formData.get('inviteCode'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Código inválido' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/boloes/entrar')

  const pool = await getPoolByInviteCode(parsed.data.inviteCode)
  if (!pool) {
    return { error: 'Nenhum bolão com esse código' }
  }

  // RLS permite o próprio usuário inserir sua membership (auth.uid() = user_id).
  // Conflito de PK = já é membro, tratamos como sucesso.
  const { error } = await supabase
    .from('pool_members')
    .insert({ pool_id: pool.id, user_id: user.id })
  if (error && error.code !== '23505') {
    return { error: `Não foi possível entrar: ${error.message}` }
  }

  revalidatePath('/boloes')
  redirect('/boloes')
}
