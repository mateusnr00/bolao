import { Grid48 } from '@/components/grid-48'
import { Logo } from '@/components/we26'

const PHASES = [
  { label: 'grupos', color: 'bg-phase-group' },
  { label: 'oitavas', color: 'bg-phase-16' },
  { label: 'quartas', color: 'bg-phase-quarter' },
  { label: 'semi', color: 'bg-phase-semi' },
  { label: 'final', color: 'bg-phase-final' },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh bg-paper md:grid-cols-[1.1fr_1fr] lg:grid-cols-2">
      {/* painel de marca — só desktop */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper md:flex">
        <div className="flex items-center justify-between">
          <Logo className="h-9" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
            copa · 2026
          </span>
        </div>

        <div className="space-y-8">
          <h1 className="display text-[clamp(40px,5vw,64px)] uppercase">
            o bolão da copa entre amigos
          </h1>
          <p className="max-w-[40ch] text-[15px] leading-relaxed text-paper/65">
            48 seleções, um placar pra cada jogo, e a única regra que importa:
            acertar mais que os seus amigos.
          </p>
          <Grid48 cell={20} gap={4} active={33} exact={[10, 18, 27, 40]} />
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {PHASES.map((p) => (
            <li
              key={p.label}
              className="flex items-center gap-2 text-[12px] text-paper/70"
            >
              <span className={`size-2.5 rounded-full ${p.color}`} />
              {p.label}
            </li>
          ))}
        </ul>
      </aside>

      {/* formulário */}
      <main className="flex flex-col items-center justify-center px-4 py-10">
        {/* cabeçalho da marca — só mobile */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center md:hidden">
          <Logo className="h-12" />
          <p className="text-[13px] text-sepia">
            palpites entre amigos · copa 2026
          </p>
        </div>

        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  )
}
