import 'server-only'

import { createClient } from '@/lib/supabase/server'

export interface RankingRow {
  position: number
  userId: string
  name: string
  points: number
  predictionsMade: number
  exactScores: number
  isMe: boolean
}

interface RawRanking {
  user_id: string
  display_name: string | null
  username: string
  total_points: number
  predictions_made: number
  exact_scores: number
}

// Ranking de um bolão a partir da view pool_rankings (RLS via security_invoker).
// Ordena por pontos → exatos → palpites, e calcula a posição.
export async function getPoolRanking(poolId: string): Promise<RankingRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('pool_rankings')
    .select('user_id, display_name, username, total_points, predictions_made, exact_scores')
    .eq('pool_id', poolId)
    .order('total_points', { ascending: false })
    .order('exact_scores', { ascending: false })
    .order('predictions_made', { ascending: false })
  if (error) throw new Error(`Erro ao buscar ranking: ${error.message}`)

  return (data as unknown as RawRanking[]).map((r, i) => ({
    position: i + 1,
    userId: r.user_id,
    name: r.display_name?.trim() || r.username,
    points: r.total_points,
    predictionsMade: r.predictions_made,
    exactScores: r.exact_scores,
    isMe: r.user_id === user?.id,
  }))
}

// ── pontuação provisória ao vivo ────────────────────────────────────────────

export interface LiveMatchGuesses {
  matchId: string
  homeCode: string
  awayCode: string
  // placar do banco (orientado casa/fora), fallback quando o front pisca
  dbScore: [number, number] | null
  // palpite de cada membro pra esse jogo (já liberado, jogo em andamento)
  guesses: { userId: string; guess: [number, number] }[]
}

interface RawLiveMatch {
  id: string
  home_score: number | null
  away_score: number | null
  home: { code: string } | { code: string }[] | null
  away: { code: string } | { code: string }[] | null
}

function code(rel: RawLiveMatch['home']): string {
  const t = Array.isArray(rel) ? rel[0] : rel
  return t?.code ?? ''
}

/** Jogos ao vivo do bolão + palpite de cada um, pra somar pontos provisórios
 *  no ranking. Vazio quando não há jogo rolando. */
export async function getLiveMatchGuesses(): Promise<LiveMatchGuesses[]> {
  const supabase = await createClient()
  const { data: matches, error } = await supabase
    .from('matches')
    .select(
      `id, home_score, away_score,
       home:teams!matches_home_team_id_fkey ( code ),
       away:teams!matches_away_team_id_fkey ( code )`,
    )
    .eq('status', 'live')
  if (error) throw new Error(`Erro ao buscar jogos ao vivo: ${error.message}`)

  const live = (matches as unknown as RawLiveMatch[]) ?? []
  if (live.length === 0) return []

  // palpites de cada jogo ao vivo (RPC libera os placares após o apito)
  const out: LiveMatchGuesses[] = []
  for (const m of live) {
    const { data: preds } = await supabase.rpc('match_predictions', {
      p_match_id: m.id,
    })
    const guesses = (preds ?? [])
      .filter((p) => p.home_score != null && p.away_score != null)
      .map((p) => ({
        userId: p.user_id,
        guess: [p.home_score!, p.away_score!] as [number, number],
      }))

    out.push({
      matchId: m.id,
      homeCode: code(m.home),
      awayCode: code(m.away),
      dbScore:
        m.home_score != null && m.away_score != null
          ? [m.home_score, m.away_score]
          : null,
      guesses,
    })
  }
  return out
}
