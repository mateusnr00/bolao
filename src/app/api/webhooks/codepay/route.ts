import { NextResponse } from 'next/server'

import { parseCodePayWebhook } from '@/lib/codepay'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

// Webhook do PIX IN da CodePay — URL ESTÁVEL, sem token no path:
//   https://<APP_URL>/api/webhooks/codepay
// É essa a URL que vai no campo "Url de notificação" do painel codepay.one.
//
// Formato documentado do corpo (POST JSON):
//   { movId, paymentId, value, externalId, status: "CONFIRMED",
//     securityParaphrase, ... }
// - paymentId  = id da CodePay (guardamos em payments.external_id)
// - externalId = NOSSA referência (= payments.id) — o casamento mais confiável
// - securityParaphrase = a "Frase de segurança" (validada se CODEPAY_WEBHOOK_PHRASE)
//
// LOGA TUDO antes de qualquer rejeição, pra termos evidência se a CodePay chamar.
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Teste de saúde: abra a URL no navegador → { ok: true } = pronta pra receber.
export async function GET() {
  return NextResponse.json({ ok: true, message: 'webhook codepay ativo' })
}

export async function POST(req: Request) {
  const raw = await req.text()
  let body: unknown = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    // mantém body = null; ainda loga o raw pra inspeção
  }

  const supabase = createAdminClient()
  const wh = parseCodePayWebhook(body)
  // referência usada pra logar/identificar (prioriza o nosso externalId)
  const logRef = wh.externalId ?? wh.paymentId ?? wh.movId ?? ''

  // SEMPRE loga primeiro (auditoria + a prova de que a CodePay chamou)
  const { data: event } = await supabase
    .from('payment_webhook_events')
    .insert({
      provider: 'CODEPAY',
      external_id: logRef,
      payload: (body ?? { _raw: raw.slice(0, 4000) }) as Json,
    })
    .select('id')
    .single()

  const finish = async (error?: string) => {
    if (event) {
      await supabase
        .from('payment_webhook_events')
        .update({ processed_at: new Date().toISOString(), processing_error: error ?? null })
        .eq('id', event.id)
    }
  }

  // valida a frase de segurança (se configurada) — vem em securityParaphrase
  const phrase = process.env.CODEPAY_WEBHOOK_PHRASE
  if (phrase && wh.securityParaphrase !== phrase && !raw.includes(phrase)) {
    await finish('frase de segurança não confere')
    return NextResponse.json({ ok: true, ignored: 'bad phrase' })
  }

  // casa o pagamento na ordem mais confiável:
  //   1) nosso externalId  → payments.id   (é a nossa própria referência)
  //   2) paymentId         → payments.external_id
  //   3) movId             → payments.mov_id
  const byId = async (col: 'id' | 'external_id' | 'mov_id', val: string | null) => {
    if (!val) return null
    if (col === 'id' && !UUID_RE.test(val)) return null
    const { data } = await supabase
      .from('payments')
      .select('id, status')
      .eq(col, val)
      .maybeSingle()
    return data
  }

  const payment =
    (await byId('id', wh.externalId)) ??
    (await byId('external_id', wh.paymentId)) ??
    (await byId('mov_id', wh.movId))

  if (!payment) {
    await finish('payment não encontrada')
    return NextResponse.json({ ok: true, ignored: 'payment not found' })
  }

  // idempotente: só transiciona de PENDING
  if (wh.status === 'APPROVED' && payment.status !== 'APPROVED') {
    await supabase
      .from('payments')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
  } else if (wh.status === 'REJECTED' && payment.status === 'PENDING') {
    await supabase
      .from('payments')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
  }

  await finish()
  return NextResponse.json({ ok: true, status: wh.status })
}
