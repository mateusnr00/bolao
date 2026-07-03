import 'server-only'

import { isHiddenMember } from '@/lib/hidden-members'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface PoolSummary {
  id: string
  name: string
  slug: string
  inviteCode: string
  isOwner: boolean
  memberCount: number
}

interface RawPoolMember {
  user_id: string
  profiles: { username: string } | { username: string }[] | null
}

interface RawPool {
  id: string
  name: string
  slug: string
  invite_code: string
  owner_id: string
  members: RawPoolMember[] | null
}

// Bolões do usuário logado. A RLS de SELECT já restringe a pools onde ele é
// owner ou membro, então não precisa filtrar aqui.
export async function getUserPools(): Promise<PoolSummary[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('pools')
    .select(
      'id, name, slug, invite_code, owner_id, members:pool_members(user_id, profiles!pool_members_user_id_fkey(username))',
    )
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Erro ao buscar bolões: ${error.message}`)

  // conta só quem não está oculto — mantém a contagem batendo com as listas
  const visibleMembers = (members: RawPoolMember[] | null) =>
    (members ?? []).filter((m) => {
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return !isHiddenMember({ userId: m.user_id, username: prof?.username })
    }).length

  return (data as unknown as RawPool[]).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    inviteCode: p.invite_code,
    isOwner: p.owner_id === user.id,
    memberCount: visibleMembers(p.members),
  }))
}

export interface PoolByCode {
  id: string
  name: string
  ownerId: string
}

// Resolve um bolão pelo invite_code usando service role. Necessário porque a
// RLS de SELECT de pools só libera owner/membro — quem vai ENTRAR ainda não é
// nenhum dos dois, então não conseguiria achar o bolão pra entrar.
export async function getPoolByInviteCode(
  code: string,
): Promise<PoolByCode | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pools')
    .select('id, name, owner_id')
    .eq('invite_code', code)
    .maybeSingle()
  if (error) throw new Error(`Erro ao buscar bolão: ${error.message}`)
  if (!data) return null
  return { id: data.id, name: data.name, ownerId: data.owner_id }
}
