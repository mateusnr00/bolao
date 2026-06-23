// Pontuação v3 — vale a partir de Holanda × Suécia (ver migration 0021/0025).
//
// 1) Só pontua se acertar o RESULTADO (vitória mandante / visitante / empate).
//    Errou o resultado → 0.
// 2) EMPATE: escala pela distância do placar (d = |palpite − real|):
//      0 → 30 | 1 (1×1 p/ 0×0) → 20 | 2 → 15 | 3 → 10 | >=4 → 8
// 3) COM VENCEDOR: proximidade por erro ponderado, por gol:
//      - erro no time VENCEDOR ........................ peso 1 (aceitável)
//      - chutar gols A MENOS pro perdedor ............. peso 2
//      - INVENTAR gol pro perdedor (chutar a mais) .... peso 3 (o pior erro)
//    Tabela do erro: 0 → 30 | 1 → 22 | 2 → 18 | 3 → 15 | 4 → 12 | >=5 → 8
//
// Usado pros pontos PROVISÓRIOS ao vivo. Como jogo ao vivo é sempre posterior
// ao corte (Holanda × Suécia), aqui não precisa diferenciar regra antiga/nova;
// o cálculo oficial/definitivo (com o corte por data) é o trigger no banco.

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

function pointsForError(erro: number): number {
  if (erro <= 0) return 30
  if (erro === 1) return 22
  if (erro === 2) return 18
  if (erro === 3) return 15
  if (erro === 4) return 12
  return 8
}

// Empate certo: pontua pela distância do placar (0×0→0×0 = 30; 1×1 = 20; …)
function pointsForDraw(dist: number): number {
  if (dist <= 0) return 30
  if (dist === 1) return 20
  if (dist === 2) return 15
  if (dist === 3) return 10
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

  // 2) empate: escala pela distância do placar (palpite de empate vs real)
  if (ah === aa) {
    return pointsForDraw(Math.abs(ph - ah))
  }

  // 3) com vencedor: erro do vencedor peso 1; do perdedor peso 2 (a menos) ou
  //    peso 3 quando se INVENTA gol (chutar mais do que o perdedor fez)
  const homeWon = ah > aa
  const winnerPred = homeWon ? ph : pa
  const winnerAct = homeWon ? ah : aa
  const loserPred = homeWon ? pa : ph
  const loserAct = homeWon ? aa : ah

  const winnerErr = Math.abs(winnerPred - winnerAct)
  const loserErr =
    loserPred > loserAct
      ? (loserPred - loserAct) * 3 // inventou gol pro perdedor
      : (loserAct - loserPred) * 2 // chutou gols a menos
  return pointsForError(winnerErr + loserErr)
}
