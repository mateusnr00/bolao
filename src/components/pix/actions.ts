'use server'

import { createPixCharge, getCredentials } from '@/lib/codepay'
import { createClient } from '@/lib/supabase/server'

export type PixResult = { error: string } | { ok: true; pixCode: string }

/** Gera uma cobrança PIX (CodePay) pro usuário logado, no valor informado. */
export async function createPix(amountReais: number): Promise<PixResult> {
  if (!Number.isFinite(amountReais) || amountReais <= 0) {
    return { error: 'Informe um valor válido' }
  }
  const creds = getCredentials()
  if (!creds) return { error: 'Pagamento não configurado (credenciais ausentes)' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado' }

  // pool do usuário (opcional, só pra registrar)
  const { data: member } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const amount = Math.round(amountReais * 100) / 100

  // registra o pagamento PENDING (o id vira nossa referência externa)
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({ user_id: user.id, pool_id: member?.pool_id ?? null, amount, status: 'PENDING' })
    .select('id')
    .single()
  if (error || !payment) return { error: 'Não deu pra iniciar o pagamento' }

  try {
    const charge = await createPixCharge(creds, { amount, externalRef: payment.id })
    await supabase
      .from('payments')
      .update({
        external_id: charge.identifier,
        pix_code: charge.pix_code,
        mov_id: charge.movId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
    return { ok: true, pixCode: charge.pix_code }
  } catch (e) {
    await supabase
      .from('payments')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
    return { error: e instanceof Error ? e.message : 'Erro ao gerar o PIX' }
  }
}
