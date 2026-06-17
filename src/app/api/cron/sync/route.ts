import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { runWorldcup26Sync } from '@/lib/sync/worldcup26'

// Lê headers e escreve no banco → sempre dinâmica, nunca cacheada.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Fonte oficial única: worldcup26.ir. Marca os jogos como 'live'/'finished' e
// atualiza o placar; o trigger do banco recalcula os pontos quando encerra.
// (O calendário é semeado pelo script `npm run sync` — openfootball, com os
//  horários corretos em UTC; não faz parte deste loop ao vivo.)
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const token = process.env.WC2026_API_KEY
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'WC2026_API_KEY ausente' },
      { status: 500 },
    )
  }

  try {
    const supabase = createAdminClient()
    const result = await runWorldcup26Sync(supabase, token)
    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      source: 'worldcup26',
      ...result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
