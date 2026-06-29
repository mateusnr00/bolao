import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BottomNav, Eyebrow, Flag, Rule, TopNav } from '@/components/we26'
import { DONKEY_SRC } from '@/lib/brand'
import type { BestPalpite, MemberStat } from '@/lib/queries/stats'
import { cn } from '@/lib/utils'

function CravadaCard({ b }: { b: BestPalpite }) {
  return (
    <li className="rounded-xl border border-trophy/30 bg-trophy/5 p-3.5">
      <div className="flex items-center justify-center gap-3">
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate font-mono text-[15px] font-semibold text-ink">
            {b.homeCode}
          </span>
          <Flag src={b.homeFlag ?? undefined} className="h-5 w-7" />
        </span>
        <span className="shrink-0 font-mono text-[22px] tabular font-bold text-ink">
          {b.actual[0]}
          <span className="px-1.5 text-sepia">×</span>
          {b.actual[1]}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Flag src={b.awayFlag ?? undefined} className="h-5 w-7" />
          <span className="truncate font-mono text-[15px] font-semibold text-ink">
            {b.awayCode}
          </span>
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-trophy-deep">
        🎯 cravada · +{b.points} pts
      </p>
    </li>
  )
}

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

          {/* cravadas (placares exatos) */}
          <section className="space-y-2.5">
            <Eyebrow>
              cravadas 🎯 {member.cravadas.length > 0 && `(${member.cravadas.length})`}
            </Eyebrow>
            {member.cravadas.length > 0 ? (
              <ul className="space-y-2.5">
                {member.cravadas.map((b, i) => (
                  <CravadaCard key={i} b={b} />
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-sepia">ainda não cravou nenhum placar.</p>
            )}
          </section>
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
