import { ArrowRight, Trophy } from 'lucide-react'
import Link from 'next/link'

import {
  type GameCardData,
  MatchesGrid,
} from '@/components/landing/matches-grid'
import { buttonVariants } from '@/components/ui/button'
import { Emblem, Eyebrow, Flag, Logo, PhaseBadge } from '@/components/we26'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    n: '01',
    title: 'crie ou entre num bolão',
    body: 'monte o seu e chame a galera, ou entre com o código de 8 caracteres.',
  },
  {
    n: '02',
    title: 'palpite todos os jogos',
    body: 'um placar pra cada partida. trava no apito inicial, sem moleza.',
  },
  {
    n: '03',
    title: 'suba no ranking',
    body: 'placar exato vale mais. acompanhe a classificação a cada jogo.',
  },
]

const PHASES = [
  { label: 'grupos', color: 'bg-phase-group' },
  { label: '32-avos', color: 'bg-phase-32' },
  { label: 'oitavas', color: 'bg-phase-16' },
  { label: 'quartas', color: 'bg-phase-quarter' },
  { label: 'semi', color: 'bg-phase-semi' },
  { label: 'final', color: 'bg-phase-final' },
]

const STATS = [
  { n: '48', l: 'seleções' },
  { n: '104', l: 'jogos' },
  { n: '16', l: 'estádios' },
  { n: '1', l: 'troféu' },
]

function HeroTeam({
  iso,
  code,
  align,
}: {
  iso: string
  code: string
  align: 'start' | 'end'
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-2',
        align === 'end' ? 'items-end' : 'items-start',
      )}
    >
      <Flag iso={iso} className="h-9 w-12 rounded-sm object-cover ring-1 ring-rule" />
      <span className="font-mono text-base font-semibold text-ink">{code}</span>
    </div>
  )
}

/* placar de exemplo — mostra na prática o que o produto faz */
function ScoreboardCard() {
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-rule-dark bg-paper p-6 shadow-[0_2px_24px_-12px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between">
        <PhaseBadge phase="group" label="Grupo C" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-sepia">
          encerrado
        </span>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <HeroTeam iso="br" code="BRA" align="start" />
        <p className="shrink-0 font-mono text-[40px] leading-none tabular font-semibold text-ink">
          2<span className="px-1.5 text-sepia">×</span>1
        </p>
        <HeroTeam iso="gb-sct" code="SCO" align="end" />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-rule pt-4 text-[12px]">
        <span className="text-sepia">
          seu palpite <span className="font-mono text-ink">2 a 1</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono font-semibold text-trophy-deep">
          <span className="size-1.5 rounded-full bg-grass" />
          +25 pts · exato
        </span>
      </div>
    </div>
  )
}

export function LandingScreen({ games = [] }: { games?: GameCardData[] }) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-medium text-sepia transition-colors hover:text-ink"
            >
              entrar
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants(),
                'h-9 rounded-md px-4 text-[13px] font-medium',
              )}
            >
              criar bolão
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="border-b border-rule">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-24">
            <div className="space-y-7">
              <Eyebrow>copa do mundo · 2026 · eua · méxico · canadá</Eyebrow>
              <h1 className="display text-[clamp(44px,8.5vw,80px)] uppercase text-ink">
                o bolão da copa entre amigos
              </h1>
              <p className="max-w-[48ch] text-[16px] leading-relaxed text-sepia">
                48 seleções, um placar pra cada jogo, e a única regra que importa:
                acertar mais que os seus amigos.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants(),
                    'group h-12 gap-2 rounded-md px-7 text-[15px] font-medium',
                  )}
                >
                  criar meu bolão
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-12 rounded-md border-rule-dark px-7 text-[15px] font-medium',
                  )}
                >
                  já tenho conta
                </Link>
              </div>

              <dl className="grid max-w-md grid-cols-4 gap-2 border-t border-rule pt-6">
                {STATS.map((s) => (
                  <div key={s.l}>
                    <dt className="display text-3xl text-ink tabular">{s.n}</dt>
                    <dd className="text-[12px] uppercase tracking-wider text-sepia">
                      {s.l}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* visual: emblema oficial + placar de exemplo */}
            <div className="flex flex-col items-center gap-6 lg:items-end">
              <Emblem imgClassName="h-28 w-auto sm:h-36" />
              <ScoreboardCard />
            </div>
          </div>
        </section>

        {/* jogos da copa — placar real + ao vivo */}
        <MatchesGrid games={games} />

        {/* como funciona */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Eyebrow>como funciona</Eyebrow>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-rule bg-paper p-6 transition-colors hover:border-rule-dark"
              >
                <span className="display text-4xl leading-none text-trophy">{s.n}</span>
                <p className="mt-4 text-[16px] font-semibold text-ink">{s.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-sepia">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* fases */}
        <section className="border-y border-rule bg-bone/40">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <Eyebrow>do grupo à final</Eyebrow>
            <ul className="mt-4 flex flex-wrap gap-2">
              {PHASES.map((p) => (
                <li
                  key={p.label}
                  className="flex items-center gap-2 rounded-full border border-rule bg-paper px-3.5 py-1.5 text-[13px] font-medium text-ink"
                >
                  <span className={cn('size-2.5 rounded-full', p.color)} />
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* cta final — pôster invertido (alto contraste nos dois modos) */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-ink px-8 py-16 text-paper sm:px-14">
            <div className="flex items-center justify-between gap-8">
              <div className="max-w-xl space-y-5">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
                  <Trophy className="size-4" /> trophy edition
                </span>
                <h2 className="display text-[clamp(32px,7vw,56px)] uppercase leading-[0.95]">
                  bora começar?
                </h2>
                <p className="max-w-[42ch] text-[15px] leading-relaxed text-paper/65">
                  crie seu bolão em segundos, mande o código pra galera e que
                  vença o melhor palpiteiro.
                </p>
                <Link
                  href="/signup"
                  className="group inline-flex h-12 items-center gap-2 rounded-md bg-paper px-8 text-[15px] font-semibold text-ink transition-colors hover:bg-paper/90"
                >
                  criar meu bolão
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <Emblem
                className="hidden shrink-0 lg:inline-flex"
                imgClassName="h-32 w-auto"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-[12px] text-sepia sm:px-6">
          <Logo />
          <span>palpites entre amigos · copa 2026</span>
        </div>
      </footer>
    </div>
  )
}
