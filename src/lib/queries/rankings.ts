import 'server-only'

import { createClient } from '@/lib/supabase/server'

export interface RankingRow {
  position: number
  userId: string
  name: string
  avatarUrl: string | null
  points: number
  predictionsMade: number
  exactScores: number
  isMe: boolean
}

interface RawRanking {
  user_id: string
  display_name: string | null
  username: string
  avatar_url: string | null
  total_points: number
  predictions_made: number
  exact_scores: number
}

function toRow(r: RawRanking, i: number, meId: string | undefined): RankingRow {
  return {
    position: i + 1,
    userId: r.user_id,
    name: r.display_name?.trim() || r.username,
    avatarUrl: r.avatar_url,
    points: r.total_points,
    predictionsMade: r.predictions_made,
    exactScores: r.exact_scores,
    isMe: r.user_id === meId,
  }
}

function rankSort(a: RankingRow, b: RankingRow) {
  return (
    b.points - a.points ||
    b.exactScores - a.exactScores ||
    b.predictionsMade - a.predictionsMade
  )
}

// Ranking GERAL do bolão (pool_rankings). RLS via security_invoker.
export async function getPoolRanking(poolId: string): Promise<RankingRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('pool_rankings')
    .select(
      'user_id, display_name, username, avatar_url, total_points, predictions_made, exact_scores',
    )
    .eq('pool_id', poolId)
    .order('total_points', { ascending: false })
    .order('exact_scores', { ascending: false })
    .order('predictions_made', { ascending: false })
  if (error) throw new Error(`Erro ao buscar ranking: ${error.message}`)
  return (data as unknown as RawRanking[]).map((r, i) => toRow(r, i, user?.id))
}

interface RawStageRanking extends RawRanking {
  stage: string
}

/** Rankings POR FASE do mata-mata: stage → classificação daquela fase. */
export async function getPoolStageRankings(
  poolId: string,
): Promise<Record<string, RankingRow[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('pool_stage_rankings')
    .select(
      'user_id, display_name, username, avatar_url, total_points, predictions_made, exact_scores, stage',
    )
    .eq('pool_id', poolId)
  if (error) throw new Error(`Erro ao buscar ranking por fase: ${error.message}`)

  const byStage: Record<string, RankingRow[]> = {}
  for (const r of (data as unknown as RawStageRanking[]) ?? []) {
    ;(byStage[r.stage] ??= []).push(toRow(r, 0, user?.id))
  }
  for (const stage of Object.keys(byStage)) {
    byStage[stage].sort(rankSort).forEach((r, i) => (r.position = i + 1))
  }
  return byStage
}

// ── pontuação provisória ao vivo ────────────────────────────────────────────

export interface LiveMatchGuesses {
  matchId: string
  homeCode: string
  awayCode: string
  stage: string // fase do jogo (pra os rankings por fase)
  // placar do banco (orientado casa/fora), fallback quando o front pisca
  dbScore: [number, number] | null
  // palpite de cada membro pra esse jogo (já liberado, jogo em andamento)
  guesses: { userId: string; guess: [number, number] }[]
}

interface RawLiveMatch {
  id: string
  home_score: number | null
  away_score: number | null
  stage: string
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
      `id, home_score, away_score, stage,
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
      stage: m.stage,
      dbScore:
        m.home_score != null && m.away_score != null
          ? [m.home_score, m.away_score]
          : null,
      guesses,
    })
  }
  return out
}
