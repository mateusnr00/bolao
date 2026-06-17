'use client'

import { ChevronDown, ChevronLeft, ChevronUp, Lock } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { savePrediction } from '@/app/jogo/[id]/actions'
import { PalpitesDaGalera } from '@/components/jogo/palpites-da-galera'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  BottomNav,
  Eyebrow,
  Flag,
  type Phase,
  PhaseBadge,
  Rule,
  TopNav,
} from '@/components/we26'
import type { GaleraGuess } from '@/lib/queries/predictions'
import { cn } from '@/lib/utils'

export interface MatchDetail {
  id: string
  phase: Phase
  label?: string
  kickoff: string
  venue: string | null
  isOpen: boolean
  hasPools: boolean
  guess?: [number, number]
  closesIn?: string
  home: { code: string; name: string; flagUrl: string | null }
  away: { code: string; name: string; flagUrl: string | null }
  score?: [number, number]
  galera: { rows: GaleraGuess[]; hasStarted: boolean }
}

const SCORING = [
  { label: 'placar exato', pts: '25' },
  { label: 'vencedor + placar do vencedor', pts: '18' },
  { label: 'vencedor + diferença de gols', pts: '15' },
  { label: 'empate (placar errado)', pts: '15' },
  { label: 'vencedor + placar do perdedor', pts: '12' },
  { label: 'só o vencedor', pts: '10' },
  { label: 'errou', pts: '0' },
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
      toast.success(`palpite salvo: ${match.home.code} ${home}–${away} ${match.away.code}`)
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
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
                    trava no apito inicial — depois não dá pra mudar.
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
              <Eyebrow>resultado</Eyebrow>
              <div className="flex items-center justify-between gap-3">
                <TeamSide team={match.home} align="start" />
                <div className="shrink-0 text-center">
                  {match.score ? (
                    <p className="font-mono text-4xl tabular font-semibold text-ink">
                      {match.score[0]}<span className="px-1 text-sepia">×</span>{match.score[1]}
                    </p>
                  ) : (
                    <p className="font-mono text-sm text-sepia">aguardando placar</p>
                  )}
                </div>
                <TeamSide team={match.away} align="end" />
              </div>
              <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-sepia">
                <Lock className="size-3" /> palpites encerrados
              </p>
            </section>
          )}

          <PalpitesDaGalera
            rows={match.galera.rows}
            hasStarted={match.galera.hasStarted}
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
          </section>
        </div>
      </main>

      <BottomNav active="palpites" />
    </div>
  )
}
