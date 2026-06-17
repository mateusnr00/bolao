import 'server-only'

import { closesInLabel, dayKey } from '@/lib/date'
import { getMatches, type MatchView } from '@/lib/queries/matches'
import { getPoolRanking, type RankingRow } from '@/lib/queries/rankings'
import { createClient } from '@/lib/supabase/server'
import type { MatchStage } from '@/types/database'

export interface DashboardPool {
  name: string
  inviteCode: string
  memberCount: number
}

export interface NextMatch {
  matchId: string
  stage: MatchStage
  label?: string
  closesIn?: string
  home: { code: string; flagUrl: string | null }
  away: { code: string; flagUrl: string | null }
  guess?: [number, number]
}

export interface ResultRow {
  matchId: string
  home: { code: string; flagUrl: string | null }
  away: { code: string; flagUrl: string | null }
  score: [number, number]
  guess?: [number, number]
  points?: number
  exact?: boolean
}

export interface LiveMatch {
  matchId: string
  stage: MatchStage
  label?: string
  home: { code: string; flagUrl: string | null }
  away: { code: string; flagUrl: string | null }
  score: [number, number]
  guess?: [number, number]
}

// jogo de hoje ainda sem palpite (pro aviso "falta palpitar" com contagem)
export interface PendingMatch {
  matchId: string
  kickoffAt: string
  stage: MatchStage
  label?: string
  home: { code: string; flagUrl: string | null }
  away: { code: string; flagUrl: string | null }
}

export interface DashboardData {
  pool: DashboardPool
  me: { position: number | null; points: number; predictionsMade: number }
  totalMatches: number
  live: LiveMatch[]
  next: NextMatch | null
  pending: PendingMatch[]
  ranking: RankingRow[]
  results: ResultRow[]
}

function teamLite(t: MatchView['home']) {
  return { code: t.code, flagUrl: t.flagUrl }
}

export async function getDashboard(
  pool: DashboardPool & { id: string },
): Promise<DashboardData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const now = new Date()

  const [matches, ranking, rulesRes] = await Promise.all([
    getMatches(),
    getPoolRanking(pool.id),
    supabase
      .from('scoring_rules')
      .select('exact_score_points')
      .eq('pool_id', pool.id)
      .maybeSingle(),
  ])
  const exactScorePoints = rulesRes.data?.exact_score_points ?? 25

  // próximo jogo aberto
  const upcoming = matches
    .filter((m) => m.status === 'scheduled' && new Date(m.kickoffAt) > now)
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))[0]

  // jogos de HOJE ainda abertos (pro aviso "falta palpitar")
  const todayKey = dayKey(now.toISOString())
  const todaysOpen = matches
    .filter(
      (m) =>
        m.status === 'scheduled' &&
        new Date(m.kickoffAt) > now &&
        dayKey(m.kickoffAt) === todayKey,
    )
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))

  // jogos rolando agora
  const liveRaw = matches.filter(
    (m) => m.status === 'live' && m.homeScore != null && m.awayScore != null,
  )

  // resultados recentes (jogos encerrados, mais recentes primeiro)
  const finished = matches
    .filter(
      (m) => m.status === 'finished' && m.homeScore != null && m.awayScore != null,
    )
    .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt))
    .slice(0, 5)

  // meus palpites nos jogos relevantes (deste bolão)
  const relevantIds = [
    ...new Set([
      ...(upcoming ? [upcoming.id] : []),
      ...todaysOpen.map((m) => m.id),
      ...liveRaw.map((m) => m.id),
      ...finished.map((m) => m.id),
    ]),
  ]
  const guessMap = new Map<string, { guess: [number, number]; points: number }>()
  if (user && relevantIds.length > 0) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('match_id, home_score, away_score, points')
      .eq('user_id', user.id)
      .eq('pool_id', pool.id)
      .in('match_id', relevantIds)
    for (const p of preds ?? []) {
      guessMap.set(p.match_id, {
        guess: [p.home_score, p.away_score],
        points: p.points,
      })
    }
  }

  const live: LiveMatch[] = liveRaw.map((m) => ({
    matchId: m.id,
    stage: m.stage,
    label: m.groupName ? `Grupo ${m.groupName}` : undefined,
    home: teamLite(m.home),
    away: teamLite(m.away),
    score: [m.homeScore!, m.awayScore!],
    guess: guessMap.get(m.id)?.guess,
  }))

  const next: NextMatch | null = upcoming
    ? {
        matchId: upcoming.id,
        stage: upcoming.stage,
        label: upcoming.groupName ? `Grupo ${upcoming.groupName}` : undefined,
        closesIn: closesInLabel(upcoming.kickoffAt, now) ?? undefined,
        home: teamLite(upcoming.home),
        away: teamLite(upcoming.away),
        guess: guessMap.get(upcoming.id)?.guess,
      }
    : null

  const results: ResultRow[] = finished.map((m) => {
    const mine = guessMap.get(m.id)
    return {
      matchId: m.id,
      home: teamLite(m.home),
      away: teamLite(m.away),
      score: [m.homeScore!, m.awayScore!],
      guess: mine?.guess,
      points: mine?.points,
      exact: mine != null && mine.points >= exactScorePoints,
    }
  })

  // jogos de hoje que ainda não têm meu palpite
  const pending: PendingMatch[] = todaysOpen
    .filter((m) => !guessMap.has(m.id))
    .map((m) => ({
      matchId: m.id,
      kickoffAt: m.kickoffAt,
      stage: m.stage,
      label: m.groupName ? `Grupo ${m.groupName}` : undefined,
      home: teamLite(m.home),
      away: teamLite(m.away),
    }))

  const meRow = ranking.find((r) => r.isMe)

  return {
    pool: { name: pool.name, inviteCode: pool.inviteCode, memberCount: pool.memberCount },
    me: {
      position: meRow?.position ?? null,
      points: meRow?.points ?? 0,
      predictionsMade: meRow?.predictionsMade ?? 0,
    },
    totalMatches: matches.length,
    live,
    next,
    pending,
    ranking,
    results,
  }
}
