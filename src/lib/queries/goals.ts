import 'server-only'

import { createClient } from '@/lib/supabase/server'

export interface MatchGoal {
  id: string
  scorer: string
  minute: string | null
  teamCode: string
}

interface RawGoal {
  id: string
  scorer: string
  minute: string | null
  team: { code: string } | { code: string }[] | null
}

function teamCode(rel: RawGoal['team']): string {
  const t = Array.isArray(rel) ? rel[0] : rel
  return t?.code ?? ''
}

// Gols de um jogo, em ordem de minuto (best-effort), com o código do time.
export async function getMatchGoals(matchId: string): Promise<MatchGoal[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('match_goals')
    .select('id, scorer, minute, team:teams!match_goals_team_id_fkey ( code )')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
  // tabela ainda não criada (migration pendente) → não quebra a página
  if (error) return []
  return (data as unknown as RawGoal[]).map((g) => ({
    id: g.id,
    scorer: g.scorer,
    minute: g.minute,
    teamCode: teamCode(g.team),
  }))
}

export interface TopScorer {
  scorer: string
  goals: number
  teamCode: string
  teamFlag: string | null
}

// Top artilheiros (gols por jogador), com time pra mostrar bandeira/sigla.
export async function getTopScorers(limit = 10): Promise<TopScorer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('top_scorers', { p_limit: limit })
  // função/tabela ainda não criada (migration pendente) → lista vazia
  if (error) return []
  const rows = data ?? []
  if (rows.length === 0) return []

  // resolve os times de uma vez
  const teamIds = [...new Set(rows.map((r) => r.team_id))]
  const { data: teams } = await supabase
    .from('teams')
    .select('id, code, flag_url')
    .in('id', teamIds)
  const byId = new Map((teams ?? []).map((t) => [t.id, t]))

  return rows.map((r) => {
    const t = byId.get(r.team_id)
    return {
      scorer: r.scorer,
      goals: r.goals,
      teamCode: t?.code ?? '',
      teamFlag: t?.flag_url ?? null,
    }
  })
}

// É dono de algum bolão? (quem pode lançar/remover gols)
export async function isGoalAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('pools')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()
  return data != null
}
