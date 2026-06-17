import 'server-only'

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

interface RawPool {
  id: string
  name: string
  slug: string
  invite_code: string
  owner_id: string
  members: { count: number }[] | null
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
    .select('id, name, slug, invite_code, owner_id, members:pool_members(count)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Erro ao buscar bolões: ${error.message}`)

  return (data as unknown as RawPool[]).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    inviteCode: p.invite_code,
    isOwner: p.owner_id === user.id,
    memberCount: p.members?.[0]?.count ?? 0,
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
