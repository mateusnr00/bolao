import { LiveRefresher } from '@/components/live-refresher'
import { LiveScore } from '@/components/live/live-score'
import { Eyebrow, Flag, LiveBadge } from '@/components/we26'
import { shortKickoff } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { MatchStatus } from '@/types/database'

export interface GameCardData {
  id: string
  kickoffAt: string
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  groupName: string | null
  home: { code: string; flagUrl: string | null }
  away: { code: string; flagUrl: string | null }
}

function TeamCol({ team }: { team: { code: string; flagUrl: string | null } }) {
  return (
    <div className="flex w-1/3 flex-col items-center gap-2">
      <Flag src={team.flagUrl ?? undefined} className="size-10 object-contain" />
      <span className="font-mono text-xs font-semibold text-ink">{team.code}</span>
    </div>
  )
}

function GameCard({ m }: { m: GameCardData }) {
  const live = m.status === 'live'
  const hasScore = m.homeScore != null && m.awayScore != null

  return (
    <div
      className={cn(
        'rounded-xl border bg-paper p-4 transition-colors',
        live ? 'border-phase-semi/40' : 'border-rule hover:border-rule-dark',
      )}
    >
      <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-wider text-sepia">
        {shortKickoff(m.kickoffAt)}
      </p>

      <div className="flex items-center justify-between gap-1">
        <TeamCol team={m.home} />

        <div className="flex flex-col items-center gap-1.5 px-1">
          <LiveScore
            homeCode={m.home.code}
            awayCode={m.away.code}
            size="md"
            fallback={
              <>
                {hasScore ? (
                  <span
                    className={cn(
                      'font-mono text-xl tabular font-semibold',
                      live ? 'text-phase-semi' : 'text-ink',
                    )}
                  >
                    {m.homeScore}
                    <span className="px-1 text-sepia">×</span>
                    {m.awayScore}
                  </span>
                ) : (
                  <span className="font-mono text-base font-semibold text-sepia">
                    vs
                  </span>
                )}
                {live ? (
                  <LiveBadge />
                ) : m.groupName ? (
                  <span className="text-[10px] uppercase tracking-wider text-sepia">
                    grupo {m.groupName}
                  </span>
                ) : null}
              </>
            }
          />
        </div>

        <TeamCol team={m.away} />
      </div>
    </div>
  )
}

export function MatchesGrid({ games }: { games: GameCardData[] }) {
  if (games.length === 0) return null
  const hasLive = games.some((g) => g.status === 'live')

  return (
    <section className="border-b border-rule bg-bone/40">
      {hasLive && <LiveRefresher />}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <Eyebrow>jogos da copa 2026</Eyebrow>
            <h2 className="display text-[clamp(24px,5vw,34px)] uppercase text-ink">
              resultados &amp; próximos
            </h2>
          </div>
          {hasLive && <LiveBadge />}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.map((m) => (
            <GameCard key={m.id} m={m} />
          ))}
        </div>
      </div>
    </section>
  )
}
