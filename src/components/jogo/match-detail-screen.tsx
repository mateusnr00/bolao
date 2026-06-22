'use client'

import { ChevronDown, ChevronLeft, ChevronUp, Lock } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { savePrediction } from '@/app/jogo/[id]/actions'
import { PalpitesDaGalera } from '@/components/jogo/palpites-da-galera'
import { LiveRefresher } from '@/components/live-refresher'
import { LiveScore } from '@/components/live/live-score'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BottomNav,
  Eyebrow,
  Flag,
  LiveBadge,
  type Phase,
  PhaseBadge,
  Rule,
  TopNav,
} from '@/components/we26'
import { useLivePair } from '@/lib/live-store'
import type { FormMatch } from '@/lib/queries/matches'
import type { GaleraGuess } from '@/lib/queries/predictions'
import { calcPredictionPoints } from '@/lib/scoring'
import { cn } from '@/lib/utils'

export interface MatchDetail {
  id: string
  phase: Phase
  label?: string
  kickoff: string
  venue: string | null
  isOpen: boolean
  isLive: boolean
  hasPools: boolean
  guess?: [number, number]
  closesIn?: string
  home: { code: string; name: string; flagUrl: string | null }
  away: { code: string; name: string; flagUrl: string | null }
  score?: [number, number]
  galera: { rows: GaleraGuess[]; hasStarted: boolean }
  homeForm: FormMatch[]
  awayForm: FormMatch[]
}

/* forma recente: V/E/D + placares, num popover ao clicar na bandeira */
function outcomeMeta(o: FormMatch['outcome']) {
  if (o === 'W') return { label: 'V', cls: 'bg-grass text-paper' }
  if (o === 'L') return { label: 'D', cls: 'bg-phase-semi text-paper' }
  return { label: 'E', cls: 'bg-rule-dark text-paper' }
}

