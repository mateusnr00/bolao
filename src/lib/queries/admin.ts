import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface AdminMember {
  userId: string
  name: string
  username: string
  avatarUrl: string | null
  blocked: boolean // não consegue mais palpitar
  hidden: boolean // some das listas da galera
  isMe: boolean
  isOwner: boolean
}

export interface PoolAdmin {
  poolName: string
  members: AdminMember[]
}

interface RawMember {
  user_id: string
  blocked: boolean
  hidden: boolean
  profiles:
    | { display_name: string | null; username: string; avatar_url: string | null }
    | { display_name: string | null; username: string; avatar_url: string | null }[]
    | null
}

// Painel do dono: lista TODOS os membros do bolão que o usuário logado é dono
// (inclusive os já ocultos, pra ele conseguir reverter). Retorna null quando o
// usuário não é dono de nenhum bolão. Usa service role pra enxergar todo mundo.
export async function getPoolAdmin(): Promise<PoolAdmin | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, owner_id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!pool) return null

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('pool_members')
    .select(
      'user_id, blocked, hidden, profiles:profiles!pool_members_user_id_fkey ( display_name, username, avatar_url )',
    )
    .eq('pool_id', pool.id)

  const rows: AdminMember[] = ((members as unknown as RawMember[]) ?? []).map((m) => {
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      userId: m.user_id,
      name: prof?.display_name?.trim() || prof?.username || 'sem nome',
      username: prof?.username ?? '',
      avatarUrl: prof?.avatar_url ?? null,
      blocked: m.blocked,
      hidden: m.hidden,
      isMe: m.user_id === user.id,
      isOwner: m.user_id === pool.owner_id,
    }
  })

  // dono primeiro, depois em ordem alfabética
  rows.sort(
    (a, b) =>
      Number(b.isOwner) - Number(a.isOwner) ||
      a.name.localeCompare(b.name, 'pt-BR'),
  )

  return { poolName: pool.name, members: rows }
}
