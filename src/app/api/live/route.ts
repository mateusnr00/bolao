import { NextResponse } from 'next/server'

import { fetchWorldcup26Live } from '@/lib/sync/worldcup26'

// Placar ao vivo pro front: busca a worldcup26 no servidor (o token nunca vai
// pro cliente) e devolve só os jogos rolando agora, com minuto. As respostas
// são cacheadas ~15s (fetch + CDN) pra aguentar o polling de muitos clientes.
export const revalidate = 15

export async function GET() {
  try {
    const all = await fetchWorldcup26Live(process.env.WC2026_API_KEY)
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
      'public, s-maxage=15, stale-while-revalidate=30',
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
