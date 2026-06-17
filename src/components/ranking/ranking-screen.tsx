import Link from 'next/link'

import { BottomNav, Eyebrow, ExactDots, Rule, TopNav } from '@/components/we26'
import { cn } from '@/lib/utils'

export interface RankRow {
  position: number
  name: string
  points: number
  predictionsMade: number
  exactScores: number
  isMe: boolean
}

export interface RankingData {
  poolName: string
  memberCount: number
  rows: RankRow[]
}

function medalColor(pos: number) {
  if (pos === 1) return 'text-trophy'
  if (pos === 2) return 'text-sepia'
  if (pos === 3) return 'text-trophy-deep'
  return 'text-sepia'
}

export function RankingScreen({ data }: { data: RankingData }) {
  const { rows } = data
  const me = rows.find((r) => r.isMe)
  const leader = rows[0]?.points ?? 0

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="ranking" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">ranking</h1>
              <p className="text-[13px] text-sepia">
                {data.poolName} · {data.memberCount}{' '}
                {data.memberCount === 1 ? 'membro' : 'membros'}
              </p>
            </div>
            <Link
              href="/artilheiros"
              className="shrink-0 text-[13px] font-medium text-trophy-deep transition-colors hover:text-ink"
            >
              artilheiros →
            </Link>
          </section>

          {me && (
            <section className="grid grid-cols-3 gap-3 rounded-lg border border-rule bg-bone/50 p-4">
              <div>
                <Eyebrow>posição</Eyebrow>
                <p className="display text-3xl text-ink">{me.position}º</p>
              </div>
              <div>
                <Eyebrow>pontos</Eyebrow>
                <p className="display text-3xl text-ink tabular">{me.points}</p>
              </div>
              <div>
                <Eyebrow>atrás do 1º</Eyebrow>
                <p className="display text-3xl text-trophy-deep tabular">
                  {leader - me.points}
                </p>
              </div>
            </section>
          )}

          <Rule />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Eyebrow>classificação</Eyebrow>
              <Eyebrow className="text-[10px]">pts</Eyebrow>
            </div>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-sepia">
                ninguém pontuou ainda. os pontos aparecem quando os jogos terminam.
              </p>
            ) : (
              <ul className="-mx-2">
                {rows.map((r) => (
                  <li
                    key={r.position}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bone',
                      r.isMe && 'bg-bone',
                    )}
                  >
                    <span
                      className={cn(
                        'w-6 font-mono text-sm tabular font-medium',
                        medalColor(r.position),
                      )}
                    >
                      {String(r.position).padStart(2, '0')}
                    </span>
                    <span
                      className={cn(
                        'flex-1 truncate text-[15px]',
                        r.isMe ? 'font-semibold text-ink' : 'text-ink',
                      )}
                    >
                      {r.isMe ? 'você' : r.name}
                    </span>
                    <span className="hidden items-center gap-2 sm:flex">
                      <ExactDots n={r.exactScores} />
                      <span className="w-16 text-right font-mono text-[12px] tabular text-sepia">
                        {r.predictionsMade} palpites
                      </span>
                    </span>
                    <span className="w-14 text-right font-mono text-sm tabular font-medium text-ink">
                      {r.points}
                    </span>
                    <span className="w-4 text-trophy">{r.isMe ? '←' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="pt-2 text-center text-[12px] text-sepia">
            placar exato vale mais. por isso os pontos não seguem só o número de acertos.
          </p>
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
