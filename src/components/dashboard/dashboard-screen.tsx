import Link from 'next/link'

import { PendingPalpites } from '@/components/dashboard/pending-palpites'
import { LiveRefresher } from '@/components/live-refresher'
import { LiveScore } from '@/components/live/live-score'
import type { DashboardData, LiveMatch } from '@/lib/queries/dashboard'
import {
  BottomNav,
  Emblem,
  Eyebrow,
  ExactDots,
  Flag,
  LiveBadge,
  PhaseBadge,
  Rule,
  TopNav,
} from '@/components/we26'
import { cn } from '@/lib/utils'

function LiveRow({ m }: { m: LiveMatch }) {
  return (
    <Link
      href={`/jogo/${m.matchId}`}
      className="flex items-center gap-3 rounded-lg border border-phase-semi/40 bg-phase-semi/5 px-3 py-2.5 transition-colors hover:bg-phase-semi/10"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Flag src={m.home.flagUrl ?? undefined} />
        <span className="font-mono text-sm font-medium text-ink">{m.home.code}</span>
        <LiveScore
          homeCode={m.home.code}
          awayCode={m.away.code}
          size="sm"
          withBadge={false}
          fallback={
            <span className="font-mono tabular text-lg font-semibold text-phase-semi">
              {m.score[0]}
              <span className="px-0.5 text-sepia">×</span>
              {m.score[1]}
            </span>
          }
        />
        <span className="font-mono text-sm font-medium text-ink">{m.away.code}</span>
        <Flag src={m.away.flagUrl ?? undefined} />
      </span>
      {m.guess && (
        <span className="hidden shrink-0 font-mono text-[12px] tabular text-sepia sm:inline">
          você: {m.guess[0]}-{m.guess[1]}
        </span>
      )}
    </Link>
  )
}

function TeamSide({
  team,
  align,
}: {
  team: { flagUrl: string | null; code: string }
  align: 'start' | 'end'
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-1',
        align === 'end' ? 'items-end' : 'items-start',
      )}
    >
      <Flag src={team.flagUrl ?? undefined} className="h-6 w-8" />
      <span className="font-mono text-sm font-semibold text-ink">{team.code}</span>
    </div>
  )
}

function ScoreBox({ value }: { value?: number }) {
  return (
    <div
      className={cn(
        'flex size-12 items-center justify-center rounded-md border bg-paper font-mono text-2xl tabular font-medium',
        value == null ? 'border-dashed border-rule text-rule' : 'border-rule-dark text-ink',
      )}
    >
      {value ?? ''}
    </div>
  )
}

