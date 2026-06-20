// Pontuação v3 — vale a partir de Holanda × Suécia (ver migration 0021).
//
// 1) Só pontua se acertar o RESULTADO (vitória mandante / visitante / empate).
//    Errou o resultado → 0.
// 2) Proximidade por erro ponderado: o erro no time PERDEDOR pesa o DOBRO do
//    erro no time VENCEDOR. Assim cravar que o adversário não marcou (clean
//    sheet) vale mais do que inventar um gol pra ele.
//      erro = |Δvencedor| * 1 + |Δperdedor| * 2
//    Empate (sem vencedor/perdedor): erro = |ΔtimeA| + |ΔtimeB|.
// 3) Tabela do erro:
//      0 → 30 | 1 → 24 | 2 → 20 | 3 → 16 | 4 → 12 | >=5 → 8
//
// Usado pros pontos PROVISÓRIOS ao vivo. Como jogo ao vivo é sempre posterior
// ao corte (Holanda × Suécia), aqui não precisa diferenciar regra antiga/nova;
// o cálculo oficial/definitivo (com o corte por data) é o trigger no banco.

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

function pointsForError(erro: number): number {
  if (erro <= 0) return 30
  if (erro === 1) return 24
  if (erro === 2) return 20
  if (erro === 3) return 16
  if (erro === 4) return 12
  return 8
}

/** Pontos de um palpite [casa, fora] contra um placar real [casa, fora]. */
export function calcPredictionPoints(
  pred: [number, number],
  actual: [number, number],
): number {
  const [ph, pa] = pred
  const [ah, aa] = actual

  // 1) precisa acertar o resultado (mandante / visitante / empate)
  if (sign(ph - pa) !== sign(ah - aa)) return 0

  // 2) empate: erro simples (não há vencedor/perdedor)
  if (ah === aa) {
    return pointsForError(Math.abs(ph - ah) + Math.abs(pa - aa))
  }

  // 3) com vencedor: o erro do perdedor pesa o dobro
  const homeWon = ah > aa
  const winnerPred = homeWon ? ph : pa
  const winnerAct = homeWon ? ah : aa
  const loserPred = homeWon ? pa : ph
  const loserAct = homeWon ? aa : ah

  const erro = Math.abs(winnerPred - winnerAct) + 2 * Math.abs(loserPred - loserAct)
  return pointsForError(erro)
}
