'use client'

import { AlarmClock } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import { Flag, PhaseBadge } from '@/components/we26'
import type { PendingMatch } from '@/lib/queries/dashboard'
import { cn } from '@/lib/utils'

// relógio compartilhado que tica a cada segundo (fora do render → puro)
let current = 0
const tickSubs = new Set<() => void>()
let tickTimer: ReturnType<typeof setInterval> | null = null

function subscribeNow(cb: () => void) {
  if (tickSubs.size === 0) current = Date.now()
  tickSubs.add(cb)
  if (!tickTimer) {
    tickTimer = setInterval(() => {
      current = Date.now()
      for (const c of tickSubs) c()
    }, 1000)
  }
  return () => {
    tickSubs.delete(cb)
    if (tickSubs.size === 0 && tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }
}

// null no servidor/hidratação; vira o timestamp real depois de montar
function useNow(): number | null {
  return useSyncExternalStore(
    subscribeNow,
    () => current || null,
    () => null,
  )
}

// "2h 14m" longe do apito; "14:23" (mm:ss) na última hora; "fechando" no fim
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'fechando'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h >= 1) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function urgent(ms: number): boolean {
  return ms <= 60 * 60 * 1000 // última hora
}

export function PendingPalpites({ matches }: { matches: PendingMatch[] }) {
  const now = useNow()

  // esconde os que já fecharam (kickoff passou) depois de montar
  const ref = now ?? 0
  const open = matches.filter((m) => now == null || new Date(m.kickoffAt).getTime() > ref)
  if (open.length === 0) return null

  return (
    <section className="space-y-2.5 rounded-xl border border-phase-semi/40 bg-phase-semi/5 p-3.5">
      <div className="flex items-center gap-2">
        <AlarmClock className="size-4 text-phase-semi" />
        <p className="flex-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-phase-semi">
          falta palpitar hoje
        </p>
        <span className="font-mono text-[13px] font-semibold text-phase-semi">
          {open.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {open.map((m) => {
          const ms = now == null ? 0 : new Date(m.kickoffAt).getTime() - ref
          return (
            <li key={m.matchId}>
              <Link
                href={`/jogo/${m.matchId}`}
                className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2.5 transition-colors hover:bg-bone"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Flag src={m.home.flagUrl ?? undefined} />
                  <span className="font-mono text-sm font-medium text-ink">{m.home.code}</span>
                  <span className="text-sepia">×</span>
                  <span className="font-mono text-sm font-medium text-ink">{m.away.code}</span>
                  <Flag src={m.away.flagUrl ?? undefined} />
                  <PhaseBadge
                    phase={m.stage}
                    label={m.label}
                    className="ml-1 hidden sm:inline-block"
                  />
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[10px] uppercase tracking-wide text-sepia">
                    fecha em
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[14px] tabular font-semibold',
                      now != null && urgent(ms) ? 'text-phase-semi' : 'text-ink',
                    )}
                  >
                    {now == null ? '—' : formatCountdown(ms)}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
