import { NextResponse } from 'next/server'

import { fetchEspnLive } from '@/lib/sync/espn'
import { fetchWorldcup26Live, type Wc26Live } from '@/lib/sync/worldcup26'

// Placar ao vivo pro front: tenta a worldcup26 (principal, com token e minuto);
// se ela falhar ou vier sem jogo rolando, cai pra ESPN (reserva, sem chave).
// Cache curto (~5s) pra ser fresco mas aguentar o polling de muitos clientes.
// SEMPRE responde 200 com { games: [...] } — nunca derruba o front.
export const revalidate = 5

// Cada fonte roda isolada: uma falhando não pode impedir a outra de tentar.
async function liveGames(): Promise<Wc26Live[]> {
  try {
    const wc = await fetchWorldcup26Live(process.env.WC2026_API_KEY, undefined, 5)
    // se a principal trouxe jogo em andamento, usa ela (tem o minuto certinho)
    if (wc.some((g) => !g.finished)) return wc
  } catch {
    // segue pro fallback
  }
  try {
    return await fetchEspnLive(5)
  } catch {
    return []
  }
}

export async function GET() {
  const all = await liveGames()
  const games = all
    .filter((g) => !g.finished) // só os em andamento
    .map((g) => ({
      homeCode: g.homeCode,
      awayCode: g.awayCode,
      homeGoals: g.homeGoals,
      awayGoals: g.awayGoals,
      minute: g.minute,
      label: g.label,
      homeScorers: g.homeScorers,
      awayScorers: g.awayScorers,
    }))

  const res = NextResponse.json({ updatedAt: Date.now(), games })
  res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')
  return res
}
