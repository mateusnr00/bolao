import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'
import { DONKEY_SRC } from '@/lib/brand'
import type { MemberStat } from '@/lib/queries/stats'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')
  ).toUpperCase()
}

export function HallVergonhaScreen({
  rows,
  poolName,
}: {
  rows: MemberStat[]
  poolName: string
}) {
  const champ = rows[0]

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="ranking" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">
              hall da vergonha 🫏
            </h1>
            <p className="text-[13px] text-sepia">
              {poolName} · as maiores burradas da temporada
            </p>
          </section>

          {champ && champ.burrinhoCount > 0 && (
            <section className="flex items-center gap-4 rounded-lg border border-phase-semi/40 bg-phase-semi/5 p-4">
              <Avatar className="size-16 shrink-0 ring-2 ring-phase-semi ring-offset-2 ring-offset-paper">
                <AvatarImage src={DONKEY_SRC} alt="" />
                <AvatarFallback className="bg-bone text-lg font-semibold text-sepia">
                  {initials(champ.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Eyebrow className="text-phase-semi">rei do burrinho 🫏</Eyebrow>
                <p className="truncate text-[18px] font-semibold text-ink">{champ.name}</p>
                <p className="text-[13px] text-sepia">
                  zerou {champ.zeroCount} {champ.zeroCount === 1 ? 'jogo' : 'jogos'}
                </p>
              </div>
            </section>
          )}

          <Rule />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Eyebrow>ranking da vergonha</Eyebrow>
              <Eyebrow className="text-[10px]">🫏 jogos zerados</Eyebrow>
            </div>
            <ul className="-mx-2">
              {rows.map((m, i) => (
                <li key={m.userId}>
                  <Link
                    href={`/membro/${m.userId}`}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bone',
                    )}
                  >
                    <span className="w-6 font-mono text-sm tabular font-medium text-sepia">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Avatar className="size-9 shrink-0">
                      {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                      <AvatarFallback className="bg-bone text-[11px] font-semibold text-sepia">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{m.name}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[13px] tabular font-medium text-phase-semi">
                      🫏 {m.zeroCount} {m.zeroCount === 1 ? 'zero' : 'zeros'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {rows.length === 0 && (
              <p className="py-10 text-center text-[14px] text-sepia">
                ninguém vacilou ainda. mas é questão de tempo.
              </p>
            )}
          </section>
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
