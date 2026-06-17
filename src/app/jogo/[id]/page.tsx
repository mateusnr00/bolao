import { notFound } from 'next/navigation'

import {
  type MatchDetail,
  MatchDetailScreen,
} from '@/components/jogo/match-detail-screen'
import { closesInLabel, fullKickoff } from '@/lib/date'
import { getMatchGoals, isGoalAdmin } from '@/lib/queries/goals'
import { getMatchById } from '@/lib/queries/matches'
import {
  getMatchPredictions,
  getUserGuess,
  getUserPoolIds,
} from '@/lib/queries/predictions'

export const dynamic = 'force-dynamic'

export default async function JogoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const m = await getMatchById(id)
  if (!m) notFound()

  const now = new Date()
  const isLive = m.status === 'live'
  const isOpen = m.status !== 'finished' && !isLive && new Date(m.kickoffAt) > now

  const [guess, poolIds, galera, goals, canManageGoals] = await Promise.all([
    getUserGuess(id),
    getUserPoolIds(),
    getMatchPredictions(id),
    getMatchGoals(id),
    isGoalAdmin(),
  ])

  const detail: MatchDetail = {
    id: m.id,
    phase: m.stage,
    label: m.groupName ? `Grupo ${m.groupName}` : undefined,
    kickoff: fullKickoff(m.kickoffAt),
    venue: m.venue,
    isOpen,
    isLive,
    hasPools: poolIds.length > 0,
    guess: guess ?? undefined,
    closesIn: closesInLabel(m.kickoffAt, now) ?? undefined,
    home: { code: m.home.code, name: m.home.name, flagUrl: m.home.flagUrl },
    away: { code: m.away.code, name: m.away.name, flagUrl: m.away.flagUrl },
    score:
      m.homeScore != null && m.awayScore != null
        ? [m.homeScore, m.awayScore]
        : undefined,
    galera,
    goals,
    canManageGoals,
  }

  return <MatchDetailScreen match={detail} />
}
