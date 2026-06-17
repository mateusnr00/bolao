// Gerador de placar "realista" pra dar um palpite rápido. A distribuição de
// gols por time imita futebol de verdade (a maioria dos jogos termina com
// poucos gols), então o sorteio raramente cospe coisas absurdas tipo 6 x 5.

const GOAL_WEIGHTS = [
  { goals: 0, w: 30 },
  { goals: 1, w: 34 },
  { goals: 2, w: 20 },
  { goals: 3, w: 10 },
  { goals: 4, w: 4 },
  { goals: 5, w: 2 },
] as const

const TOTAL_WEIGHT = GOAL_WEIGHTS.reduce((sum, g) => sum + g.w, 0)

function drawGoals(): number {
  let r = Math.random() * TOTAL_WEIGHT
  for (const { goals, w } of GOAL_WEIGHTS) {
    if (r < w) return goals
    r -= w
  }
  return 0
}

// Sorteia um placar plausível [casa, fora]. Tenta de novo se cair igual ao
// placar atual, pra que o botão sempre gere algo diferente do que já está lá.
export function randomFootballScore(current?: [number, number]): [number, number] {
  for (let i = 0; i < 5; i++) {
    const score: [number, number] = [drawGoals(), drawGoals()]
    if (!current || score[0] !== current[0] || score[1] !== current[1]) {
      return score
    }
  }
  return [drawGoals(), drawGoals()]
}
