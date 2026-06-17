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
