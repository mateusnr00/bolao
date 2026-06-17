import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type Guess = [home: number, away: number]

// IDs dos bolões do usuário logado (via RLS). Vazio = não está em nenhum.
export async function getUserPoolIds(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', user.id)
  if (error) throw new Error(`Erro ao buscar bolões: ${error.message}`)
  return data.map((r) => r.pool_id)
}

// Palpite do usuário pra um jogo. Como o mesmo placar é replicado em todos os
// bolões, qualquer linha serve — pegamos a primeira.
export async function getUserGuess(matchId: string): Promise<Guess | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('predictions')
    .select('home_score, away_score')
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Erro ao buscar palpite: ${error.message}`)
  if (!data) return null
  return [data.home_score, data.away_score]
}

// Mapa matchId → palpite, pra pintar a lista de palpites de uma vez só.
export async function getUserGuesses(): Promise<Map<string, Guess>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Map()

  const { data, error } = await supabase
    .from('predictions')
    .select('match_id, home_score, away_score')
    .eq('user_id', user.id)
  if (error) throw new Error(`Erro ao buscar palpites: ${error.message}`)

  const map = new Map<string, Guess>()
  for (const row of data) {
    if (!map.has(row.match_id)) {
      map.set(row.match_id, [row.home_score, row.away_score])
    }
  }
  return map
}
