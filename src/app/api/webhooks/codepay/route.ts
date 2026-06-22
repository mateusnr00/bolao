import { NextResponse } from 'next/server'

import { extractWebhookInfo } from '@/lib/codepay'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

// Webhook GLOBAL da CodePay — URL ESTÁVEL, sem token no path:
//   https://<APP_URL>/api/webhooks/codepay
// É essa a URL que vai no campo "Url de notificação" do painel codepay.one.
// Autenticação (opcional) pela "Frase de segurança": se CODEPAY_WEBHOOK_PHRASE
// estiver setada, a frase precisa aparecer no corpo OU em algum header da
// chamada; senão a gente ignora (mas SEMPRE loga, pra ter evidência).
//
// Diferente do /[token], aqui a gente LOGA TUDO antes de qualquer rejeição —
// assim, se a CodePay chamar e a auth falhar, ainda fica registro em
// payment_webhook_events pra diagnóstico (o /[token] dava 403 mudo).
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Teste de saúde: abra a URL no navegador → { ok: true } = pronta pra receber.
export async function GET() {
  return NextResponse.json({ ok: true, message: 'webhook codepay ativo' })
}

function phraseMatches(raw: string, headers: Headers): boolean {
  const phrase = process.env.CODEPAY_WEBHOOK_PHRASE
  if (!phrase) return true // sem frase configurada → não bloqueia
  if (raw.includes(phrase)) return true
  for (const value of headers.values()) {
    if (value.includes(phrase)) return true
  }
  return false
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
  const { identifier, status } = body
    ? extractWebhookInfo(body)
    : { identifier: null as string | null, status: 'PENDING' as const }

  // SEMPRE loga primeiro (auditoria + a prova de que a CodePay chamou)
  const { data: event } = await supabase
    .from('payment_webhook_events')
    .insert({
      provider: 'CODEPAY',
      external_id: identifier ?? '',
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

  if (!phraseMatches(raw, req.headers)) {
    await finish('frase de segurança não confere')
    return NextResponse.json({ ok: true, ignored: 'bad phrase' })
  }

  if (!identifier) {
    await finish('sem identifier')
    return NextResponse.json({ ok: true, ignored: 'no identifier' })
  }

  // casa por paymentId (external_id) ou, se vier o nosso ref, pelo id da linha
  let payment =
    (
      await supabase
        .from('payments')
        .select('id, status')
        .eq('external_id', identifier)
        .maybeSingle()
    ).data
  if (!payment && UUID_RE.test(identifier)) {
    payment = (
      await supabase.from('payments').select('id, status').eq('id', identifier).maybeSingle()
    ).data
  }

  if (!payment) {
    await finish('payment não encontrada')
    return NextResponse.json({ ok: true, ignored: 'payment not found' })
  }

  // idempotente: só transiciona de PENDING
  if (status === 'APPROVED' && payment.status !== 'APPROVED') {
    await supabase
      .from('payments')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
  } else if (status === 'REJECTED' && payment.status === 'PENDING') {
    await supabase
      .from('payments')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
  }

  await finish()
  return NextResponse.json({ ok: true, status })
}
