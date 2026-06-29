import 'server-only'

import { getMatches } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'

export interface Trophy {
  key: string
  emoji: string
  label: string
  desc: string
}

export interface BestPalpite {
  points: number
  homeCode: string
  awayCode: string
  homeFlag: string | null
  awayFlag: string | null
  actual: [number, number]
  guess: [number, number]
  exact: boolean // cravou o placar exato
}

export interface MemberStat {
  userId: string
  name: string
  username: string
  avatarUrl: string | null
  position: number
  points: number
  predictionsMade: number
  exactScores: number
  average: number
  burrinhoCount: number
  zeroCount: number
  cravadas: BestPalpite[] // placares exatos cravados
  trophies: Trophy[]
}

interface RawRank {
  user_id: string
  display_name: string | null
  username: string
  avatar_url: string | null
  total_points: number
  predictions_made: number
  exact_scores: number
}

interface RawPred {
  user_id: string
  match_id: string
  points: number
  home_score: number
  away_score: number
}

// troféus relativos do bolão (um ou mais "donos" por categoria) + marcos fixos
function assignTrophies(members: MemberStat[]) {
  if (members.length === 0) return
  const maxExact = Math.max(...members.map((m) => m.exactScores))
  const maxBurro = Math.max(...members.map((m) => m.burrinhoCount))
  const eligible = members.filter((m) => m.predictionsMade >= 3)
  const bestAvg = eligible.length ? Math.max(...eligible.map((m) => m.average)) : -1
  const worstAvg = eligible.length ? Math.min(...eligible.map((m) => m.average)) : -1

  for (const m of members) {
    if (m.position === 1) {
      m.trophies.push({ key: 'lider', emoji: '👑', label: 'Líder', desc: '1º lugar do bolão' })
    }
    if (maxExact > 0 && m.exactScores === maxExact) {
      m.trophies.push({
        key: 'exato',
        emoji: '🎯',
        label: 'Rei do Exato',
        desc: `mais placares exatos (${maxExact})`,
      })
    }
    if (bestAvg >= 0 && m.predictionsMade >= 3 && m.average === bestAvg) {
      m.trophies.push({
        key: 'maedina',
        emoji: '🔮',
        label: 'Mãe Dina',
        desc: 'melhor média de pontos (prevê tudo)',
      })
    }
    // pior média do bolão (precisa de pelo menos 2 elegíveis e um pior de fato)
    if (
      eligible.length >= 2 &&
      worstAvg < bestAvg &&
      m.predictionsMade >= 3 &&
      m.average === worstAvg
    ) {
      m.trophies.push({
        key: 'perdidinho',
        emoji: '🧭',
        label: 'Perdidinho',
        desc: 'pior média de pontos (tá todo perdidinho)',
      })
    }
    if (maxBurro > 0 && m.burrinhoCount === maxBurro) {
      m.trophies.push({
        key: 'burro',
        emoji: '🫏',
        label: 'Burrinho-mor',
        desc: `mais vezes burrinho — zerou ${maxBurro}×`,
      })
    }
    // marcos (não relativos)
    if (m.exactScores >= 3) {
      m.trophies.push({ key: 'sniper', emoji: '🎖️', label: 'Sniper', desc: '3+ placares exatos' })
    }
    if (m.burrinhoCount >= 3) {
      m.trophies.push({ key: 'burrao', emoji: '📉', label: 'Burrão', desc: 'zerou 3+ vezes' })
    }
  }
}

/** Estatísticas de cada membro do bolão (pra perfil, troféus e hall da vergonha). */
export async function getPoolStats(poolId: string): Promise<MemberStat[]> {
  const supabase = await createClient()
  const [rankRes, predRes, matches] = await Promise.all([
    supabase
      .from('pool_rankings')
      .select(
        'user_id, display_name, username, avatar_url, total_points, predictions_made, exact_scores',
      )
      .eq('pool_id', poolId)
      .order('total_points', { ascending: false })
      .order('exact_scores', { ascending: false })
      .order('predictions_made', { ascending: false }),
    supabase
      .from('predictions')
      .select('user_id, match_id, points, home_score, away_score')
      .eq('pool_id', poolId),
    getMatches(),
  ])

  const matchById = new Map(matches.map((m) => [m.id, m]))
  const finished = ((predRes.data as RawPred[] | null) ?? []).filter((p) => {
    const m = matchById.get(p.match_id)
    return m && m.status === 'finished' && m.homeScore != null && m.awayScore != null
  })

  // por membro: soma, zeros (= burrinhos) e todos os palpites encerrados (pra
  // derivar melhores palpites + cravadas). Burrinho = quem ZEROU no jogo.
  interface Acc {
    sum: number
    count: number
    zeros: number
    pals: BestPalpite[]
  }
  const perUser = new Map<string, Acc>()
  for (const p of finished) {
    const m = matchById.get(p.match_id)!
    const u = perUser.get(p.user_id) ?? { sum: 0, count: 0, zeros: 0, pals: [] }
    u.sum += p.points
    u.count += 1
    if (p.points === 0) u.zeros += 1
    u.pals.push({
      points: p.points,
      homeCode: m.home.code,
      awayCode: m.away.code,
      homeFlag: m.home.flagUrl,
      awayFlag: m.away.flagUrl,
      actual: [m.homeScore!, m.awayScore!],
      guess: [p.home_score, p.away_score],
      exact: p.home_score === m.homeScore && p.away_score === m.awayScore,
    })
    perUser.set(p.user_id, u)
  }

  const members: MemberStat[] = ((rankRes.data as RawRank[] | null) ?? []).map((r, i) => {
    const u = perUser.get(r.user_id)
    const pals = u?.pals ?? []
    // cravadas = placares exatos (mostra primeiro os que valeram mais pontos)
    const cravadas = pals.filter((x) => x.exact).sort((a, b) => b.points - a.points)
    return {
      userId: r.user_id,
      name: r.display_name?.trim() || r.username,
      username: r.username,
      avatarUrl: r.avatar_url,
      position: i + 1,
      points: r.total_points,
      predictionsMade: r.predictions_made,
      exactScores: r.exact_scores,
      average: u && u.count > 0 ? u.sum / u.count : 0,
      burrinhoCount: u?.zeros ?? 0, // burrinho = zerou
      zeroCount: u?.zeros ?? 0,
      cravadas,
      trophies: [],
    }
  })

  assignTrophies(members)
  return members
}
