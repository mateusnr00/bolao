'use client'

import { ChevronDown, Lock, Users } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLivePair } from '@/lib/live-store'
import { calcPredictionPoints } from '@/lib/scoring'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Row {
  userId: string
  name: string
  avatarUrl: string | null
  guess: [number, number] | null
  points: number | null
  isMe: boolean
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function PersonRow({
  g,
  hasStarted,
  actual,
}: {
  g: Row
  hasStarted: boolean
  actual: [number, number] | null
}) {
  // ao vivo: pontos provisórios calculados sobre o placar atual
  const provisional = actual != null && g.guess != null
  const pts = provisional ? calcPredictionPoints(g.guess!, actual) : g.points

  return (
    <li className={cn('flex items-center gap-3 px-3 py-2.5', g.isMe && 'bg-trophy/8')}>
      <Avatar className="size-7 shrink-0">
        {g.avatarUrl && <AvatarImage src={g.avatarUrl} alt="" />}
        <AvatarFallback
          className={cn(
            'text-[11px] font-semibold',
            g.isMe ? 'bg-trophy text-ink' : 'bg-bone text-sepia',
          )}
        >
          {initials(g.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
        {g.name}
        {g.isMe && <span className="ml-1.5 text-[11px] text-sepia">você</span>}
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

export function GaleraInline({
  matchId,
  homeCode,
  awayCode,
}: {
  matchId: string
  homeCode: string
  awayCode: string
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [rows, setRows] = useState<Row[]>([])

  // placar ao vivo (do front), reorientado pra ordem casa/fora deste jogo
  const live = useLivePair(homeCode, awayCode)
  const actual: [number, number] | null = live
    ? live.homeCode === homeCode
      ? [live.homeGoals, live.awayGoals]
      : [live.awayGoals, live.homeGoals]
    : null

  async function toggle() {
    const next = !open
    setOpen(next)
    if (!next || loaded || loading) return

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('match_predictions', {
      p_match_id: matchId,
    })
    if (!error && data) {
      setRows(
        data.map((r) => ({
          userId: r.user_id,
          name: r.display_name ?? r.username,
          avatarUrl: r.avatar_url,
          guess:
            r.home_score != null && r.away_score != null
              ? [r.home_score, r.away_score]
              : null,
          points: r.points,
          isMe: r.is_me,
        })),
      )
      setHasStarted(data[0]?.has_started ?? false)
    }
    setLoaded(true)
    setLoading(false)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-rule">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bone"
      >
        <Users className="size-4 text-sepia" />
        <span className="flex-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">
          palpites da galera
        </span>
        {loaded && (
          <span className="font-mono text-[13px] text-sepia">{rows.length}</span>
        )}
        <ChevronDown
          className={cn(
            'size-4 text-sepia transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t border-rule">
          {loading ? (
            <p className="px-3 py-4 text-center text-[13px] text-sepia">carregando…</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-sepia">
              ninguém palpitou ainda.
            </p>
          ) : (
            <>
              {!hasStarted && (
                <p className="flex items-center justify-center gap-1.5 border-b border-rule bg-bone/60 px-3 py-2 text-center text-[12px] text-sepia">
                  <Lock className="size-3" /> os placares aparecem quando a bola rolar
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
                  <PersonRow
                    key={g.userId}
                    g={g}
                    hasStarted={hasStarted}
                    actual={actual}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
