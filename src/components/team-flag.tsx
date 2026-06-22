'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Flag } from '@/components/we26'
import type { FormMatch } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'

function outcomeMeta(o: FormMatch['outcome']) {
  if (o === 'W') return { label: 'V', cls: 'bg-grass text-paper' }
  if (o === 'L') return { label: 'D', cls: 'bg-phase-semi text-paper' }
  return { label: 'E', cls: 'bg-rule-dark text-paper' }
}

/** Bandeira clicável: abre um popover com os últimos jogos da seleção (V/E/D
 *  + placar vs adversário). Usada na lista de palpites e no detalhe do jogo. */
export function TeamFlag({
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
