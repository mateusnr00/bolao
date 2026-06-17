import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'
import { cn } from '@/lib/utils'

const SCORING = [
  { label: 'placar exato', pts: 25, hint: 'acertou o placar dos dois times' },
  { label: 'vencedor + placar do vencedor', pts: 18, hint: 'acertou quem ganha e quantos gols ele fez' },
  { label: 'vencedor + diferença de gols', pts: 15, hint: 'acertou quem ganha e por quantos de diferença' },
  { label: 'empate (placar errado)', pts: 15, hint: 'cravou empate, mas no número errado' },
  { label: 'vencedor + placar do perdedor', pts: 12, hint: 'acertou quem ganha e os gols do perdedor' },
  { label: 'só o vencedor', pts: 10, hint: 'acertou só quem ganha o jogo' },
  { label: 'errou o resultado', pts: 0, hint: 'errou quem venceu' },
]

const EXAMPLES = [
  { guess: '2 × 1', pts: 25, why: 'placar exato' },
  { guess: '2 × 0', pts: 18, why: 'acertou o vencedor e que ele faria 2 gols' },
  { guess: '3 × 2', pts: 15, why: 'acertou o vencedor e a diferença de 1 gol' },
  { guess: '3 × 1', pts: 12, why: 'acertou o vencedor e o placar do perdedor (1)' },
  { guess: '4 × 0', pts: 10, why: 'só acertou que o mandante venceria' },
  { guess: '1 × 2', pts: 0, why: 'errou quem venceu' },
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
              Vale <strong>só o maior acerto</strong> de cada jogo — os níveis não somam.
              Não tem bônus por fase: grupos, oitavas e final valem o mesmo.
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
            <Eyebrow>exemplos · resultado real 2 × 1</Eyebrow>
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
              empate: cravar o placar exato vale 25; acertar que foi empate mas no número
              errado (ex.: 0 × 0 quando deu 1 × 1) vale 15.
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
