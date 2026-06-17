/**
 * Teste do parser do sync SportMonks com um payload mock no formato v3
 * (/livescores/inplay). Como o ambiente de dev não tem acesso de rede à API,
 * validamos a lógica de extração contra um mock representativo.
 *
 * Rodar: npx tsx scripts/test-sportmonks-parse.ts
 */
import assert from 'node:assert/strict'

import { parseInplayFixtures, type LiveUpdate } from '@/lib/sync/sportmonks'

function score(participant: 'home' | 'away', goals: number, description = 'CURRENT') {
  return { description, score: { goals, participant } }
}

const mock = {
  data: [
    // 1) jogo ao vivo, ordem casa/fora igual à nossa
    {
      id: 101,
      state_id: 2,
      state: { id: 2, short_name: '2ND_HALF' },
      participants: [
        { id: 1, name: 'Brazil', short_code: 'BRA', meta: { location: 'home' } },
        { id: 2, name: 'Croatia', short_code: 'CRO', meta: { location: 'away' } },
      ],
      scores: [
        score('home', 2),
        score('away', 1),
        // ruído de outras descrições não deve atrapalhar
        score('home', 1, '1ST_HALF'),
        score('away', 0, '1ST_HALF'),
      ],
    },
    // 2) jogo encerrado (FT por short_name)
    {
      id: 102,
      state: { short_name: 'FT' },
      participants: [
        { id: 3, name: 'Argentina', short_code: 'ARG', meta: { location: 'home' } },
        { id: 4, name: 'Mexico', short_code: 'MEX', meta: { location: 'away' } },
      ],
      scores: [score('home', 0), score('away', 0)],
    },
    // 3) nome alternativo da SportMonks ('United States') deve virar USA;
    //    encerrado por state_id (5 = FT) quando 'state' não vem.
    {
      id: 103,
      state_id: 5,
      participants: [
        { id: 5, name: 'United States', short_code: 'USA', meta: { location: 'home' } },
        { id: 6, name: 'South Korea', short_code: 'KOR', meta: { location: 'away' } },
      ],
      scores: [score('home', 3), score('away', 2)],
    },
    // 4) sem placar CURRENT → ignorado
    {
      id: 104,
      state: { short_name: '1ST_HALF' },
      participants: [
        { id: 7, name: 'Spain', meta: { location: 'home' } },
        { id: 8, name: 'Portugal', meta: { location: 'away' } },
      ],
      scores: [score('home', 1, '1ST_HALF')],
    },
    // 5) seleção desconhecida → ignorado
    {
      id: 105,
      state: { short_name: '2ND_HALF' },
      participants: [
        { id: 9, name: 'Narnia', meta: { location: 'home' } },
        { id: 10, name: 'France', meta: { location: 'away' } },
      ],
      scores: [score('home', 0), score('away', 0)],
    },
  ],
}

// o mock é literal; o cast alinha os literais 'home'/'away' ao tipo do parser.
const got = parseInplayFixtures(mock as Parameters<typeof parseInplayFixtures>[0])

const byPair = (h: string, a: string) =>
  got.find((u) => u.homeCode === h && u.awayCode === a)

// só os 3 resolvíveis devem sair
assert.equal(got.length, 3, `esperava 3 updates, veio ${got.length}`)

const bra = byPair('BRA', 'CRO')
assert.deepEqual(bra, {
  homeCode: 'BRA',
  awayCode: 'CRO',
  homeGoals: 2,
  awayGoals: 1,
  finished: false,
} satisfies LiveUpdate)

const arg = byPair('ARG', 'MEX')
assert.ok(arg && arg.finished, 'ARG x MEX deveria estar encerrado (FT)')

const usa = byPair('USA', 'KOR')
assert.ok(usa, "'United States' deveria mapear para USA")
assert.ok(usa!.finished, 'USA x KOR deveria estar encerrado (state_id 5)')
assert.equal(usa!.homeGoals, 3)
assert.equal(usa!.awayGoals, 2)

// os ignorados não aparecem
assert.ok(!byPair('ESP', 'POR'), 'sem placar CURRENT deveria ser ignorado')
assert.ok(!got.some((u) => u.awayCode === 'FRA'), 'seleção desconhecida deveria ser ignorada')

console.log(`OK — parser validado: ${got.length}/5 fixtures resolvidos como esperado.`)