function TeamFlag({
  team,
  form,
  className,
}: {
  team: { code: string; name?: string; flagUrl: string | null }
  form: FormMatch[]
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`últimos jogos de ${team.code}`}
        className="rounded-sm ring-offset-2 ring-offset-paper transition hover:ring-2 hover:ring-trophy focus-visible:ring-2 focus-visible:ring-trophy"
      >
        <Flag src={team.flagUrl ?? undefined} className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={8} className="w-60 p-0">
        <div className="flex items-center gap-2 border-b border-rule px-3 py-2.5">
          <Flag src={team.flagUrl ?? undefined} className="h-4 w-6" />
          <span className="text-[13px] font-semibold text-ink">
            {team.name ?? team.code} · últimos jogos
          </span>
        </div>
        {form.length === 0 ? (
          <p className="px-3 py-4 text-center text-[12px] text-sepia">
            ainda sem jogos nesta Copa.
          </p>
        ) : (
          <ul className="divide-y divide-rule">
            {form.map((f, i) => {
              const m = outcomeMeta(f.outcome)
              return (
                <li key={i} className="flex items-center gap-2.5 px-3 py-2 text-[13px]">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      m.cls,
                    )}
                  >
                    {m.label}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="text-sepia">vs</span>
                    <Flag src={f.opponentFlag ?? undefined} className="h-3.5 w-5" />
                    <span className="font-mono font-medium text-ink">{f.opponentCode}</span>
                  </span>
                  <span className="font-mono tabular font-semibold text-ink">
                    {f.forGoals}
                    <span className="px-0.5 text-sepia">–</span>
                    {f.againstGoals}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="border-t border-rule px-3 py-2 text-center text-[11px] text-sepia">
          V = vitória · E = empate · D = derrota
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const SCORING = [
  { label: 'placar exato', pts: '30' },
  { label: 'erro de 1 gol (ponderado)', pts: '22' },
  { label: 'erro de 2', pts: '18' },
  { label: 'erro de 3', pts: '15' },
  { label: 'erro de 4', pts: '12' },
  { label: 'erro de 5 ou mais', pts: '8' },
  { label: 'errou o resultado', pts: '0' },
]

function TeamSide({
  team,
  form,
  align,
}: {
  team: { flagUrl: string | null; code: string; name: string }
  form: FormMatch[]
  align: 'start' | 'end'
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1.5', align === 'end' ? 'items-end' : 'items-start')}>
      <TeamFlag team={team} form={form} className="h-8 w-11" />
      <span className="font-mono text-lg font-semibold leading-none text-ink">{team.code}</span>
      <span className="text-[12px] text-sepia">{team.name}</span>
    </div>
  )
}

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (n: number) => void
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={`aumentar ${label}`}
        onClick={() => onChange(Math.min(20, value + 1))}
        className="flex size-8 items-center justify-center rounded-md text-sepia transition-colors hover:bg-bone hover:text-ink"
      >
        <ChevronUp className="size-5" />
      </button>
      <div className="flex size-16 items-center justify-center rounded-lg border border-rule-dark bg-paper font-mono text-4xl tabular font-medium text-ink">
        {value}
      </div>
      <button
        type="button"
        aria-label={`diminuir ${label}`}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center rounded-md text-sepia transition-colors hover:bg-bone hover:text-ink disabled:opacity-30"
        disabled={value === 0}
      >
        <ChevronDown className="size-5" />
      </button>
    </div>
  )
}

export function MatchDetailScreen({ match }: { match: MatchDetail }) {
  const [home, setHome] = useState(match.guess?.[0] ?? 0)
  const [away, setAway] = useState(match.guess?.[1] ?? 0)
  const [saved, setSaved] = useState(match.guess != null)
  const [isPending, startTransition] = useTransition()

  // o front sabe do "ao vivo" antes do banco (sync de 10 min) → reflete na hora
  const frontLive = useLivePair(match.home.code, match.away.code)
  const liveNow = match.isLive || frontLive != null

  // placar atual (front ou banco), reorientado, pra pontos provisórios ao vivo
  const actual: [number, number] | null = frontLive
    ? frontLive.homeCode === match.home.code
      ? [frontLive.homeGoals, frontLive.awayGoals]
      : [frontLive.awayGoals, frontLive.homeGoals]
    : liveNow && match.score
      ? match.score
      : null
  const myLivePts =
    actual && match.guess ? calcPredictionPoints(match.guess, actual) : null

  function confirm() {
    startTransition(async () => {
      const res = await savePrediction({
        matchId: match.id,
        homeScore: home,
        awayScore: away,
      })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      setSaved(true)
      toast.success(`palpite salvo: ${match.home.code} ${home} a ${away} ${match.away.code}`)
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      {liveNow && <LiveRefresher />}
      <TopNav active="palpites" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-7">
          <Link
            href="/palpites"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-sepia transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" /> palpites
          </Link>

          {/* cabeçalho do jogo */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <PhaseBadge phase={match.phase} label={match.label} />
              {match.isOpen && match.closesIn && (
                <span className="font-mono text-[13px] font-medium text-phase-semi">
                  fecha em {match.closesIn}
                </span>
              )}
            </div>
            <div>
              <p className="text-[15px] font-medium text-ink">{match.kickoff}</p>
              <p className="text-[12px] text-sepia">
                {match.venue ? `${match.venue} · ` : ''}horário de Brasília
              </p>
            </div>
          </section>

          {match.isOpen ? (
            /* placar / stepper */
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <Eyebrow>seu palpite</Eyebrow>
                {saved && (
                  <span className="text-[12px] font-medium text-trophy-deep">
                    palpite salvo ✓
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <TeamSide team={match.home} form={match.homeForm} align="start" />
                <div className="flex shrink-0 items-center gap-3 pt-1">
                  <Stepper value={home} onChange={setHome} label={match.home.code} />
                  <span className="font-display pt-5 text-2xl text-sepia">×</span>
                  <Stepper value={away} onChange={setAway} label={match.away.code} />
                </div>
                <TeamSide team={match.away} form={match.awayForm} align="end" />
              </div>

              {match.hasPools ? (
                <>
                  <Button
                    onClick={confirm}
                    disabled={isPending}
                    className="h-11 w-full rounded-md text-[15px] font-medium"
                  >
                    {isPending
                      ? 'salvando…'
                      : saved
                        ? 'atualizar palpite'
                        : 'confirmar palpite'}
                  </Button>
                  <p className="text-center text-[12px] text-sepia">
                    trava no apito inicial. depois não dá pra mudar.
                  </p>
                </>
              ) : (
                <div className="space-y-3 rounded-lg border border-dashed border-rule p-4 text-center">
                  <p className="text-[13px] text-sepia">
                    você precisa estar em um bolão pra palpitar.
                  </p>
                  <Link
                    href="/boloes"
                    className={cn(
                      buttonVariants(),
                      'h-10 rounded-md px-4 text-[14px] font-medium',
                    )}
                  >
                    entrar em um bolão
                  </Link>
                </div>
              )}
            </section>
          ) : (
            /* jogo já começou / encerrado */
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Eyebrow>{liveNow ? 'ao vivo' : 'resultado'}</Eyebrow>
                {liveNow && <LiveBadge />}
              </div>
              <div className="flex items-center justify-between gap-3">
                <TeamSide team={match.home} form={match.homeForm} align="start" />
                <div className="shrink-0 text-center">
                  <LiveScore
                    homeCode={match.home.code}
                    awayCode={match.away.code}
                    size="lg"
                    withBadge={false}
                    fallback={
                      match.score ? (
                        <p className="font-mono text-4xl tabular font-semibold text-ink">
                          {match.score[0]}
                          <span className="px-1 text-sepia">×</span>
                          {match.score[1]}
                        </p>
                      ) : (
                        <p className="font-mono text-sm text-sepia">
                          aguardando placar
                        </p>
                      )
                    }
                  />
                </div>
                <TeamSide team={match.away} form={match.awayForm} align="end" />
              </div>
              {match.guess && (
                <p className="text-center text-[13px] text-sepia">
                  seu palpite{' '}
                  <span className="font-mono text-ink">
                    {match.guess[0]} a {match.guess[1]}
                  </span>
                  {myLivePts != null && (
                    <>
                      {' · '}
                      <span className="font-semibold text-grass">
                        marcando {myLivePts} pts
                      </span>
                    </>
                  )}
                </p>
              )}
              {!liveNow && (
                <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-sepia">
                  <Lock className="size-3" /> palpites encerrados
                </p>
              )}
            </section>
          )}

          <PalpitesDaGalera
            matchId={match.id}
            rows={match.galera.rows}
            hasStarted={match.galera.hasStarted}
            actual={actual}
          />

          <Rule />

          {/* como pontua */}
          <section className="space-y-3">
            <Eyebrow>como pontua</Eyebrow>
            <ul className="space-y-2">
              {SCORING.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-[14px]">
                  <span className="text-ink">{s.label}</span>
                  <span className="font-mono tabular font-medium text-trophy-deep">{s.pts} pts</span>
                </li>
              ))}
            </ul>
            <p className="text-[12px] leading-relaxed text-sepia">
              só pontua quem acerta o resultado. erro do vencedor pesa 1; chutar
              gols a menos pro perdedor pesa 2; e{' '}
              <span className="font-medium text-ink">inventar gol</span> pra quem
              não fez pesa 3 (o pior erro). (vale a partir de Holanda × Suécia)
            </p>
          </section>
        </div>
      </main>

      <BottomNav active="palpites" />
    </div>
  )
}
