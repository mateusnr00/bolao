import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { runOpenfootballSync } from '@/lib/sync/openfootball'

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
    const result = await runOpenfootballSync(supabase)
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
