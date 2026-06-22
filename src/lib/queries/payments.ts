import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface MemberPayment {
  userId: string
  name: string
  username: string
  avatarUrl: string | null
  paid: boolean
  isMe: boolean
}

export interface PoolPayments {
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
  const { data: membership } = await supabase
    .from('pool_members')
    .select('user_id')
    .eq('pool_id', poolId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return { paid: [], unpaid: [] }

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
      .select('user_id')
      .eq('status', 'APPROVED')
      .or(`pool_id.eq.${poolId},pool_id.is.null`),
  ])

  const paidSet = new Set((pays ?? []).map((p) => p.user_id).filter(Boolean))

  const rows: MemberPayment[] = ((members as unknown as RawMember[]) ?? []).map((m) => {
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      userId: m.user_id,
      name: prof?.display_name?.trim() || prof?.username || 'sem nome',
      username: prof?.username ?? '',
      avatarUrl: prof?.avatar_url ?? null,
      paid: paidSet.has(m.user_id),
      isMe: m.user_id === user.id,
    }
  })

  const byName = (a: MemberPayment, b: MemberPayment) => a.name.localeCompare(b.name, 'pt-BR')
  return {
    paid: rows.filter((r) => r.paid).sort(byName),
    unpaid: rows.filter((r) => !r.paid).sort(byName),
  }
}
