'use client'

import { Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import {
  BottomNav,
  Flag,
  type Phase,
  PhaseBadge,
  TopNav,
} from '@/components/we26'
import { cn } from '@/lib/utils'

export type Status = 'open' | 'predicted' | 'locked' | 'finished'

export interface PalpiteMatch {
  id: string
  time: string
  phase: Phase
  label?: string
  home: { code: string; flagUrl: string | null }
  away: { code: string; flagUrl: string | null }
  guess?: [number, number]
  score?: [number, number]
  points?: number
  exact?: boolean
  status: Status
}

export interface PalpiteDay {
  id: string
  title: string
  matches: PalpiteMatch[]
}

const FILTERS = [
  { key: 'todos', label: 'todos' },
  { key: 'abertos', label: 'a palpitar' },
  { key: 'encerrados', label: 'encerrados' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

function matchesFilter(m: PalpiteMatch, f: FilterKey) {
  if (f === 'abertos') return m.status === 'open'
  if (f === 'encerrados') return m.status === 'finished'
  return true
}

function ScoreBox({ value, dim }: { value?: number; dim?: boolean }) {
  return (
    <div
      className={cn(
        'flex size-9 items-center justify-center rounded-md border font-mono text-lg tabular font-medium',
        dim ? 'border-dashed border-rule text-rule' : 'border-rule-dark text-ink',
      )}
    >
      {value ?? '–'}
    </div>
  )
}

function StatusPill({ m }: { m: PalpiteMatch }) {
  if (m.status === 'finished') {
    if (m.guess === undefined || m.points === undefined) {
      return <span className="text-[12px] text-sepia">encerrado</span>
    }
    const win = (m.points ?? 0) > 0
    return (
      <span className="flex items-center gap-1.5">
        {m.exact && <span className="size-2 rounded-full bg-grass" aria-label="placar exato" />}
        <span className={cn('font-mono text-[13px] tabular font-medium', win ? 'text-trophy-deep' : 'text-sepia')}>
          {win ? `+${m.points}` : '0'} pts
        </span>
      </span>
    )
  }
  if (m.status === 'locked') {
    return (
      <span className="flex items-center gap-1 text-[12px] text-sepia">
        <Lock className="size-3" /> fechado
      </span>
    )
  }
  if (m.status === 'predicted') {
    return (
      <span className="flex items-center gap-1 text-[12px] font-medium text-trophy-deep">
        <Check className="size-3.5" /> palpitado
      </span>
    )
  }
  return <span className="text-[12px] font-medium text-trophy-deep">a palpitar →</span>
}

function TeamTag({
  team,
  align,
}: {
  team: { code: string; flagUrl: string | null }
  align: 'start' | 'end'
}) {
  return (
    <span
      className={cn(
        'flex flex-1 items-center gap-2',
        align === 'end' ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <Flag src={team.flagUrl ?? undefined} className="h-[18px] w-6" />
      <span className="font-mono text-[15px] font-semibold text-ink">{team.code}</span>
    </span>
  )
}

function MatchRow({ m }: { m: PalpiteMatch }) {
  return (
    <Link
      href={`/jogo/${m.id}`}
      className="block rounded-md px-2 py-3 transition-colors hover:bg-bone"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="font-mono text-[13px] tabular text-sepia">{m.time}</span>
          <PhaseBadge phase={m.phase} label={m.label} className="text-[10px]" />
        </span>
        <StatusPill m={m} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <TeamTag team={m.home} align="start" />
        <div className="flex shrink-0 items-center gap-1.5">
          {m.status === 'finished' ? (
            <div className="text-center">
              <p className="font-mono text-lg tabular font-semibold text-ink">
                {m.score![0]}<span className="text-sepia"> × </span>{m.score![1]}
              </p>
              {m.guess && (
                <p className="font-mono text-[11px] tabular text-sepia">
                  você: {m.guess[0]}-{m.guess[1]}
                </p>
              )}
            </div>
          ) : (
            <>
              <ScoreBox value={m.guess?.[0]} dim={m.status === 'open'} />
              <span className="font-mono text-sm text-sepia">×</span>
              <ScoreBox value={m.guess?.[1]} dim={m.status === 'open'} />
            </>
          )}
        </div>
        <TeamTag team={m.away} align="end" />
      </div>
    </Link>
  )
}

export function PalpitesScreen({ days: allDays }: { days: PalpiteDay[] }) {
  const [filter, setFilter] = useState<FilterKey>('todos')

  const days = allDays
    .map((d) => ({
      ...d,
      matches: d.matches.filter((m) => matchesFilter(m, filter)),
    }))
    .filter((d) => d.matches.length > 0)

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="palpites" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-5">
          <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">palpites</h1>

          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[13px] font-medium transition-colors',
                  filter === f.key
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule text-sepia hover:border-rule-dark hover:text-ink',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {days.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-sepia">nenhum jogo aqui.</p>
          ) : (
            <div className="space-y-7">
              {days.map((d) => (
                <section key={d.id} className="space-y-1">
                  <div className="sticky top-14 z-10 -mx-2 bg-paper/90 px-2 py-2 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sepia">
                      {d.title}
                    </p>
                  </div>
                  <ul className="-mx-2 divide-y divide-rule">
                    {d.matches.map((m) => (
                      <li key={m.id}>
                        <MatchRow m={m} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav active="palpites" />
    </div>
  )
}
