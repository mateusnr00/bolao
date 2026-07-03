import 'server-only'

import { isHiddenUsername } from '@/lib/hidden-members'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface MemberPayment {
  userId: string
  name: string
  username: string
  avatarUrl: string | null
  paid: boolean
  manual: boolean // pago confirmado na mão pelo dono (dá pra desfazer)
  isMe: boolean
}

export interface PoolPayments {
  isOwner: boolean
  paid: MemberPayment[]
  unpaid: MemberPayment[]
}

interface RawMember {
  user_id: string
  profiles:
    | { display_name: string | null; username: string; avatar_url: string | null }
    | { display_name: string | null; username: string; avatar_url: string | null }[]
    | null
}

// Quem pagou (APPROVED) x quem não pagou, num bolão. Todo membro enxerga —
// a ideia é a galera se cobrar sozinha. Usa service role porque a RLS de
// payments só libera a linha do próprio usuário; aqui mostramos de todos
// (só o STATUS pago/não, nada de valor ou código PIX de ninguém).
export async function getPoolPayments(poolId: string): Promise<PoolPayments | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // confirma que o usuário é membro desse bolão antes de revelar a lista
  const { data: pool } = await supabase
    .from('pools')
    .select('owner_id')
    .eq('id', poolId)
    .maybeSingle()
  const { data: membership } = await supabase
    .from('pool_members')
    .select('user_id')
    .eq('pool_id', poolId)
    .eq('user_id', user.id)
    .maybeSingle()
  const isOwner = pool?.owner_id === user.id
  if (!membership) return { isOwner, paid: [], unpaid: [] }

  const admin = createAdminClient()

  const [{ data: members }, { data: pays }] = await Promise.all([
    admin
      .from('pool_members')
      .select(
        'user_id, profiles:profiles!pool_members_user_id_fkey ( display_name, username, avatar_url )',
      )
      .eq('pool_id', poolId),
    admin
      .from('payments')
      .select('user_id, external_id, mov_id')
      .eq('status', 'APPROVED')
      .or(`pool_id.eq.${poolId},pool_id.is.null`),
  ])

  // "pago de verdade" = tem cobrança da CodePay (external_id preenchido);
  // "manual" = só confirmação na mão do dono (mov_id = 'MANUAL').
  const realSet = new Set<string>()
  const manualSet = new Set<string>()
  for (const p of pays ?? []) {
    if (!p.user_id) continue
    if (p.external_id) realSet.add(p.user_id)
    else if (p.mov_id === 'MANUAL') manualSet.add(p.user_id)
  }

  const rows: MemberPayment[] = ((members as unknown as RawMember[]) ?? [])
    .filter((m) => {
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return !isHiddenUsername(prof?.username)
    })
    .map((m) => {
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    const real = realSet.has(m.user_id)
    const manual = !real && manualSet.has(m.user_id)
    return {
      userId: m.user_id,
      name: prof?.display_name?.trim() || prof?.username || 'sem nome',
      username: prof?.username ?? '',
      avatarUrl: prof?.avatar_url ?? null,
      paid: real || manual,
      manual,
      isMe: m.user_id === user.id,
    }
  })

  const byName = (a: MemberPayment, b: MemberPayment) => a.name.localeCompare(b.name, 'pt-BR')
  return {
    isOwner,
    paid: rows.filter((r) => r.paid).sort(byName),
    unpaid: rows.filter((r) => !r.paid).sort(byName),
  }
}
