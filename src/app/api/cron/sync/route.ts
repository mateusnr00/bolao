import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { runEspnSync } from '@/lib/sync/espn'
import { runOpenfootballFinals, runOpenfootballSync } from '@/lib/sync/openfootball'
import { runWorldcup26Sync } from '@/lib/sync/worldcup26'

// Lê headers e escreve no banco → sempre dinâmica, nunca cacheada.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Fontes, independentes (uma falhando não derruba a outra):
//  1) AO VIVO: worldcup26.ir (principal, com minuto). Se falhar/vier vazia,
//     usa a ESPN (reserva, sem chave).
//  2) CALENDÁRIO: openfootball seed — insere jogos novos no banco (ex.: os de
//     mata-mata aparecem sozinhos quando os times saem da fase de grupos).
//  3) FINAIS:  openfootball — fecha os jogos com placar final e dispara o
//     recálculo dos pontos, mesmo se o ao vivo falhar.
function msg(err: unknown): string {
  return err instanceof Error ? err.message : 'erro desconhecido'
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const token = process.env.WC2026_API_KEY
  const result: Record<string, unknown> = {}

  // 1) AO VIVO — worldcup26 (principal)
  let liveOk = false
  if (token) {
    try {
      const wc = await runWorldcup26Sync(supabase, token)
      result.worldcup26 = wc
      liveOk = wc.fetched > 0
    } catch (err) {
      result.worldcup26 = { error: msg(err) }
    }
  } else {
    result.worldcup26 = { skipped: 'WC2026_API_KEY ausente' }
  }

  // 1b) AO VIVO — ESPN (reserva), só se a principal falhou ou veio vazia
  if (!liveOk) {
    try {
      result.espn = await runEspnSync(supabase)
    } catch (err) {
      result.espn = { error: msg(err) }
    }
  }

  // 2) CALENDÁRIO — openfootball seed (insere jogos novos, ex.: mata-mata
  //    quando os times são definidos). Idempotente (upsert por external_id).
  try {
    result.seed = await runOpenfootballSync(supabase)
  } catch (err) {
    result.seed = { error: msg(err) }
  }

  // 3) FINAIS — openfootball (garantia dos placares finais)
  try {
    result.openfootball = await runOpenfootballFinals(supabase)
  } catch (err) {
    result.openfootball = { error: msg(err) }
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    ...result,
  })
}
