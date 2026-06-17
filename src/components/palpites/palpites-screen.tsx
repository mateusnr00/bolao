'use client'

import {
  CalendarDays,
  Check,
  ChevronDown,
  Info,
  Lock,
  MapPin,
  Shuffle,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { savePrediction } from '@/app/jogo/[id]/actions'
import { LiveRefresher } from '@/components/live-refresher'
import { LiveScore } from '@/components/live/live-score'
import { GaleraInline } from '@/components/palpites/galera-inline'
import {
  BottomNav,
  Flag,
  LiveBadge,
  type Phase,
  PHASE_META,
  PhaseBadge,
  TopNav,
} from '@/components/we26'
import { randomFootballScore } from '@/lib/score'
import { cn } from '@/lib/utils'

export type Status = 'open' | 'predicted' | 'locked' | 'live' | 'finished'

export interface PalpiteMatch {
  id: string
  time: string
  phase: Phase
  label?: string
  dateLong: string
  venue: string | null
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

export interface PalpiteRound {
  id: string
  label: string
  isCurrent: boolean
  days: PalpiteDay[]
}

const FILTERS = [
  { key: 'todos', label: 'todos' },
  { key: 'abertos', label: 'a palpitar' },
  { key: 'encerrados', label: 'encerrados' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

function matchesFilter(m: PalpiteMatch, f: FilterKey) {
  if (f === 'abertos') return m.status === 'open' || m.status === 'predicted'
  if (f === 'encerrados')
    return m.status === 'finished' || m.status === 'locked' || m.status === 'live'
  return true
}

/* bandeira redonda estilo "card de jogo" */
function TeamCol({
  team,
}: {
  team: { code: string; flagUrl: string | null }
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <Flag
        src={team.flagUrl ?? undefined}
        className="size-12 rounded-full object-cover ring-1 ring-rule"
      />
      <span className="font-mono text-[14px] font-semibold text-ink">{team.code}</span>
    </div>
  )
}

/* uma casinha de placar editável (input numérico discreto) */
function ScoreSlot({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number | null
  onChange: (n: number | null) => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={value === null ? '' : String(value)}
      disabled={disabled}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').slice(0, 2)
        onChange(d === '' ? null : Math.min(20, parseInt(d, 10)))
      }}
      onFocus={(e) => e.currentTarget.select()}
      className="size-11 rounded-full bg-transparent text-center font-mono text-2xl tabular font-semibold text-ink caret-trophy outline-none transition-colors focus:bg-bone disabled:cursor-not-allowed"
    />
  )
}

function ScorePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-rule-dark px-1.5 py-1">
      {children}
    </div>
  )
}

function ReadonlyScore({ guess }: { guess: [number, number] }) {
  return (
    <ScorePill>
      <span className="flex size-11 items-center justify-center font-mono text-2xl tabular font-semibold text-ink">
        {guess[0]}
      </span>
      <span className="font-mono text-sm text-sepia">×</span>
      <span className="flex size-11 items-center justify-center font-mono text-2xl tabular font-semibold text-ink">
        {guess[1]}
      </span>
    </ScorePill>
  )
}

