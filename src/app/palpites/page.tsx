import {
  PalpitesScreen,
  type PalpiteDay,
  type PalpiteMatch,
  type Status,
} from '@/components/palpites/palpites-screen'
import { dayKey, dayLabel, timeLabel } from '@/lib/date'
import { getMatches } from '@/lib/queries/matches'
import { getUserGuesses } from '@/lib/queries/predictions'

export const dynamic = 'force-dynamic'

function statusOf(
  kickoffAt: string,
  finished: boolean,
  hasGuess: boolean,
  now: Date,
): Status {
  if (finished) return 'finished'
  if (new Date(kickoffAt) <= now) return 'locked'
  return hasGuess ? 'predicted' : 'open'
}

export default async function PalpitesPage() {
  const [matches, guesses] = await Promise.all([getMatches(), getUserGuesses()])
  const now = new Date()

  // Agrupa por dia (fuso de Brasília).
  const byDay = new Map<string, PalpiteDay>()
  for (const m of matches) {
    const finished = m.status === 'finished'
    const guess = guesses.get(m.id)
    const item: PalpiteMatch = {
      id: m.id,
      time: timeLabel(m.kickoffAt),
      phase: m.stage,
      label: m.groupName ? `Grupo ${m.groupName}` : undefined,
      home: { code: m.home.code, flagUrl: m.home.flagUrl },
      away: { code: m.away.code, flagUrl: m.away.flagUrl },
      guess,
      score:
        finished && m.homeScore != null && m.awayScore != null
          ? [m.homeScore, m.awayScore]
          : undefined,
      status: statusOf(m.kickoffAt, finished, guess != null, now),
    }
    const key = dayKey(m.kickoffAt)
    if (!byDay.has(key)) {
      byDay.set(key, { id: key, title: dayLabel(m.kickoffAt, now), matches: [] })
    }
    byDay.get(key)!.matches.push(item)
  }

  // Próximos/hoje (asc) primeiro, depois passado (desc).
  const todayKey = dayKey(now.toISOString())
  const days = [...byDay.values()].sort((a, b) => {
    const aFut = a.id >= todayKey
    const bFut = b.id >= todayKey
    if (aFut !== bFut) return aFut ? -1 : 1
    return aFut ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
  })

  return <PalpitesScreen days={days} />
}
