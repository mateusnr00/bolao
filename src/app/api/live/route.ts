import { NextResponse } from 'next/server'

import { fetchWorldcup26Live } from '@/lib/sync/worldcup26'

// Placar ao vivo pro front: busca a worldcup26 no servidor (o token nunca vai
// pro cliente) e devolve só os jogos rolando agora, com minuto. Cache curto
// (~5s) pra ser fresco mas ainda aguentar o polling de muitos clientes.
export const revalidate = 5

export async function GET() {
  try {
    const all = await fetchWorldcup26Live(process.env.WC2026_API_KEY, undefined, 5)
    const games = all
      .filter((g) => !g.finished) // só os em andamento
      .map((g) => ({
        homeCode: g.homeCode,
        awayCode: g.awayCode,
        homeGoals: g.homeGoals,
        awayGoals: g.awayGoals,
        minute: g.minute,
        label: g.label,
      }))

    const res = NextResponse.json({ updatedAt: Date.now(), games })
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=5, stale-while-revalidate=10',
    )
    return res
  } catch (err) {
    // falha na fonte externa não pode quebrar o front — devolve vazio, mas
    // expõe o erro pra dar pra diagnosticar (token, fonte fora do ar etc.)
    return NextResponse.json({
      updatedAt: Date.now(),
      games: [],
      error: err instanceof Error ? err.message : 'erro ao buscar ao vivo',
    })
  }
}
