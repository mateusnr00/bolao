import { NextResponse } from 'next/server'

import { fetchEspnLive } from '@/lib/sync/espn'
import { fetchWorldcup26Live, type Wc26Live } from '@/lib/sync/worldcup26'

// Placar ao vivo pro front: une a worldcup26 (principal, com token e minuto) com
// a ESPN (reserva, sem chave). Cache curto (~5s) pra ser fresco mas aguentar o
// polling de muitos clientes.
// SEMPRE responde 200 com { games: [...] } — nunca derruba o front.
export const revalidate = 5

// chave do par de seleções, sem ordem (casa/fora pode divergir entre fontes).
function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

// Cada fonte roda isolada (uma falhando não impede a outra) e o resultado é
// UNIDO por par de seleções: a worldcup26 tem prioridade (traz o minuto), mas a
// ESPN preenche os jogos que a principal não trouxe. Antes, se a principal
// tivesse QUALQUER jogo ao vivo, a ESPN era ignorada — e um jogo (ex.: uma
// quarta de final) que só a reserva conhecia sumia do ao vivo.
async function liveGames(): Promise<Wc26Live[]> {
  const [wc, espn] = await Promise.all([
    fetchWorldcup26Live(process.env.WC2026_API_KEY, undefined, 5).catch(
      () => [] as Wc26Live[],
    ),
    fetchEspnLive(5).catch(() => [] as Wc26Live[]),
  ])

  const byPair = new Map<string, Wc26Live>()
  // ESPN primeiro (reserva); worldcup26 por cima (principal, com minuto).
  for (const g of espn) byPair.set(pairKey(g.homeCode, g.awayCode), g)
  for (const g of wc) {
    const key = pairKey(g.homeCode, g.awayCode)
    const prev = byPair.get(key)
    // reserva vê o jogo ao vivo e a principal diz que acabou → mantém o ao vivo
    // (não esconde um jogo que foi pra prorrogação).
    if (prev && !prev.finished && g.finished) continue
    byPair.set(key, g)
  }
  return Array.from(byPair.values())
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