/* "sobre o jogo": fica em cima do placar, abre as infos da partida */
function SobreJogo({ m }: { m: PalpiteMatch }) {
  const [open, setOpen] = useState(false)
  const phaseText = m.label
    ? `${PHASE_META[m.phase].label} · ${m.label}`
    : PHASE_META[m.phase].label

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-1 text-left transition-colors"
      >
        <Info className="size-4 text-sepia" />
        <span className="flex-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-sepia">
          sobre o jogo
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-sepia transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <dl className="mt-1.5 space-y-2 rounded-lg border border-rule bg-bone/40 p-3 text-[13px]">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-sepia" />
            <dd className="text-ink">
              {m.dateLong}{' '}
              <span className="text-sepia">· horário de Brasília</span>
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-sepia" />
            <dd className="text-ink">{m.venue ?? 'estádio a confirmar'}</dd>
          </div>
          <div className="flex items-start gap-2">
            <Trophy className="mt-0.5 size-4 shrink-0 text-sepia" />
            <dd className="text-ink">{phaseText}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

function SaveStatus({
  state,
}: {
  state: 'idle' | 'incomplete' | 'saving' | 'saved' | 'error'
}) {
  if (state === 'incomplete')
    return <span className="text-[12px] text-sepia">preencha os dois placares</span>
  if (state === 'saving') return <span className="text-[12px] text-sepia">salvando…</span>
  if (state === 'saved')
    return (
      <span className="flex items-center gap-1 text-[12px] font-medium text-trophy-deep">
        <Check className="size-3.5" /> salvo
      </span>
    )
  if (state === 'error')
    return <span className="text-[12px] font-medium text-destructive">erro</span>
  return null
}

function CardHeader({
  m,
  right,
}: {
  m: PalpiteMatch
  right: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className="font-mono text-[13px] tabular text-sepia">{m.time}</span>
        <PhaseBadge phase={m.phase} label={m.label} className="text-[10px]" />
      </span>
      {right}
    </div>
  )
}

/* card com palpite editável inline + gerador de placar */
function EditableMatchRow({
  m,
  hasPools,
}: {
  m: PalpiteMatch
  hasPools: boolean
}) {
  const [home, setHome] = useState<number | null>(m.guess?.[0] ?? null)
  const [away, setAway] = useState<number | null>(m.guess?.[1] ?? null)
  const savedRef = useRef(m.guess ? `${m.guess[0]}-${m.guess[1]}` : '')
  const [state, setState] = useState<
    'idle' | 'incomplete' | 'saving' | 'saved' | 'error'
  >(m.guess ? 'saved' : 'idle')
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!hasPools) return
    // Placar incompleto: não salva e avisa. Só nag se a pessoa já mexeu em
    // algo (um campo preenchido, ou já tinha palpite salvo); senão fica neutro.
    if (home === null || away === null) {
      const touched = home !== null || away !== null || savedRef.current !== ''
      setState(touched ? 'incomplete' : 'idle')
      return
    }
    const key = `${home}-${away}`
    if (key === savedRef.current) {
      setState('saved')
      return
    }
    setState('saving')
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await savePrediction({
          matchId: m.id,
          homeScore: home,
          awayScore: away,
        })
        if ('error' in res) {
          setState('error')
          toast.error(res.error)
        } else {
          savedRef.current = key
          setState('saved')
        }
      })
    }, 600)
    return () => clearTimeout(t)
  }, [home, away, hasPools, m.id, startTransition])

  function shuffle() {
    const [h, a] = randomFootballScore(
      home !== null && away !== null ? [home, away] : undefined,
    )
    setHome(h)
    setAway(a)
  }

  return (
    <li className="rounded-xl border border-rule bg-paper p-4">
      <CardHeader
        m={m}
        right={
          hasPools ? (
            <div className="flex items-center gap-2">
              <SaveStatus state={state} />
              <button
                type="button"
                onClick={shuffle}
                aria-label="gerar placar aleatório"
                title="placar aleatório"
                className="flex size-7 items-center justify-center rounded-md text-sepia transition-colors hover:bg-bone hover:text-ink"
              >
                <Shuffle className="size-4" />
              </button>
            </div>
          ) : null
        }
      />

      <div className="mt-2">
        <SobreJogo m={m} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <TeamCol team={m.home} />
        <ScorePill>
          <ScoreSlot
            value={home}
            onChange={setHome}
            disabled={!hasPools}
            ariaLabel={`gols ${m.home.code}`}
          />
          <span className="font-mono text-sm text-sepia">×</span>
          <ScoreSlot
            value={away}
            onChange={setAway}
            disabled={!hasPools}
            ariaLabel={`gols ${m.away.code}`}
          />
        </ScorePill>
        <TeamCol team={m.away} />
      </div>

      <div className="mt-3">
        {hasPools ? (
          <GaleraInline matchId={m.id} homeCode={m.home.code} awayCode={m.away.code} />
        ) : (
          <Link
            href="/boloes"
            className="flex text-[12px] font-medium text-trophy-deep transition-colors hover:text-ink"
          >
            entre num bolão pra palpitar →
          </Link>
        )}
      </div>
    </li>
  )
}