export function DashboardScreen({ data }: { data: DashboardData }) {
  const { pool, me, live, next, pending, ranking, results } = data
  const topRanking = ranking.slice(0, 5)

  return (
    <div className="flex min-h-full flex-col bg-paper">
      {live.length > 0 && <LiveRefresher />}
      <TopNav active="inicio" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-7">
          {/* cabeçalho do bolão */}
          <section className="space-y-3">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">
              {pool.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-sepia">
              <span>
                código{' '}
                <span className="font-mono font-medium tracking-wide text-ink">
                  {pool.inviteCode}
                </span>
              </span>
              <span className="text-rule">·</span>
              <span>
                {pool.memberCount} {pool.memberCount === 1 ? 'membro' : 'membros'}
              </span>
              {me.position != null && (
                <>
                  <span className="text-rule">·</span>
                  <span className="font-medium text-trophy-deep">{me.position}º lugar</span>
                </>
              )}
            </div>
          </section>

          {/* falta palpitar hoje */}
          {pending.length > 0 && <PendingPalpites matches={pending} />}

          {/* ao vivo agora */}
          {live.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Eyebrow>ao vivo agora</Eyebrow>
                <LiveBadge />
              </div>
              <div className="space-y-2">
                {live.map((m) => (
                  <LiveRow key={m.matchId} m={m} />
                ))}
              </div>
            </section>
          )}

          {/* progresso */}
          <section className="flex items-center justify-between gap-4">
            <Emblem className="h-14 w-auto" />
            <div className="text-right">
              <Eyebrow>meus palpites</Eyebrow>
              <p className="display text-3xl text-ink">
                <span className="tabular">{me.predictionsMade}</span>
                <span className="text-sepia"> / {data.totalMatches}</span>
              </p>
            </div>
          </section>

          <Rule />

          {/* próximo palpite */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Eyebrow>seu próximo palpite</Eyebrow>
              {next?.closesIn && (
                <span className="font-mono text-[13px] font-medium text-phase-semi">
                  em {next.closesIn}
                </span>
              )}
            </div>

            {next ? (
              <Link
                href={`/jogo/${next.matchId}`}
                className="block space-y-4 rounded-lg px-2 py-1 transition-colors hover:bg-bone"
              >
                <PhaseBadge phase={next.stage} label={next.label} />
                <div className="flex items-center justify-between gap-3">
                  <TeamSide team={next.home} align="start" />
                  <div className="flex items-center gap-2">
                    <ScoreBox value={next.guess?.[0]} />
                    <span className="font-display text-xl text-sepia">×</span>
                    <ScoreBox value={next.guess?.[1]} />
                  </div>
                  <TeamSide team={next.away} align="end" />
                </div>
                <p className="text-center text-[13px] font-medium text-trophy-deep">
                  {next.guess ? 'editar palpite →' : 'palpitar →'}
                </p>
              </Link>
            ) : (
              <p className="rounded-lg border border-dashed border-rule px-4 py-6 text-center text-[14px] text-sepia">
                nenhum jogo aberto agora.
              </p>
            )}
          </section>

          <Rule />

          {/* ranking */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Eyebrow>ranking</Eyebrow>
              <Link
                href="/ranking"
                className="text-[13px] font-medium text-sepia transition-colors hover:text-ink"
              >
                ver →
              </Link>
            </div>
            <ul className="-mx-2">
              {topRanking.map((r) => (
                <li
                  key={r.position}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-bone',
                    r.isMe && 'bg-bone',
                  )}
                >
                  <span className="w-6 font-mono text-sm tabular text-sepia">
                    {String(r.position).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'flex-1 truncate text-[15px]',
                      r.isMe ? 'font-semibold text-ink' : 'text-ink',
                    )}
                  >
                    {r.isMe ? 'você' : r.name}
                  </span>
                  <ExactDots n={r.exactScores} />
                  <span className="w-16 text-right font-mono text-sm tabular font-medium text-ink">
                    {r.points} pts
                  </span>
                  <span className="w-4 text-trophy">{r.isMe ? '←' : ''}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* resultados */}
          {results.length > 0 && (
            <>
              <Rule />
              <section className="space-y-3">
                <Eyebrow>resultados</Eyebrow>
                <ul className="space-y-2.5">
                  {results.map((m) => (
                    <li key={m.matchId} className="flex items-center gap-3 text-[14px]">
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Flag src={m.home.flagUrl ?? undefined} />
                        <span className="font-mono font-medium text-ink">{m.home.code}</span>
                        <span className="font-mono tabular font-semibold text-ink">
                          {m.score[0]}-{m.score[1]}
                        </span>
                        <span className="font-mono font-medium text-ink">{m.away.code}</span>
                        <Flag src={m.away.flagUrl ?? undefined} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-sepia">
                        {m.guess ? (
                          <>
                            <span className="hidden sm:inline">seu palpite: </span>
                            <span className="font-mono tabular text-ink">
                              {m.guess[0]}-{m.guess[1]}
                            </span>
                          </>
                        ) : (
                          <span className="italic">sem palpite</span>
                        )}
                      </span>
                      {m.guess && (
                        <span
                          className={cn(
                            'shrink-0 font-mono text-[13px] tabular font-medium',
                            (m.points ?? 0) > 0 ? 'text-trophy-deep' : 'text-sepia',
                          )}
                        >
                          {(m.points ?? 0) > 0 ? `+${m.points}` : '0'} pts
                        </span>
                      )}
                      {m.exact && (
                        <span className="size-2 rounded-full bg-grass" aria-label="placar exato" />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </main>

      <BottomNav active="inicio" />
    </div>
  )
}
