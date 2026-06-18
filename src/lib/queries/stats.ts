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
  actual: [number, number]
  guess: [number, number]
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
  best: BestPalpite | null
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
        key: 'nostra',
        emoji: '🔮',
        label: 'Nostradamus',
        desc: 'melhor média de pontos',
      })
    }
    if (maxBurro > 0 && m.burrinhoCount === maxBurro) {
      m.trophies.push({
        key: 'burro',
        emoji: '🫏',
        label: 'Burrinho-mor',
        desc: `mais vezes o pior da partida (${maxBurro})`,
      })
    }
    // marcos (não relativos)
    if (m.exactScores >= 3) {
      m.trophies.push({ key: 'sniper', emoji: '🎖️', label: 'Sniper', desc: '3+ placares exatos' })
    }
    if (m.burrinhoCount >= 3) {
      m.trophies.push({ key: 'burrao', emoji: '📉', label: 'Burrão', desc: '3+ vezes lanterninha' })
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

  // por jogo: menor/maior pontuação e quantos palpitaram (pra achar o "pior")
  const perMatch = new Map<string, { min: number; max: number; count: number }>()
  for (const p of finished) {
    const a = perMatch.get(p.match_id) ?? { min: Infinity, max: -Infinity, count: 0 }
    a.min = Math.min(a.min, p.points)
    a.max = Math.max(a.max, p.points)
    a.count += 1
    perMatch.set(p.match_id, a)
  }

  // por membro: soma, melhor palpite, burrinhos, zeros
  interface Acc {
    sum: number
    count: number
    burrinho: number
    zeros: number
    best: BestPalpite | null
  }
  const perUser = new Map<string, Acc>()
  for (const p of finished) {
    const m = matchById.get(p.match_id)!
    const u = perUser.get(p.user_id) ?? { sum: 0, count: 0, burrinho: 0, zeros: 0, best: null }
    u.sum += p.points
    u.count += 1
    if (p.points === 0) u.zeros += 1
    const agg = perMatch.get(p.match_id)!
    if (agg.count >= 2 && agg.min < agg.max && p.points === agg.min) u.burrinho += 1
    if (!u.best || p.points > u.best.points) {
      u.best = {
        points: p.points,
        homeCode: m.home.code,
        awayCode: m.away.code,
        actual: [m.homeScore!, m.awayScore!],
        guess: [p.home_score, p.away_score],
      }
    }
    perUser.set(p.user_id, u)
  }

  const members: MemberStat[] = ((rankRes.data as RawRank[] | null) ?? []).map((r, i) => {
    const u = perUser.get(r.user_id)
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
      burrinhoCount: u?.burrinho ?? 0,
      zeroCount: u?.zeros ?? 0,
      best: u?.best ?? null,
      trophies: [],
    }
  })

  assignTrophies(members)
  return members
}
