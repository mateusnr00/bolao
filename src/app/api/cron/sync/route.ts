import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { runOpenfootballSync } from '@/lib/sync/openfootball'
import { runSportmonksSync } from '@/lib/sync/sportmonks'
import { runWorldcup26Sync } from '@/lib/sync/worldcup26'

// Lê headers e escreve no banco → sempre dinâmica, nunca cacheada.
export const dynamic = 'force-dynamic'
// O fetch + upsert pode passar de 10s; dá folga (Vercel limita por plano).
export const maxDuration = 60

// Roda o sync ao vivo sem deixar um erro de fonte externa derrubar o cron.
async function safeLive<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'erro no sync ao vivo' }
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    // 1) calendário/seed (fonte da verdade do fixture). Não-fatal: se o
    //    openfootball falhar, ainda rodamos o placar ao vivo abaixo.
    const openfootball = await safeLive(() => runOpenfootballSync(supabase))

    // 2) placar ao vivo por cima. Precedência: worldcup26 (gratuito, nativo da
    //    Copa) e, na falta dele, SportMonks. É essa etapa que marca 'live' e
    //    'finished' dos jogos — por isso não pode depender do openfootball.
    let live: unknown = null
    const wc26Token = process.env.WC2026_API_KEY
    const sportmonksToken = process.env.SPORTMONKS_API_TOKEN
    if (wc26Token) {
      live = { source: 'worldcup26', ...(await safeLive(() => runWorldcup26Sync(supabase, wc26Token))) }
    } else if (sportmonksToken) {
      live = { source: 'sportmonks', ...(await safeLive(() => runSportmonksSync(supabase, sportmonksToken))) }
    }

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      openfootball,
      live,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
