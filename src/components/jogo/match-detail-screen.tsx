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

/* forma recente de uma seleção: bolinhas V/E/D + últimos placares */
function outcomeMeta(o: FormMatch['outcome']) {
  if (o === 'W') return { label: 'V', cls: 'bg-grass text-paper' }
  if (o === 'L') return { label: 'D', cls: 'bg-phase-semi text-paper' }
  return { label: 'E', cls: 'bg-rule-dark text-paper' }
}

function TeamForm({
  team,
  form,
  align,
}: {
  team: { code: string; flagUrl: string | null }
  form: FormMatch[]
  align: 'start' | 'end'
}) {
  if (form.length === 0) return null
  return (
    <div className={cn('flex flex-1 flex-col gap-2', align === 'end' && 'items-end')}>
      <div className="flex items-center gap-1.5">
        <Flag src={team.flagUrl ?? undefined} className="h-4 w-5" />
        <span className="font-mono text-[12px] font-semibold text-ink">{team.code}</span>
      </div>
      {/* bolinhas de forma (mais recente primeiro) */}
      <div className={cn('flex gap-1', align === 'end' && 'flex-row-reverse')}>
        {form.map((f, i) => {
          const m = outcomeMeta(f.outcome)
          return (
            <span
              key={i}
              title={`${f.forGoals}-${f.againstGoals} vs ${f.opponentCode}`}
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                m.cls,
              )}
            >
              {m.label}
            </span>
          )
        })}
      </div>
      {/* último resultado por extenso */}
      <p className="text-[11px] text-sepia">
        último: {form[0].forGoals}–{form[0].againstGoals} vs {form[0].opponentCode}
      </p>
    </div>
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
  align,
}: {
  team: { flagUrl: string | null; code: string; name: string }
  align: 'start' | 'end'
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1.5', align === 'end' ? 'items-end' : 'items-start')}>
      <Flag src={team.flagUrl ?? undefined} className="h-8 w-11" />
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
                <TeamSide team={match.home} align="start" />
                <div className="flex shrink-0 items-center gap-3 pt-1">
                  <Stepper value={home} onChange={setHome} label={match.home.code} />
                  <span className="font-display pt-5 text-2xl text-sepia">×</span>
                  <Stepper value={away} onChange={setAway} label={match.away.code} />
                </div>
                <TeamSide team={match.away} align="end" />
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
                <TeamSide team={match.home} align="start" />
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
                <TeamSide team={match.away} align="end" />
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

          {(match.homeForm.length > 0 || match.awayForm.length > 0) && (
            <section className="space-y-3">
              <Eyebrow>forma recente</Eyebrow>
              <div className="flex items-start gap-4 rounded-lg border border-rule p-4">
                <TeamForm team={match.home} form={match.homeForm} align="start" />
                <div className="mt-1 w-px self-stretch bg-rule" />
                <TeamForm team={match.away} form={match.awayForm} align="end" />
              </div>
              <p className="text-center text-[11px] text-sepia">
                V = vitória · E = empate · D = derrota (jogos mais recentes primeiro)
              </p>
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
