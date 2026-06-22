import { NextResponse } from 'next/server'

import { extractWebhookInfo } from '@/lib/codepay'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

// Webhook GLOBAL da CodePay (configurado uma vez no painel codepay.one):
//   https://<APP_URL>/api/webhooks/codepay/<CODEPAY_WEBHOOK_TOKEN>
// O token na URL precisa bater EXATO com a env, senão 403. Sempre responde 200
// nos casos "ignorados" pra CodePay não reentregar pra sempre.
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Teste de saúde: abra a URL do webhook no navegador. Se voltar { ok: true },
// a URL + token + deploy estão corretos e prontos pra receber a CodePay.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const expected = process.env.CODEPAY_WEBHOOK_TOKEN
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'CODEPAY_WEBHOOK_TOKEN não configurado no servidor' },
      { status: 500 },
    )
  }
  if (token !== expected) {
    return new NextResponse('forbidden', { status: 403 })
  }
  return NextResponse.json({ ok: true, message: 'webhook ativo' })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const expected = process.env.CODEPAY_WEBHOOK_TOKEN
  if (!expected || token !== expected) {
    return new NextResponse('forbidden', { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { identifier, status } = extractWebhookInfo(body)
  const supabase = createAdminClient()

  // loga sempre (auditoria), mesmo que vá ignorar
  const { data: event } = await supabase
    .from('payment_webhook_events')
    .insert({ provider: 'CODEPAY', external_id: identifier ?? '', payload: body as Json })
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
    await finish('Payment não encontrada')
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
