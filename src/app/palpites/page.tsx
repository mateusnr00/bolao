import {
  PalpitesScreen,
  type PalpiteDay,
  type PalpiteMatch,
  type PalpiteRound,
  type Status,
} from '@/components/palpites/palpites-screen'
import { dayKey, dayLabel, fullKickoff, timeLabel } from '@/lib/date'
import { getAllTeamForms, getMatches, type MatchView } from '@/lib/queries/matches'
import { getUserGuesses, getUserPoolIds } from '@/lib/queries/predictions'
import type { MatchStage } from '@/types/database'

export const dynamic = 'force-dynamic'

// Ordem canônica das rodadas e rótulos (fase de grupos vira 3 rodadas).
const ROUND_ORDER = [
  'g1',
  'g2',
  'g3',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
] as const
type RoundId = (typeof ROUND_ORDER)[number]

const ROUND_LABEL: Record<RoundId, string> = {
  g1: 'rodada 1',
  g2: 'rodada 2',
  g3: 'rodada 3',
  round_of_32: '16-avos',
  round_of_16: 'oitavas',
  quarter_final: 'quartas',
  semi_final: 'semi',
  third_place: '3º lugar',
  final: 'final',
}

function statusOf(m: MatchView, hasGuess: boolean, now: Date): Status {
  if (m.status === 'finished') return 'finished'
  if (m.status === 'live') return 'live'
  if (new Date(m.kickoffAt) <= now) return 'locked'
  return hasGuess ? 'predicted' : 'open'
}

export default async function PalpitesPage() {
  const [matches, guesses, poolIds, forms] = await Promise.all([
    getMatches(),
    getUserGuesses(),
    getUserPoolIds(),
    getAllTeamForms(),
  ])
  const now = new Date()
  const hasPools = poolIds.length > 0

  // Rodada de cada jogo. Grupos: 4 times = 6 jogos, 2 por rodada, em ordem
  // cronológica → rodada = floor(ordem_no_grupo / 2) + 1. Mata-mata: o stage.
  // (matches já vem ordenado por kickoff asc.)
  const groupCount = new Map<string, number>()
  function roundIdOf(stage: MatchStage, groupName: string | null): RoundId {
    if (stage === 'group') {
      const g = groupName ?? '?'
      const idx = groupCount.get(g) ?? 0
      groupCount.set(g, idx + 1)
      const md = Math.min(3, Math.floor(idx / 2) + 1)
      return `g${md}` as RoundId
    }
    return stage as RoundId
  }

  // Agrupa: rodada → dia → jogos.
  const byRound = new Map<RoundId, Map<string, PalpiteDay>>()
  const openByRound = new Map<RoundId, boolean>()

  for (const m of matches) {
    const finished = m.status === 'finished'
    const guess = guesses.get(m.id)
    const item: PalpiteMatch = {
      id: m.id,
      time: timeLabel(m.kickoffAt),
      phase: m.stage,
      label: m.groupName ? `Grupo ${m.groupName}` : undefined,
      dateLong: fullKickoff(m.kickoffAt),
      venue: m.venue,
      home: { code: m.home.code, flagUrl: m.home.flagUrl },
      away: { code: m.away.code, flagUrl: m.away.flagUrl },
      homeForm: forms.get(m.home.id) ?? [],
      awayForm: forms.get(m.away.id) ?? [],
      guess,
      score:
        (finished || m.status === 'live') &&
        m.homeScore != null &&
        m.awayScore != null
          ? [m.homeScore, m.awayScore]
          : undefined,
      status: statusOf(m, guess != null, now),
    }

    const rid = roundIdOf(m.stage, m.groupName)
    if (!finished) openByRound.set(rid, true)

    if (!byRound.has(rid)) byRound.set(rid, new Map())
    const byDay = byRound.get(rid)!
    const key = dayKey(m.kickoffAt)
    if (!byDay.has(key)) {
      byDay.set(key, { id: key, title: dayLabel(m.kickoffAt, now), matches: [] })
    }
    byDay.get(key)!.matches.push(item)
  }

  // Rodada "atual": primeira (na ordem) que ainda tem jogo em aberto; se todas
  // encerradas, a última com jogos.
  const presentRounds = ROUND_ORDER.filter((r) => byRound.has(r))
  const currentId =
    presentRounds.find((r) => openByRound.get(r)) ??
    presentRounds[presentRounds.length - 1] ??
    null

  const rounds: PalpiteRound[] = presentRounds.map((rid) => ({
    id: rid,
    label: ROUND_LABEL[rid],
    isCurrent: rid === currentId,
    days: [...byRound.get(rid)!.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  }))

  const hasLive = matches.some((m) => m.status === 'live')

  return (
    <PalpitesScreen rounds={rounds} hasPools={hasPools} hasLive={hasLive} />
  )
}
