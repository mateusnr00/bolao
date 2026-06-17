import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

// Client com service role — IGNORA RLS. Usar SOMENTE no servidor
// (rotas de cron, scripts de sync). Nunca importar no client.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
