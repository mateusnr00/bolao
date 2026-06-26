import { ChevronLeft } from 'lucide-react'
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'trophy' | 'burro'
}) {
  return (
    <div className="rounded-lg border border-rule bg-bone/40 p-3">
      <Eyebrow>{label}</Eyebrow>
      <p
        className={cn(
          'display text-2xl tabular',
          accent === 'trophy' && 'text-trophy-deep',
          accent === 'burro' && 'text-phase-semi',
          !accent && 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function MemberScreen({
  member,
  poolName,
  isLanterna,
}: {
  member: MemberStat
  poolName: string
  isLanterna: boolean
}) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="ranking" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-7">
          <Link
            href="/ranking"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-sepia transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" /> ranking
          </Link>

          {/* cabeçalho do membro */}
          <section className="flex items-center gap-4">
            <Avatar
              className={cn(
                'size-20 shrink-0',
                member.position === 1 && 'ring-2 ring-trophy ring-offset-2 ring-offset-paper',
              )}
            >
              {isLanterna ? (
                <AvatarImage src={DONKEY_SRC} alt="lanterninha" />
              ) : (
                member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />
              )}
              <AvatarFallback className="bg-bone text-xl font-semibold text-sepia">
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-semibold text-ink">{member.name}</h1>
              <p className="truncate font-mono text-[12px] text-sepia">@{member.username}</p>
              <p className="mt-0.5 text-[13px] text-sepia">
                {member.position}º em {poolName}
              </p>
            </div>
          </section>

          {/* troféus */}
          {member.trophies.length > 0 && (
            <section className="space-y-2.5">
              <Eyebrow>troféus</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {member.trophies.map((t) => (
                  <span
                    key={t.key}
                    title={t.desc}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-bone/50 px-3 py-1.5 text-[13px] font-medium text-ink"
                  >
                    <span className="text-[15px]">{t.emoji}</span>
                    {t.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* estatísticas */}
          <section className="space-y-2.5">
            <Eyebrow>números</Eyebrow>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="pontos" value={member.points} accent="trophy" />
              <Stat label="posição" value={`${member.position}º`} />
              <Stat label="média/jogo" value={member.average.toFixed(1)} />
              <Stat label="placares exatos" value={member.exactScores} />
              <Stat label="jogos zerados 🫏" value={member.zeroCount} accent="burro" />
            </div>
            <p className="text-[12px] text-sepia">
              {member.predictionsMade} palpites em jogos já encerrados.
            </p>
          </section>

          <Rule />

          {/* melhor palpite */}
          <section className="space-y-2.5">
            <Eyebrow>melhor palpite</Eyebrow>
            {member.best ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-rule p-4">
                <div className="space-y-0.5">
                  <p className="font-mono text-[15px] font-semibold text-ink">
                    {member.best.homeCode} {member.best.actual[0]}×{member.best.actual[1]}{' '}
                    {member.best.awayCode}
                  </p>
                  <p className="text-[12px] text-sepia">
                    cravou{' '}
                    <span className="font-mono text-ink">
                      {member.best.guess[0]}×{member.best.guess[1]}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 font-mono text-lg tabular font-semibold text-trophy-deep">
                  +{member.best.points}
                </span>
              </div>
            ) : (
              <p className="text-[13px] text-sepia">ainda sem pontos em jogos encerrados.</p>
            )}
          </section>
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