/* card de jogo já fechado / encerrado (somente leitura) */
function StaticMatchRow({
  m,
  hasPools,
}: {
  m: PalpiteMatch
  hasPools: boolean
}) {
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const win = (m.points ?? 0) > 0

  return (
    <li
      className={cn(
        'rounded-xl border bg-paper p-4',
        live ? 'border-phase-semi/40' : 'border-rule',
      )}
    >
      <CardHeader
        m={m}
        right={
          finished ? (
            m.guess !== undefined && m.points !== undefined ? (
              <span className="flex items-center gap-1.5">
                {m.exact && (
                  <span
                    className="size-2 rounded-full bg-grass"
                    aria-label="placar exato"
                  />
                )}
                <span
                  className={cn(
                    'font-mono text-[13px] tabular font-medium',
                    win ? 'text-trophy-deep' : 'text-sepia',
                  )}
                >
                  {win ? `+${m.points}` : '0'} pts
                </span>
              </span>
            ) : (
              <span className="text-[12px] text-sepia">encerrado</span>
            )
          ) : live ? (
            <LiveBadge />
          ) : (
            <span className="flex items-center gap-1 text-[12px] text-sepia">
              <Lock className="size-3" /> fechado
            </span>
          )
        }
      />

      <div className="mt-2">
        <SobreJogo m={m} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <TeamCol team={m.home} />
        <div className="shrink-0 text-center">
          <LiveScore
            homeCode={m.home.code}
            awayCode={m.away.code}
            size="md"
            withBadge={false}
            fallback={
              (finished || live) && m.score ? (
                <>
                  <p
                    className={cn(
                      'font-mono text-2xl tabular font-semibold',
                      live ? 'text-phase-semi' : 'text-ink',
                    )}
                  >
                    {m.score[0]}
                    <span className="px-1 text-sepia">×</span>
                    {m.score[1]}
                  </p>
                  {m.guess && (
                    <p className="mt-0.5 font-mono text-[11px] tabular text-sepia">
                      você: {m.guess[0]} a {m.guess[1]}
                    </p>
                  )}
                </>
              ) : m.guess ? (
                <>
                  <ReadonlyScore guess={m.guess} />
                  <p className="mt-1 text-[11px] text-sepia">seu palpite</p>
                </>
              ) : (
                <p className="font-mono text-[13px] text-sepia">sem palpite</p>
              )
            }
          />
        </div>
        <TeamCol team={m.away} />
      </div>

      {hasPools && (
        <div className="mt-3">
          <GaleraInline matchId={m.id} homeCode={m.home.code} awayCode={m.away.code} />
        </div>
      )}
    </li>
  )
}

function MatchCard({ m, hasPools }: { m: PalpiteMatch; hasPools: boolean }) {
  if (m.status === 'open' || m.status === 'predicted') {
    return <EditableMatchRow m={m} hasPools={hasPools} />
  }
  return <StaticMatchRow m={m} hasPools={hasPools} />
}

function RoundSelector({
  rounds,
  selectedId,
  onSelect,
}: {
  rounds: PalpiteRound[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = rounds.find((r) => r.id === selectedId)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-rule-dark bg-paper px-3.5 py-2.5 text-left transition-colors hover:bg-bone"
      >
        <CalendarDays className="size-4 shrink-0 text-trophy-deep" />
        <span className="flex-1 text-[15px] font-medium text-ink">
          {selected?.label ?? 'rodada'}
          {selected?.isCurrent && (
            <span className="ml-1.5 text-[12px] font-normal text-sepia">
              (atual)
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-sepia transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-lg border border-rule-dark bg-paper shadow-lg">
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {rounds.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(r.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[15px] transition-colors hover:bg-bone',
                    r.id === selectedId
                      ? 'font-semibold text-trophy-deep'
                      : 'text-ink',
                  )}
                >
                  <span>
                    {r.label}
                    {r.isCurrent && (
                      <span className="ml-1.5 text-[12px] font-normal text-sepia">
                        (atual)
                      </span>
                    )}
                  </span>
                  {r.id === selectedId && <Check className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function PalpitesScreen({
  rounds,
  hasPools,
  hasLive = false,
}: {
  rounds: PalpiteRound[]
  hasPools: boolean
  hasLive?: boolean
}) {
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [roundId, setRoundId] = useState<string>(
    () => rounds.find((r) => r.isCurrent)?.id ?? rounds[0]?.id ?? '',
  )

  const round = rounds.find((r) => r.id === roundId) ?? rounds[0]
  const days = (round?.days ?? [])
    .map((d) => ({
      ...d,
      matches: d.matches.filter((m) => matchesFilter(m, filter)),
    }))
    .filter((d) => d.matches.length > 0)

  return (
    <div className="flex min-h-full flex-col bg-paper">
      {hasLive && <LiveRefresher />}
      <TopNav active="palpites" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-5">
          <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">palpites</h1>

          {rounds.length > 0 && (
            <RoundSelector
              rounds={rounds}
              selectedId={roundId}
              onSelect={setRoundId}
            />
          )}

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
                <section key={d.id} className="space-y-2.5">
                  <div className="sticky top-14 z-10 -mx-2 bg-paper/90 px-2 py-2 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sepia">
                      {d.title}
                    </p>
                  </div>
                  <ul className="space-y-2.5">
                    {d.matches.map((m) => (
                      <MatchCard key={m.id} m={m} hasPools={hasPools} />
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
