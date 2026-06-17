import { BottomNav, Eyebrow, Flag, TopNav } from '@/components/we26'
import type { TopScorer } from '@/lib/queries/goals'
import { cn } from '@/lib/utils'

function medalColor(pos: number) {
  if (pos === 1) return 'text-trophy'
  if (pos === 2) return 'text-sepia'
  if (pos === 3) return 'text-trophy-deep'
  return 'text-sepia'
}

export function ArtilheirosScreen({ scorers }: { scorers: TopScorer[] }) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="artilheiros" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">
              artilheiros
            </h1>
            <p className="text-[13px] text-sepia">
              os maiores goleadores da Copa 2026.
            </p>
          </section>

          <div className="flex items-center justify-between">
            <Eyebrow>jogador</Eyebrow>
            <Eyebrow className="text-[10px]">gols</Eyebrow>
          </div>

          {scorers.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-sepia">
              nenhum gol lançado ainda.
            </p>
          ) : (
            <ul className="-mx-2">
              {scorers.map((s, i) => (
                <li
                  key={`${s.scorer}-${s.teamCode}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bone"
                >
                  <span
                    className={cn(
                      'w-6 font-mono text-sm tabular font-medium',
                      medalColor(i + 1),
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Flag
                    src={s.teamFlag ?? undefined}
                    className="size-7 rounded-full object-cover ring-1 ring-rule"
                  />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                    {s.scorer}
                  </span>
                  <span className="font-mono text-[12px] text-sepia">{s.teamCode}</span>
                  <span className="w-14 text-right font-mono text-sm tabular font-semibold text-ink">
                    {s.goals} {s.goals === 1 ? 'gol' : 'gols'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
