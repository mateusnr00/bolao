'use client'

import { Check, ChevronDown, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BottomNav, Eyebrow, ExactDots, LiveBadge, Rule, TopNav } from '@/components/we26'
import { LiveRefresher } from '@/components/live-refresher'
import { DONKEY_SRC } from '@/lib/brand'
import { useAllLive } from '@/lib/live-store'
import type { LiveMatchGuesses } from '@/lib/queries/rankings'
import { calcPredictionPoints } from '@/lib/scoring'
import { cn } from '@/lib/utils'

export interface RankRow {
  position: number
  userId: string
  name: string
  avatarUrl: string | null
  points: number
  predictionsMade: number
  exactScores: number
  isMe: boolean
}

export interface RankingData {
  poolName: string
  memberCount: number
  rows: RankRow[] // ranking geral (já existente)
  stages: Record<string, RankRow[]> // ranking por fase do mata-mata
  liveMatches: LiveMatchGuesses[]
}

type Tab =
  | 'geral'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'final'

interface ComputedRow extends RankRow {
  livePoints: number // pontos provisórios (jogos ao vivo)
  total: number // persistido + provisório
}

function medalColor(pos: number) {
  if (pos === 1) return 'text-trophy'
  if (pos === 2) return 'text-sepia'
  if (pos === 3) return 'text-trophy-deep'
  return 'text-sepia'
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

// soma os pontos provisórios de cada usuário a partir dos jogos ao vivo.
// usa o placar do front (mais fresco) e cai pro placar do banco se ele piscar.
function computeLiveDelta(
  liveMatches: LiveMatchGuesses[],
  liveByPair: Map<string, { homeCode: string; homeGoals: number; awayGoals: number }>,
): Map<string, number> {
  const delta = new Map<string, number>()
  for (const m of liveMatches) {
    const front = liveByPair.get(pairKey(m.homeCode, m.awayCode))
    const actual: [number, number] | null = front
      ? front.homeCode === m.homeCode
        ? [front.homeGoals, front.awayGoals]
        : [front.awayGoals, front.homeGoals]
      : m.dbScore
    if (!actual) continue
    for (const g of m.guesses) {
      const pts = calcPredictionPoints(g.guess, actual)
      delta.set(g.userId, (delta.get(g.userId) ?? 0) + pts)
    }
  }
  return delta
}

const TAB_OPTIONS: { key: Tab; label: string }[] = [
  { key: 'geral', label: '🏆 ranking geral' },
  { key: 'round_of_32', label: '32-avos de final' },
  { key: 'round_of_16', label: 'oitavas de final' },
  { key: 'quarter_final', label: 'quartas de final' },
  { key: 'semi_final', label: 'semifinal' },
  { key: 'final', label: 'final' },
]

// dropdown no mesmo estilo do seletor de rodada dos palpites
function RankTabSelector({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = TAB_OPTIONS.find((o) => o.key === tab) ?? TAB_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-rule-dark bg-paper px-3.5 py-2.5 text-left transition-colors hover:bg-bone"
      >
        <Trophy className="size-4 shrink-0 text-trophy-deep" />
        <span className="flex-1 text-[15px] font-medium text-ink">{selected.label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-sepia transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-lg border border-rule-dark bg-paper shadow-lg">
          <ul className="py-1">
            {TAB_OPTIONS.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(o.key)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[15px] transition-colors hover:bg-bone',
                    o.key === tab ? 'font-semibold text-trophy-deep' : 'text-ink',
                  )}
                >
                  <span>{o.label}</span>
                  {o.key === tab && <Check className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function RankingScreen({ data }: { data: RankingData }) {
  const { liveMatches } = data
  const [tab, setTab] = useState<Tab>('geral')

  // placar ao vivo do front (re-renderiza sozinho a cada atualização)
  const liveEntries = useAllLive()
  const liveByPair = new Map(
    liveEntries.map((e) => [pairKey(e.homeCode, e.awayCode), e]),
  )

  // geral conta tudo; cada fase conta só os jogos daquela fase
  const isGeral = tab === 'geral'
  const baseRows = isGeral ? data.rows : (data.stages[tab] ?? [])
  const liveForTab = isGeral
    ? liveMatches
    : liveMatches.filter((m) => m.stage === tab)

  const delta = computeLiveDelta(liveForTab, liveByPair)
  const liveAny = liveMatches.length > 0
  const liveOn = liveForTab.length > 0

  // a fase "começou" quando algum jogo dela já pontuou ou está rolando
  const phaseStarted =
    isGeral ||
    baseRows.some((r) => r.points > 0) ||
    liveForTab.length > 0
  const tabLabel = TAB_OPTIONS.find((t) => t.key === tab)?.label ?? ''

  // recompõe a tabela com os pontos provisórios e reordena
  const computed: ComputedRow[] = baseRows
    .map((r) => {
      const livePoints = delta.get(r.userId) ?? 0
      return { ...r, livePoints, total: r.points + livePoints }
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.exactScores - a.exactScores ||
        b.predictionsMade - a.predictionsMade,
    )
    .map((r, i) => ({ ...r, position: i + 1 }))

  const me = computed.find((r) => r.isMe)
  const leader = computed[0]?.total ?? 0
  // lanterninha: último colocado — só com mais de um membro E alguém já pontuou
  const lastUserId =
    computed.length > 1 && leader > 0
      ? computed[computed.length - 1].userId
      : null

  const showEmptyPhase = !isGeral && !phaseStarted

  return (
    <div className="flex min-h-full flex-col bg-paper">
      {liveAny && <LiveRefresher />}
      <TopNav active="ranking" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">ranking</h1>
                {liveOn && <LiveBadge />}
              </div>
              <p className="text-[13px] text-sepia">
                {data.poolName} · {data.memberCount}{' '}
                {data.memberCount === 1 ? 'membro' : 'membros'}
              </p>
            </div>
            <Link
              href="/vergonha"
              className="shrink-0 text-[13px] font-medium text-phase-semi transition-colors hover:text-ink"
            >
              hall da vergonha 🫏
            </Link>
          </section>

          {/* seletor geral × mata-mata (mesmo estilo do seletor de rodada) */}
          <RankTabSelector tab={tab} onSelect={setTab} />

          {!isGeral && (
            <p className="text-center text-[12px] text-sepia">
              ranking só dos jogos da fase · {tabLabel}
            </p>
          )}

          {me && !showEmptyPhase && (
            <section className="grid grid-cols-3 gap-3 rounded-lg border border-rule bg-bone/50 p-4">
              <div>
                <Eyebrow>posição</Eyebrow>
                <p className="display text-3xl text-ink">{me.position}º</p>
              </div>
              <div>
                <Eyebrow>{isGeral ? 'pontos' : 'pts na fase'}</Eyebrow>
                <p className="display text-3xl text-ink tabular">
                  {me.total}
                  {me.livePoints > 0 && (
                    <span className="ml-1.5 align-middle text-base font-semibold text-grass">
                      +{me.livePoints}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Eyebrow>atrás do 1º</Eyebrow>
                <p className="display text-3xl text-trophy-deep tabular">
                  {leader - me.total}
                </p>
              </div>
            </section>
          )}

          {liveOn && (
            <p className="flex items-center justify-center gap-1.5 rounded-md bg-phase-semi/5 px-3 py-1.5 text-center text-[12px] font-medium text-phase-semi">
              <span className="size-1.5 animate-pulse rounded-full bg-phase-semi" />
              pontuação provisória · ao vivo (atualiza sozinho)
            </p>
          )}

          <Rule />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Eyebrow>classificação</Eyebrow>
              <Eyebrow className="text-[10px]">pts</Eyebrow>
            </div>
            {showEmptyPhase ? (
              <p className="py-10 text-center text-[14px] text-sepia">
                a fase de {tabLabel} ainda não começou. todo mundo zerado até a
                bola rolar no primeiro jogo dessa fase.
              </p>
            ) : computed.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-sepia">
                ninguém pontuou ainda. os pontos aparecem quando os jogos terminam.
              </p>
            ) : (
              <ul className="-mx-2">
                {computed.map((r) => (
                  <li key={r.userId}>
                    <Link
                      href={`/membro/${r.userId}`}
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
                    <Avatar
                      className={cn(
                        'size-11 shrink-0 md:size-14',
                        r.position === 1 &&
                          'ring-2 ring-trophy ring-offset-2 ring-offset-paper',
                      )}
                    >
                      {r.userId === lastUserId ? (
                        <AvatarImage src={DONKEY_SRC} alt="lanterninha" />
                      ) : (
                        r.avatarUrl && <AvatarImage src={r.avatarUrl} alt="" />
                      )}
                      <AvatarFallback
                        className={cn(
                          'text-[13px] font-semibold md:text-base',
                          r.isMe ? 'bg-trophy text-ink' : 'bg-bone text-sepia',
                        )}
                      >
                        {initials(r.name)}
                      </AvatarFallback>
                    </Avatar>
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
                    {r.livePoints > 0 && (
                      <span className="flex items-center gap-1 font-mono text-[12px] tabular font-medium text-grass">
                        <span className="size-1.5 animate-pulse rounded-full bg-phase-semi" />
                        +{r.livePoints}
                      </span>
                    )}
                    <span className="w-14 text-right font-mono text-sm tabular font-medium text-ink">
                      {r.total}
                    </span>
                    <span className="w-4 text-trophy">{r.isMe ? '←' : ''}</span>
                    </Link>
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
