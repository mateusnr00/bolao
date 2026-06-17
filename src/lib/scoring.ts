// Pontuação v2 — espelha calculate_prediction_points do banco (migration 0007).
// Usado pra mostrar pontos PROVISÓRIOS ao vivo (o cálculo oficial/definitivo
// segue sendo o trigger no banco quando o jogo encerra).
//
// Regras padrão, sem multiplicador de fase:
//   placar exato ........................ 25
//   vencedor + placar do vencedor ....... 18
//   vencedor + diferença de gols ........ 15
//   empate (placar errado) .............. 15
//   vencedor + placar do perdedor ....... 12
//   só o vencedor ....................... 10
//   errou ............................... 0

const RULES = {
  exact: 25,
  winnerWithWinnerGoals: 18,
  winnerWithDiff: 15,
  drawWrongScore: 15,
  winnerWithLoserGoals: 12,
  winnerOnly: 10,
} as const

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

/** Pontos de um palpite [casa, fora] contra um placar real [casa, fora]. */
export function calcPredictionPoints(
  pred: [number, number],
  actual: [number, number],
): number {
  const [ph, pa] = pred
  const [ah, aa] = actual

  if (ph === ah && pa === aa) return RULES.exact

  const pw = sign(ph - pa)
  const aw = sign(ah - aa)

  if (pw === 0 && aw === 0) return RULES.drawWrongScore

  if (pw === aw && pw !== 0) {
    if (Math.max(ph, pa) === Math.max(ah, aa)) return RULES.winnerWithWinnerGoals
    if (ph - pa === ah - aa) return RULES.winnerWithDiff
    if (Math.min(ph, pa) === Math.min(ah, aa)) return RULES.winnerWithLoserGoals
    return RULES.winnerOnly
  }

  return 0
}
