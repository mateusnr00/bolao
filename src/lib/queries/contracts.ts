import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface MySignature {
  fullName: string
  signature: string
  signedAt: string
}

export interface MemberSign {
  userId: string
  name: string
  username: string
  avatarUrl: string | null
  signed: boolean
  isMe: boolean
}

export interface PoolSignStatus {
  signed: MemberSign[]
  unsigned: MemberSign[]
}

interface RawMember {
  user_id: string
  profiles:
    | { display_name: string | null; username: string; avatar_url: string | null }
    | { display_name: string | null; username: string; avatar_url: string | null }[]
    | null
}

// Quem assinou x quem não assinou o contrato, no bolão do usuário. Todo membro
// vê. Usa service role pra montar a lista de todos (a RLS de contract_signatures
// é por linha/bolão), mas só expõe nome + status assinou/não.
export async function getPoolSignStatus(): Promise<PoolSignStatus | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!member?.pool_id) return null
  const poolId = member.pool_id

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('pool_members')
    .select(
      'user_id, profiles:profiles!pool_members_user_id_fkey ( display_name, username, avatar_url )',
    )
    .eq('pool_id', poolId)

  const memberIds = ((members as unknown as RawMember[]) ?? []).map((m) => m.user_id)
  const { data: sigs } = await admin
    .from('contract_signatures')
    .select('user_id')
    .in('user_id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000'])

  const signedSet = new Set((sigs ?? []).map((s) => s.user_id))

  const rows: MemberSign[] = ((members as unknown as RawMember[]) ?? []).map((m) => {
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      userId: m.user_id,
      name: prof?.display_name?.trim() || prof?.username || 'sem nome',
      username: prof?.username ?? '',
      avatarUrl: prof?.avatar_url ?? null,
      signed: signedSet.has(m.user_id),
      isMe: m.user_id === user.id,
    }
  })

  const byName = (a: MemberSign, b: MemberSign) => a.name.localeCompare(b.name, 'pt-BR')
  return {
    signed: rows.filter((r) => r.signed).sort(byName),
    unsigned: rows.filter((r) => !r.signed).sort(byName),
  }
}

/** Assinatura do contrato do usuário logado, se já tiver assinado. */
export async function getMySignature(): Promise<MySignature | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('contract_signatures')
    .select('full_name, signature, signed_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) return null
  return {
    fullName: data.full_name,
    signature: data.signature,
    signedAt: data.signed_at,
  }
}
