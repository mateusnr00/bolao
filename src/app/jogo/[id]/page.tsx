import { notFound } from 'next/navigation'

import {
  type MatchDetail,
  MatchDetailScreen,
} from '@/components/jogo/match-detail-screen'
import { closesInLabel, fullKickoff } from '@/lib/date'
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
  const isOpen = m.status !== 'finished' && new Date(m.kickoffAt) > now

  const [guess, poolIds, galera] = await Promise.all([
    getUserGuess(id),
    getUserPoolIds(),
    getMatchPredictions(id),
  ])

  const detail: MatchDetail = {
    id: m.id,
    phase: m.stage,
    label: m.groupName ? `Grupo ${m.groupName}` : undefined,
    kickoff: fullKickoff(m.kickoffAt),
    venue: m.venue,
    isOpen,
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
  }

  return <MatchDetailScreen match={detail} />
}
