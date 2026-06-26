import { BottomNav, TopNav } from '@/components/we26'

export const metadata = { title: 'Tabela dos grupos · Copa 2026' }

// Copa do Mundo 2026: 12 grupos (A–L). Cada grupo é um "tournament" próprio
// no SofaScore (ids abaixo), todos na temporada 58210.
const SEASON = 58210
const GROUPS: { letter: string; tournament: number }[] = [
  { letter: 'A', tournament: 3954 },
  { letter: 'B', tournament: 3955 },
  { letter: 'C', tournament: 3956 },
  { letter: 'D', tournament: 3957 },
  { letter: 'E', tournament: 3958 },
  { letter: 'F', tournament: 3959 },
  { letter: 'G', tournament: 3960 },
  { letter: 'H', tournament: 3961 },
  { letter: 'I', tournament: 139403 },
  { letter: 'J', tournament: 139404 },
  { letter: 'K', tournament: 139405 },
  { letter: 'L', tournament: 139406 },
]

function widgetSrc(tournament: number, letter: string) {
  const g = encodeURIComponent(`Group ${letter}`)
  return (
    `https://widgets.sofascore.com/pt-BR/embed/tournament/${tournament}/season/${SEASON}/standings/${g}` +
    `?widgetTitle=${g}&showCompetitionLogo=true&theme=dark`
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

          <section className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
            {GROUPS.map((g) => (
              // caixa recortada: o widget tem 431px, mostramos só ~330px pra
              // esconder o divisor + o rodapé de propaganda do SofaScore.
              <div
                key={g.letter}
                className="h-[330px] w-full max-w-[768px] overflow-hidden rounded-lg border border-rule"
              >
                <iframe
                  title={`Classificação do Grupo ${g.letter}`}
                  src={widgetSrc(g.tournament, g.letter)}
                  className="block h-[431px] w-full"
                  scrolling="no"
                />
              </div>
            ))}
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
