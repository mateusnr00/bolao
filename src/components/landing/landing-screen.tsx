import Link from 'next/link'

import { Grid48 } from '@/components/grid-48'
import { buttonVariants } from '@/components/ui/button'
import { Eyebrow, Logo, Rule } from '@/components/we26'
import { cn } from '@/lib/utils'

const STEPS = [
  { n: '01', title: 'crie ou entre num bolão', body: 'monte o seu e chame a galera, ou entre com o código de 8 letras.' },
  { n: '02', title: 'palpite os 48 jogos', body: 'um placar pra cada partida. trava no apito inicial — sem moleza.' },
  { n: '03', title: 'suba no ranking', body: 'placar exato vale mais. acompanhe a classificação a cada jogo.' },
]

const PHASES = [
  { label: 'grupos', color: 'bg-phase-group' },
  { label: '32-avos', color: 'bg-phase-32' },
  { label: 'oitavas', color: 'bg-phase-16' },
  { label: 'quartas', color: 'bg-phase-quarter' },
  { label: 'semi', color: 'bg-phase-semi' },
  { label: 'final', color: 'bg-phase-final' },
]

export function LandingScreen() {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4">
          <Logo />
          <Link
            href="/login"
            className="text-[13px] font-medium text-sepia transition-colors hover:text-ink"
          >
            entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-16 pt-10">
        {/* hero */}
        <section className="space-y-6">
          <Eyebrow>copa do mundo · 2026</Eyebrow>
          <h1 className="display text-[clamp(40px,12vw,72px)] uppercase text-ink">
            o bolão da copa entre amigos
          </h1>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-sepia">
            48 seleções, um placar pra cada jogo, e a única regra que importa:
            acertar mais que os seus amigos.
          </p>

          <div className="flex items-center justify-center py-2">
            <Grid48
              cell={22}
              gap={4}
              active={33}
              exact={[10, 18, 27, 40]}
              aria-label="grid de 48 jogos"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={cn(buttonVariants(), 'h-11 flex-1 rounded-md text-[15px] font-medium')}
            >
              criar bolão
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-11 flex-1 rounded-md border-rule-dark text-[15px] font-medium',
              )}
            >
              já tenho conta
            </Link>
          </div>
        </section>

        <div className="py-10">
          <Rule />
        </div>

        {/* como funciona */}
        <section className="space-y-6">
          <Eyebrow>como funciona</Eyebrow>
          <ol className="space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="display text-3xl leading-none text-trophy">{s.n}</span>
                <div className="space-y-1">
                  <p className="text-[16px] font-semibold text-ink">{s.title}</p>
                  <p className="max-w-[44ch] text-[14px] leading-relaxed text-sepia">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="py-10">
          <Rule />
        </div>

        {/* fases */}
        <section className="space-y-4">
          <Eyebrow>do grupo à final</Eyebrow>
          <ul className="flex flex-wrap gap-x-5 gap-y-3">
            {PHASES.map((p) => (
              <li key={p.label} className="flex items-center gap-2 text-[13px] text-ink">
                <span className={cn('size-3 rounded-full', p.color)} />
                {p.label}
              </li>
            ))}
          </ul>
        </section>

        <div className="py-10">
          <Rule />
        </div>

        {/* cta final */}
        <section className="space-y-5 text-center">
          <h2 className="display text-[clamp(28px,8vw,44px)] uppercase text-ink">
            bora começar?
          </h2>
          <Link
            href="/signup"
            className={cn(
              buttonVariants(),
              'mx-auto h-11 w-full max-w-[280px] rounded-md text-[15px] font-medium',
            )}
          >
            criar meu bolão
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-4 py-5 text-[12px] text-sepia">
          <Logo />
          <span>palpites entre amigos · copa 2026</span>
        </div>
      </footer>
    </div>
  )
}
