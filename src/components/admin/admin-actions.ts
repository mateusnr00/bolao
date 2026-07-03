'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type AdminModResult = { ok: true } | { error: string }

// Confirma que quem chamou é o DONO do bolão e que o alvo é membro dele — e
// nunca deixa o dono moderar a si mesmo.
type OwnerCtx =
  | { ok: false; error: string }
  | { ok: true; poolId: string; admin: ReturnType<typeof createAdminClient> }

async function assertOwnerOfMember(targetUserId: string): Promise<OwnerCtx> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Você precisa estar logado' }
  if (targetUserId === user.id) {
    return { ok: false, error: 'Você não pode moderar a si mesmo' }
  }

  const { data: pool } = await supabase
    .from('pools')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!pool) return { ok: false, error: 'Só o dono do bolão pode fazer isso' }

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('pool_members')
    .select('user_id')
    .eq('pool_id', pool.id)
    .eq('user_id', targetUserId)
    .maybeSingle()
  if (!member) return { ok: false, error: 'Esse membro não está no seu bolão' }

  return { ok: true, poolId: pool.id, admin }
}

async function setFlag(
  targetUserId: string,
  patch: { blocked?: boolean; hidden?: boolean },
): Promise<AdminModResult> {
  const ctx = await assertOwnerOfMember(targetUserId)
  if (!ctx.ok) return { error: ctx.error }

  const { error } = await ctx.admin
    .from('pool_members')
    .update(patch)
    .eq('pool_id', ctx.poolId)
    .eq('user_id', targetUserId)
  if (error) return { error: 'Não deu pra salvar a alteração' }

  // as listas afetadas revalidam pra refletir na hora
  revalidatePath('/admin')
  revalidatePath('/ranking')
  revalidatePath('/pagamentos')
  revalidatePath('/contrato')
  revalidatePath('/vergonha')
  return { ok: true }
}

/** Bloqueia (ou libera) os palpites de um membro no bolão. */
export async function setMemberBlocked(
  targetUserId: string,
  blocked: boolean,
): Promise<AdminModResult> {
  return setFlag(targetUserId, { blocked })
}

/** Oculta (ou revela) um membro de todas as listas da galera. */
export async function setMemberHidden(
  targetUserId: string,
  hidden: boolean,
): Promise<AdminModResult> {
  return setFlag(targetUserId, { hidden })
}
