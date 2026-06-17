'use client'

import { ChevronDown, Lock, Users } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { GaleraGuess } from '@/lib/queries/predictions'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function Row({ g, hasStarted }: { g: GaleraGuess; hasStarted: boolean }) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3 py-2.5',
        g.isMe && 'bg-trophy/8',
      )}
    >
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

export function PalpitesDaGalera({
  rows,
  hasStarted,
}: {
  rows: GaleraGuess[]
  hasStarted: boolean
}) {
  const [open, setOpen] = useState(false)

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
              <ul className="divide-y divide-rule">
                {rows.map((g) => (
                  <Row key={g.userId} g={g} hasStarted={hasStarted} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
