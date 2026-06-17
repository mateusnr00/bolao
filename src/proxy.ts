import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Casa com todas as rotas exceto:
     * - _next/static, _next/image
     * - favicon.ico, arquivos de imagem
     * Assim o refresh de sessão roda em todas as páginas e APIs.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
