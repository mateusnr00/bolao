'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type AdminPayResult = { ok: true } | { error: string }

const MANUAL_AMOUNT = 20.44

// Confirma que quem chamou é o DONO do bolão e que o alvo é membro dele.
type OwnerCtx =
  | { ok: false; error: string }
  | { ok: true; poolId: string; admin: ReturnType<typeof createAdminClient> }

async function assertOwnerOfMember(targetUserId: string): Promise<OwnerCtx> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Você precisa estar logado' }

  // pool do dono (onde ele é owner) — pega o primeiro
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

/** Marca um membro como pago na mão (confirmação manual do dono). */
export async function markMemberPaid(targetUserId: string): Promise<AdminPayResult> {
  const ctx = await assertOwnerOfMember(targetUserId)
  if (!ctx.ok) return { error: ctx.error }

  // já tem confirmação manual? não duplica
  const { data: existing } = await ctx.admin
    .from('payments')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('pool_id', ctx.poolId)
    .eq('status', 'APPROVED')
    .eq('mov_id', 'MANUAL')
    .maybeSingle()
  if (existing) return { ok: true }

  const { error } = await ctx.admin.from('payments').insert({
    user_id: targetUserId,
    pool_id: ctx.poolId,
    amount: MANUAL_AMOUNT,
    status: 'APPROVED',
    mov_id: 'MANUAL',
  })
  if (error) return { error: 'Não deu pra marcar como pago' }

  revalidatePath('/pagamentos')
  return { ok: true }
}

/** Desfaz uma confirmação manual (não mexe em pagamento real da CodePay). */
export async function unmarkMemberPaid(targetUserId: string): Promise<AdminPayResult> {
  const ctx = await assertOwnerOfMember(targetUserId)
  if (!ctx.ok) return { error: ctx.error }

  const { error } = await ctx.admin
    .from('payments')
    .delete()
    .eq('user_id', targetUserId)
    .eq('pool_id', ctx.poolId)
    .eq('status', 'APPROVED')
    .eq('mov_id', 'MANUAL')
  if (error) return { error: 'Não deu pra desfazer' }

  revalidatePath('/pagamentos')
  return { ok: true }
}
