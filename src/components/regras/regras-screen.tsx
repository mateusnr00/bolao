import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'
import { cn } from '@/lib/utils'

const SCORING = [
  { label: 'placar exato', pts: 30, hint: 'erro 0' },
  { label: 'erro de 1 gol', pts: 22, hint: 'erro ponderado = 1' },
  { label: 'erro de 2', pts: 18, hint: 'erro ponderado = 2' },
  { label: 'erro de 3', pts: 15, hint: 'erro ponderado = 3' },
  { label: 'erro de 4', pts: 12, hint: 'erro ponderado = 4' },
  { label: 'erro de 5 ou mais', pts: 8, hint: 'erro ponderado >= 5' },
  { label: 'errou o resultado', pts: 0, hint: 'apostou no time/empate errado' },
]

// resultado real 3 × 0
const EXAMPLES = [
  { guess: '3 × 0', pts: 30, why: 'placar exato' },
  { guess: '4 × 0', pts: 22, why: 'errou só 1 gol do vencedor (cravou o 0 do perdedor)' },
  { guess: '5 × 0', pts: 18, why: 'errou 2 gols do vencedor, manteve o 0' },
  { guess: '4 × 1', pts: 15, why: 'errou 1 do vencedor + inventou 1 gol (conta dobrado)' },
  { guess: '3 × 1', pts: 18, why: 'cravou o vencedor, mas inventou 1 gol (dobra)' },
  { guess: '1 × 1', pts: 0, why: 'apostou empate, mas o jogo teve vencedor' },
]

function PtsTag({ pts }: { pts: number }) {
  return (
    <span
      className={cn(
        'shrink-0 font-mono text-sm tabular font-semibold',
        pts === 0 ? 'text-sepia' : 'text-trophy-deep',
      )}
    >
      {pts} pts
    </span>
  )
}

export function RegrasScreen() {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="regras" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-8">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">regras</h1>
            <p className="text-[13px] text-sepia">como funciona o bolão, do palpite à pontuação.</p>
          </section>

          {/* participação */}
          <section className="space-y-3">
            <Eyebrow>participação</Eyebrow>
            <ul className="space-y-2 text-[14px] leading-relaxed text-ink">
              <li>
                Você só palpita estando em um <strong>bolão</strong>. O mesmo palpite vale
                pra todos os bolões em que você está.
              </li>
              <li>
                Em cada jogo você crava um <strong>placar</strong> (ex.: 2 × 1), de 0 a 30
                gols por lado.
              </li>
            </ul>
          </section>

          <Rule />

          {/* trava e sigilo */}
          <section className="space-y-3">
            <Eyebrow>trava e sigilo</Eyebrow>
            <ul className="space-y-2 text-[14px] leading-relaxed text-ink">
              <li>
                O palpite pode ser editado <strong>até o apito inicial</strong>. Quando a
                bola rola, trava — não dá mais pra mudar.
              </li>
              <li>
                <strong>Anti-cola:</strong> o palpite dos outros fica oculto até o jogo
                começar. Só aparece pra todo mundo depois do apito.
              </li>
            </ul>
          </section>

          <Rule />

          {/* pontuação */}
          <section className="space-y-3">
            <Eyebrow>pontuação (por jogo)</Eyebrow>
            <p className="text-[14px] leading-relaxed text-ink">
              <strong>Só pontua quem acerta o resultado</strong> (mandante,
              visitante ou empate). Depois conta a proximidade: o{' '}
              <strong>erro no time que perdeu pesa o dobro</strong> — cravar que o
              adversário não fez gol vale mais do que inventar um gol pra ele.
              <span className="block text-[12px] text-sepia">
                vale a partir de Holanda × Suécia. jogos anteriores usaram a regra
                antiga.
              </span>
            </p>
            <ul className="divide-y divide-rule rounded-lg border border-rule">
              {SCORING.map((s) => (
                <li key={s.label} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink">{s.label}</span>
                    <span className="block text-[12px] text-sepia">{s.hint}</span>
                  </span>
                  <PtsTag pts={s.pts} />
                </li>
              ))}
            </ul>
          </section>

          {/* exemplos */}
          <section className="space-y-3">
            <Eyebrow>exemplos · resultado real 3 × 0</Eyebrow>
            <ul className="divide-y divide-rule rounded-lg border border-rule bg-bone/40">
              {EXAMPLES.map((e) => (
                <li key={e.guess} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-14 shrink-0 font-mono text-[15px] tabular font-semibold text-ink">
                    {e.guess}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-sepia">{e.why}</span>
                  <PtsTag pts={e.pts} />
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-sepia">
              empate: cravar o exato vale 30; acertar que foi empate no número
              errado conta pelo erro (ex.: 0 × 0 quando deu 1 × 1 → erro 2 → 18).
              apostar vitória num jogo que empatou vale 0.
            </p>
          </section>

          <Rule />

          {/* ao vivo */}
          <section className="space-y-3">
            <Eyebrow>pontos ao vivo</Eyebrow>
            <ul className="space-y-2 text-[14px] leading-relaxed text-ink">
              <li>
                Enquanto o jogo rola, mostramos a <strong>pontuação provisória</strong>{' '}
                sobre o placar do momento — e o ranking se reordena em tempo real.
              </li>
              <li>
                A pontuação <strong>definitiva</strong> é gravada quando o jogo encerra. Até
                lá, o ao vivo é só prévia e muda a cada gol.
              </li>
            </ul>
          </section>

          <Rule />

          {/* ranking */}
          <section className="space-y-3">
            <Eyebrow>ranking</Eyebrow>
            <ul className="space-y-2 text-[14px] leading-relaxed text-ink">
              <li>Classificação pela soma dos pontos de todos os jogos.</li>
              <li>
                Desempate, nesta ordem: mais pontos → mais <strong>placares exatos</strong> →
                mais <strong>palpites feitos</strong>.
              </li>
              <li>
                O <strong>1º lugar</strong> ganha a borda dourada. O <strong>último</strong>{' '}
                vira o lanterninha e leva o burrinho. 🫏
              </li>
            </ul>
          </section>
        </div>
      </main>

      <BottomNav active="regras" />
    </div>
  )
}
