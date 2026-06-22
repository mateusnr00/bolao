'use server'

import { CONTRACT_TEXT, CONTRACT_VERSION } from '@/lib/contract'
import { createClient } from '@/lib/supabase/server'

export type SignResult = { ok: true } | { error: string }

// dataURL de PNG: "data:image/png;base64,...." — limita tamanho pra não abusar.
const MAX_SIGNATURE = 400_000

/** Assina o contrato do bolão pro usuário logado. Imutável: se já assinou,
 *  recusa (o unique no banco também barra). */
export async function signContract(input: {
  fullName: string
  signature: string
}): Promise<SignResult> {
  const fullName = input.fullName?.trim() ?? ''
  const signature = input.signature ?? ''

  if (fullName.length < 3) return { error: 'Escreva seu nome completo' }
  if (!signature.startsWith('data:image/')) return { error: 'Faça a assinatura' }
  if (signature.length > MAX_SIGNATURE) return { error: 'Assinatura grande demais' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado' }

  // já assinou? (imutável)
  const { data: existing } = await supabase
    .from('contract_signatures')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return { error: 'Você já assinou o contrato' }

  // pool do usuário (pra mostrar quem assinou no bolão)
  const { data: member } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('contract_signatures').insert({
    user_id: user.id,
    pool_id: member?.pool_id ?? null,
    full_name: fullName,
    signature,
    contract_text: CONTRACT_TEXT,
    contract_version: CONTRACT_VERSION,
  })
  if (error) {
    // 23505 = unique_violation (corrida: já assinou)
    if (error.code === '23505') return { error: 'Você já assinou o contrato' }
    return { error: 'Não deu pra salvar a assinatura' }
  }
  return { ok: true }
}
