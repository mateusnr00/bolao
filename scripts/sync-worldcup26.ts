/**
 * Sync manual de placar via worldcup26.ir (API gratuita da Copa 2026).
 * A lógica vive em src/lib/sync/worldcup26.ts (compartilhada com o cron).
 *
 * Rodar: npm run sync:wc26
 * Requer no ambiente: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e
 * (opcional, se a API exigir auth) WC2026_API_KEY / WC2026_API_BASE_URL.
 */
import { createClient } from '@supabase/supabase-js'

import { runWorldcup26Sync } from '@/lib/sync/worldcup26'
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

  console.log('Buscando placar na worldcup26.ir…')
  const r = await runWorldcup26Sync(supabase, process.env.WC2026_API_KEY)
  if (r.unmatched.length) {
    console.warn(`Sem correspondência no banco (ignorados): ${r.unmatched.join(', ')}`)
  }
  console.log(
    `OK: ${r.fetched} jogos com placar → ${r.live} ao vivo, ${r.finished} encerrados.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
