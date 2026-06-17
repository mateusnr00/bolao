/**
 * Teste do parser do sync worldcup26 com mock no formato real da API
 * (campos como strings, finished "TRUE"/"FALSE", team id "0" p/ mata-mata).
 * Como o ambiente de dev não acessa a API, validamos a lógica com mock.
 *
 * Rodar: npx tsx scripts/test-worldcup26-parse.ts
 */
import assert from 'node:assert/strict'

import { parseWorldcup26Games } from '@/lib/sync/worldcup26'

// recorte do /get/teams (id → fifa_code)
const teams = [
  { id: '9', name_en: 'Brazil', fifa_code: 'BRA' },
  { id: '12', name_en: 'Scotland', fifa_code: 'SCO' },
  { id: '37', name_en: 'Argentina', fifa_code: 'ARG' },
  { id: '1', name_en: 'Mexico', fifa_code: 'MEX' },
  { id: '13', name_en: 'United States', fifa_code: 'USA' },
  { id: '3', name_en: 'South Korea', fifa_code: 'KOR' },
]

const games = [
  // 1) ao vivo (começou, não terminou)
  {
    id: '10', home_team_id: '9', away_team_id: '12',
    home_score: '2', away_score: '0',
    finished: 'FALSE', time_elapsed: '67', type: 'group', group: 'C',
  },
  // 2) encerrado
  {
    id: '20', home_team_id: '37', away_team_id: '1',
    home_score: '1', away_score: '1',
    finished: 'TRUE', time_elapsed: 'finished', type: 'group', group: 'J',
  },
  // 3) ainda não começou → ignorado
  {
    id: '30', home_team_id: '13', away_team_id: '3',
    home_score: '0', away_score: '0',
    finished: 'FALSE', time_elapsed: 'notstarted', type: 'group', group: 'A',
  },
  // 4) mata-mata indefinido (team id "0") → ignorado
  {
    id: '73', home_team_id: '0', away_team_id: '0',
    home_score: '0', away_score: '0',
    finished: 'FALSE', time_elapsed: 'notstarted', type: 'r32', group: 'R32',
  },
]

const got = parseWorldcup26Games(teams, games)
const find = (h: string, a: string) => got.find((u) => u.homeCode === h && u.awayCode === a)

assert.equal(got.length, 2, `esperava 2 updates, veio ${got.length}`)

assert.deepEqual(find('BRA', 'SCO'), {
  homeCode: 'BRA', awayCode: 'SCO', homeGoals: 2, awayGoals: 0, finished: false,
})

const arg = find('ARG', 'MEX')
assert.ok(arg && arg.finished, 'ARG x MEX deveria estar encerrado')
assert.equal(arg!.homeGoals, 1)
assert.equal(arg!.awayGoals, 1)

assert.ok(!find('USA', 'KOR'), 'jogo notstarted deveria ser ignorado')
assert.ok(!got.some((u) => u.homeCode === '0'), 'mata-mata indefinido deveria ser ignorado')

console.log(`OK — parser validado: ${got.length}/4 jogos resolvidos como esperado.`)
