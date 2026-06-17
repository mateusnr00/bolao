'use client'

import { ChevronDown, Lock, Users } from 'lucide-react'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Row {
  userId: string
  name: string
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

function PersonRow({ g, hasStarted }: { g: Row; hasStarted: boolean }) {
  return (
    <li className={cn('flex items-center gap-3 px-3 py-2.5', g.isMe && 'bg-trophy/8')}>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          g.isMe ? 'bg-trophy text-ink' : 'bg-bone text-sepia',
        )}
      >
        {initials(g.name)}
      </span>
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
          {g.points != null && (
            <span className="w-12 text-right font-mono tabular text-[13px] font-medium text-trophy-deep">
              {g.points} pt
            </span>
          )}
        </>
      ) : (
        <Lock className="size-3.5 text-rule-dark" aria-label="oculto" />
      )}
    </li>
  )
}

export function GaleraInline({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [rows, setRows] = useState<Row[]>([])

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
              <ul className="divide-y divide-rule">
                {rows.map((g) => (
                  <PersonRow key={g.userId} g={g} hasStarted={hasStarted} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
