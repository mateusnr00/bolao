import { BottomNav, Eyebrow, TopNav } from '@/components/we26'

export const metadata = { title: 'Tabela dos grupos · Copa 2026' }

// Copa do Mundo 2026: 12 grupos (A–L). Widgets de classificação do SofaScore
// (torneio 3954 / temporada 58210) — embed estático por grupo.
const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

function widgetSrc(group: string) {
  const g = encodeURIComponent(`Group ${group}`)
  return (
    `https://widgets.sofascore.com/pt-BR/embed/tournament/3954/season/58210/standings/${g}` +
    `?widgetTitle=${g}&showCompetitionLogo=true`
  )
}

export default function GruposPage() {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">
              tabela dos grupos
            </h1>
            <p className="text-[13px] text-sepia">
              classificação ao vivo da Copa do Mundo 2026.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">
            {GROUPS.map((g) => (
              <div key={g} className="space-y-1.5">
                <Eyebrow>grupo {g}</Eyebrow>
                <iframe
                  title={`Classificação do Grupo ${g}`}
                  src={widgetSrc(g)}
                  className="h-[431px] w-full max-w-[768px] rounded-lg border border-rule"
                  scrolling="no"
                />
              </div>
            ))}
          </section>

          <p className="text-[12px] text-sepia">
            Classificação fornecida por{' '}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://www.sofascore.com/pt/football/tournament/world/world-championship-gr-a/16#id:58210"
              className="underline transition-colors hover:text-ink"
            >
              Sofascore
            </a>
            .
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
