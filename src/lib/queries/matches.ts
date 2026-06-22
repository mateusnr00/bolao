import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { MatchStage, MatchStatus } from '@/types/database'

export interface TeamLite {
  id: string
  code: string
  name: string
  flagUrl: string | null
}

export interface MatchView {
  id: string
  kickoffAt: string
  stage: MatchStage
  groupName: string | null
  venue: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  home: TeamLite
  away: TeamLite
}

// O Supabase devolve a relação aninhada como objeto (FK 1:1), mas o tipo gerado
// não distingue 1:1 de 1:N, então normalizamos aqui.
interface RawTeam {
  id: string
  code: string
  name: string
  flag_url: string | null
  crest_url: string | null
}
interface RawMatch {
  id: string
  kickoff_at: string
  stage: MatchStage
  group_name: string | null
  venue: string | null
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  home: RawTeam | RawTeam[] | null
  away: RawTeam | RawTeam[] | null
}

const SELECT = `
  id, kickoff_at, stage, group_name, venue, status, home_score, away_score,
  home:teams!matches_home_team_id_fkey ( id, code, name, flag_url, crest_url ),
  away:teams!matches_away_team_id_fkey ( id, code, name, flag_url, crest_url )
` as const

function one<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

function toTeam(raw: RawTeam): TeamLite {
  // Exibindo a BANDEIRA. Os emblemas (crest_url) ficam guardados no banco; pra
  // voltar a usá-los é só trocar por: `raw.crest_url ?? raw.flag_url`.
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    flagUrl: raw.flag_url,
  }
}

function toView(raw: RawMatch): MatchView | null {
  const home = one(raw.home)
  const away = one(raw.away)
  if (!home || !away) return null
  return {
    id: raw.id,
    kickoffAt: raw.kickoff_at,
    stage: raw.stage,
    groupName: raw.group_name,
    venue: raw.venue,
    status: raw.status,
    homeScore: raw.home_score,
    awayScore: raw.away_score,
    home: toTeam(home),
    away: toTeam(away),
  }
}

export async function getMatches(): Promise<MatchView[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(SELECT)
    .order('kickoff_at', { ascending: true })
  if (error) throw new Error(`Erro ao buscar jogos: ${error.message}`)
  return (data as unknown as RawMatch[]).map(toView).filter((m): m is MatchView => m !== null)
}

export async function getMatchById(id: string): Promise<MatchView | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Erro ao buscar jogo: ${error.message}`)
  if (!data) return null
  return toView(data as unknown as RawMatch)
}

// ── forma recente (últimos resultados da seleção) ───────────────────────────

export interface FormMatch {
  opponentCode: string
  opponentFlag: string | null
  forGoals: number
  againstGoals: number
  outcome: 'W' | 'D' | 'L'
}

interface RawFormMatch {
  home_score: number | null
  away_score: number | null
  home_team_id: string
  away_team_id: string
  home: { code: string; flag_url: string | null } | { code: string; flag_url: string | null }[] | null
  away: { code: string; flag_url: string | null } | { code: string; flag_url: string | null }[] | null
}

/** Últimos jogos ENCERRADOS de uma seleção antes de `beforeIso`, do ponto de
 *  vista dela (placar dela × adversário + vitória/empate/derrota). */
export async function getTeamForm(
  teamId: string,
  beforeIso: string,
  limit = 5,
): Promise<FormMatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(
      `home_score, away_score, home_team_id, away_team_id,
       home:teams!matches_home_team_id_fkey ( code, flag_url ),
       away:teams!matches_away_team_id_fkey ( code, flag_url )`,
    )
    .eq('status', 'finished')
    .lt('kickoff_at', beforeIso)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('kickoff_at', { ascending: false })
    .limit(limit)
  if (error) return []

  const out: FormMatch[] = []
  for (const r of (data as unknown as RawFormMatch[]) ?? []) {
    if (r.home_score == null || r.away_score == null) continue
    const isHome = r.home_team_id === teamId
    const forGoals = isHome ? r.home_score : r.away_score
    const againstGoals = isHome ? r.away_score : r.home_score
    const opp = one(isHome ? r.away : r.home)
    out.push({
      opponentCode: opp?.code ?? '',
      opponentFlag: opp?.flag_url ?? null,
      forGoals,
      againstGoals,
      outcome: forGoals > againstGoals ? 'W' : forGoals < againstGoals ? 'L' : 'D',
    })
  }
  return out
}
