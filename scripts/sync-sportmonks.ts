/**
 * Sync manual de placar AO VIVO (SportMonks /livescores/inplay).
 * A lógica vive em src/lib/sync/sportmonks.ts (compartilhada com o cron).
 *
 * Rodar: npm run sync:live
 * Requer no ambiente: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e
 * SPORTMONKS_API_TOKEN (opcional: SPORTMONKS_BASE_URL).
 */
import { createClient } from '@supabase/supabase-js'

import { runSportmonksSync } from '@/lib/sync/sportmonks'
import type { Database } from '@/types/database'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!url || !key) {
    throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente')
  }
  if (!token) {
    throw new Error('Falta SPORTMONKS_API_TOKEN no ambiente')
  }
  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Buscando jogos ao vivo na SportMonks…')
  const r = await runSportmonksSync(supabase, token)
  if (r.unmatched.length) {
    console.warn(`Sem correspondência no banco (ignorados): ${r.unmatched.join(', ')}`)
  }
  console.log(
    `OK: ${r.fetched} jogos ao vivo na fonte → ${r.live} atualizados (ao vivo), ${r.finished} encerrados.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
