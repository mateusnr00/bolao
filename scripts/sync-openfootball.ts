/**
 * Sync local dos jogos da Copa 2026 (openfootball).
 * A lógica vive em src/lib/sync/openfootball.ts (compartilhada com o cron).
 *
 * Rodar: npm run sync
 */
import { createClient } from '@supabase/supabase-js'

import { runOpenfootballSync } from '@/lib/sync/openfootball'
import type { Database } from '@/types/database'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente')
  }
  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Sincronizando fixtures do openfootball…')
  const r = await runOpenfootballSync(supabase)
  if (r.unknown.length) {
    console.warn(`Nomes não mapeados (ignorados): ${r.unknown.join(', ')}`)
  }
  console.log(
    `OK: ${r.teams} seleções, ${r.matches} jogos (${r.finished} finalizados, ${r.skipped} pulados).`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
