'use client'

import { ChevronDown, Lock, Users } from 'lucide-react'
import { useState } from 'react'

import { ReactionBar } from '@/components/reactions/reaction-bar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DONKEY_SRC } from '@/lib/brand'
import { isHiddenMember } from '@/lib/hidden-members'
import { useLivePair } from '@/lib/live-store'
import { fetchMatchReactions, type ReactionState } from '@/lib/reactions'
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

// pontos atuais (provisórios ao vivo, ou os persistidos)
function effectivePoints(g: Row, actual: [number, number] | null): number {
  if (actual != null && g.guess != null) return calcPredictionPoints(g.guess, actual)
  return g.points ?? 0
}

// TODOS que zeraram (0 pontos) levam o burrinho — pode ser 2+ no mesmo jogo.
// Só depois do apito (senão antes do jogo todo mundo estaria com 0).
function donkeyUserIds(
  rows: Row[],
  actual: [number, number] | null,
  hasStarted: boolean,
): Set<string> {
  const set = new Set<string>()
  if (!hasStarted) return set
  for (const g of rows) {
    if (effectivePoints(g, actual) === 0) set.add(g.userId)
  }
  return set
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function PersonRow({
  g,
  matchId,
  hasStarted,
  actual,
  isLast,
  reactions,
}: {
  g: Row
  matchId: string
  hasStarted: boolean
  actual: [number, number] | null
  isLast: boolean
  reactions: ReactionState
}) {
  // ao vivo: pontos provisórios calculados sobre o placar atual
  const provisional = actual != null && g.guess != null
  const pts = provisional ? calcPredictionPoints(g.guess!, actual) : g.points

  return (
    <li className={cn('px-3 py-2.5', g.isMe && 'bg-trophy/8')}>
      <div className="flex items-center gap-3">
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
        <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{g.name}</span>

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
      </div>

      {hasStarted && g.guess && (
        <div className="mt-1.5 pl-[52px] md:pl-[60px]">
          <ReactionBar
            matchId={matchId}
            targetUserId={g.userId}
            canReact={!g.isMe}
            initial={reactions}
          />
        </div>
      )}
    </li>
  )
}

export function GaleraInline({
  matchId,
  homeCode,
  awayCode,
  isLive = false,
  dbScore = null,
}: {
  matchId: string
  homeCode: string
  awayCode: string
  // jogo ao vivo segundo o banco + placar já orientado (casa/fora deste jogo)
  isLive?: boolean
  dbScore?: [number, number] | null
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [reactions, setReactions] = useState<Map<string, ReactionState>>(new Map())

  // placar atual pros pontos provisórios: prioriza o front (/api/live, mais
  // fresco); se ele der um soluço e voltar vazio, cai pro placar do banco
  // enquanto o jogo está ao vivo — assim a pontuação não zera no meio do jogo.
  const live = useLivePair(homeCode, awayCode)
  const actual: [number, number] | null = live
    ? live.homeCode === homeCode
      ? [live.homeGoals, live.awayGoals]
      : [live.awayGoals, live.homeGoals]
    : isLive && dbScore
      ? dbScore
      : null

  // todos que zeraram (0 pts) ganham o burrinho
  const donkeySet = donkeyUserIds(rows, actual, hasStarted)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (!next || loaded || loading) return

    setLoading(true)
    const supabase = createClient()
    const [predRes, rmap] = await Promise.all([
      supabase.rpc('match_predictions', { p_match_id: matchId }),
      fetchMatchReactions(matchId),
    ])
    const { data, error } = predRes
    if (!error && data) {
      setRows(
        data
          .filter((r) => !isHiddenMember({ userId: r.user_id, username: r.username }))
          .map((r) => ({
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
    setReactions(rmap)
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
                    matchId={matchId}
                    hasStarted={hasStarted}
                    actual={actual}
                    isLast={donkeySet.has(g.userId)}
                    reactions={reactions.get(g.userId) ?? {}}
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
