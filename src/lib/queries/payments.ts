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

// Quem pagou (APPROVED) x quem não pagou, num bolão. Só o DONO enxerga isso —
// é a tela pra cobrar a galera. Usa service role porque a RLS de payments só
// libera a linha do próprio usuário; o dono precisa ver de todo mundo.
export async function getPoolPayments(poolId: string): Promise<PoolPayments | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pool } = await supabase
    .from('pools')
    .select('owner_id')
    .eq('id', poolId)
    .maybeSingle()
  const isOwner = pool?.owner_id === user.id
  if (!isOwner) return { isOwner: false, paid: [], unpaid: [] }

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
    isOwner: true,
    paid: rows.filter((r) => r.paid).sort(byName),
    unpaid: rows.filter((r) => !r.paid).sort(byName),
  }
}
