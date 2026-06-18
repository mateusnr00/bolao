'use client'

import { SmilePlus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { toggleReaction } from '@/components/reactions/actions'
import { REACTION_EMOJIS, type ReactionState } from '@/lib/reactions'
import { cn } from '@/lib/utils'

export function ReactionBar({
  matchId,
  targetUserId,
  canReact,
  initial,
}: {
  matchId: string
  targetUserId: string
  canReact: boolean
  initial: ReactionState
}) {
  const [state, setState] = useState<ReactionState>(initial)
  const [open, setOpen] = useState(false)
  const [, start] = useTransition()

  function flip(emoji: string) {
    setState((prev) => {
      const cur = prev[emoji] ?? { count: 0, mine: false }
      const mine = !cur.mine
      return {
        ...prev,
        [emoji]: { count: Math.max(0, cur.count + (mine ? 1 : -1)), mine },
      }
    })
  }

  function react(emoji: string) {
    if (!canReact) return
    setOpen(false)
    flip(emoji) // otimista
    start(async () => {
      const res = await toggleReaction({ matchId, targetUserId, emoji })
      if ('error' in res) {
        flip(emoji) // reverte
        toast.error(res.error)
      }
    })
  }

  const active = REACTION_EMOJIS.filter((e) => (state[e]?.count ?? 0) > 0)
  if (active.length === 0 && !canReact) return null

  return (
    <div className="flex flex-wrap items-center gap-1">
      {active.map((e) => (
        <button
          key={e}
          type="button"
          disabled={!canReact}
          onClick={() => react(e)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[12px] transition-colors',
            state[e]?.mine ? 'border-trophy bg-trophy/10' : 'border-rule',
            canReact && 'hover:bg-bone',
          )}
        >
          <span>{e}</span>
          <span className="tabular text-sepia">{state[e]?.count}</span>
        </button>
      ))}

      {canReact && (
        <div className="relative">
          <button
            type="button"
            aria-label="reagir"
            onClick={() => setOpen((o) => !o)}
            className="flex size-6 items-center justify-center rounded-full border border-rule text-sepia transition-colors hover:bg-bone"
          >
            <SmilePlus className="size-3.5" />
          </button>
          {open && (
            <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-full border border-rule bg-paper p-1 shadow-md">
              {REACTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => react(e)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-[16px] transition-colors hover:bg-bone',
                    state[e]?.mine && 'bg-trophy/10',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
