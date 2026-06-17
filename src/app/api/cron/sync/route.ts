import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { runOpenfootballSync } from '@/lib/sync/openfootball'
import {
  runSportmonksSync,
  type SportmonksSyncResult,
} from '@/lib/sync/sportmonks'

// Lê headers e escreve no banco → sempre dinâmica, nunca cacheada.
export const dynamic = 'force-dynamic'
// O fetch + upsert pode passar de 10s; dá folga (Vercel limita por plano).
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    // 1) calendário/seed (fonte da verdade do fixture)
    const openfootball = await runOpenfootballSync(supabase)

    // 2) placar ao vivo por cima (opcional: só roda se houver token). Um erro
    //    aqui não derruba o sync principal — só registra na resposta.
    let sportmonks: SportmonksSyncResult | { error: string } | null = null
    const token = process.env.SPORTMONKS_API_TOKEN
    if (token) {
      try {
        sportmonks = await runSportmonksSync(supabase, token)
      } catch (err) {
        sportmonks = {
          error: err instanceof Error ? err.message : 'erro no sync ao vivo',
        }
      }
    }

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      openfootball,
      sportmonks,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
