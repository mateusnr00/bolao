'use client'

import { ChevronDown, Lock, Users } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DONKEY_SRC } from '@/lib/brand'
import type { GaleraGuess } from '@/lib/queries/predictions'
import { calcPredictionPoints } from '@/lib/scoring'
import { cn } from '@/lib/utils'

// pontos atuais de um palpite (provisórios ao vivo, ou os persistidos)
function effectivePoints(
  guess: [number, number] | null,
  points: number | null,
  actual: [number, number] | null,
): number {
  if (actual != null && guess != null) return calcPredictionPoints(guess, actual)
  return points ?? 0
}

// userId do último colocado (menor pontuação); empate → o último da lista
function lastPlaceUserId(
  rows: GaleraGuess[],
  actual: [number, number] | null,
): string | null {
  if (rows.length < 2) return null
  let min = Infinity
  let found: string | null = null
  for (const g of rows) {
    const p = effectivePoints(g.guess, g.points, actual)
    if (p <= min) {
      min = p
      found = g.userId
    }
  }
  return found
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function Row({
  g,
  hasStarted,
  actual,
  isLast,
}: {
  g: GaleraGuess
  hasStarted: boolean
  actual: [number, number] | null
  isLast: boolean
}) {
  const provisional = actual != null && g.guess != null
  const pts = provisional ? calcPredictionPoints(g.guess!, actual) : g.points

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3 py-2.5',
        g.isMe && 'bg-trophy/8',
      )}
    >
      <Avatar className="size-10 shrink-0 md:size-12">
        {isLast ? (
          <AvatarImage src={DONKEY_SRC} alt="lanterninha" />
        ) : (
          g.avatarUrl && <AvatarImage src={g.avatarUrl} alt="" />
        )}
        <AvatarFallback
          className={cn(
            'text-[12px] font-semibold md:text-sm',
            g.isMe ? 'bg-trophy text-ink' : 'bg-bone text-sepia',
          )}
        >
          {initials(g.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
        {g.name}
      </span>

      {hasStarted && g.guess ? (
        <>
          <span className="font-mono tabular text-[15px] font-medium text-ink">
            {g.guess[0]}
            <span className="px-0.5 text-sepia">×</span>
            {g.guess[1]}
          </span>
          {pts != null && (
            <span
              className={cn(
                'flex w-14 items-center justify-end gap-1 font-mono tabular text-[13px] font-medium',
                provisional ? 'text-grass' : 'text-trophy-deep',
              )}
            >
              {provisional && (
                <span className="size-1.5 animate-pulse rounded-full bg-phase-semi" />
              )}
              {pts} pt
            </span>
          )}
        </>
      ) : (
        <Lock className="size-3.5 text-rule-dark" aria-label="oculto" />
      )}
    </li>
  )
}

export function PalpitesDaGalera({
  rows,
  hasStarted,
  actual = null,
}: {
  rows: GaleraGuess[]
  hasStarted: boolean
  actual?: [number, number] | null
}) {
  const [open, setOpen] = useState(false)
  const lastId = hasStarted ? lastPlaceUserId(rows, actual) : null

  return (
    <section className="overflow-hidden rounded-lg border border-rule">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-bone"
      >
        <Users className="size-4 text-sepia" />
        <span className="flex-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
          palpites da galera
        </span>
        <span className="font-mono text-[13px] text-sepia">{rows.length}</span>
        <ChevronDown
          className={cn(
            'size-4 text-sepia transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t border-rule">
          {rows.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-sepia">
              ninguém palpitou ainda.
            </p>
          ) : (
            <>
              {!hasStarted && (
                <p className="flex items-center justify-center gap-1.5 border-b border-rule bg-bone/60 px-3 py-2 text-center text-[12px] text-sepia">
                  <Lock className="size-3" /> os placares aparecem quando a bola
                  rolar
                </p>
              )}
              {actual && (
                <p className="flex items-center justify-center gap-1.5 border-b border-rule bg-phase-semi/5 px-3 py-1.5 text-center text-[11px] font-medium text-phase-semi">
                  <span className="size-1.5 animate-pulse rounded-full bg-phase-semi" />
                  pontuação provisória · ao vivo
                </p>
              )}
              <ul className="divide-y divide-rule">
                {rows.map((g) => (
                  <Row
                    key={g.userId}
                    g={g}
                    hasStarted={hasStarted}
                    actual={actual}
                    isLast={g.userId === lastId}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
