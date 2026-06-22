import 'server-only'

import { createClient } from '@/lib/supabase/server'

export interface MySignature {
  fullName: string
  signature: string
  signedAt: string
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
