/**
 * Sync de placar AO VIVO via SportMonks (https://www.sportmonks.com).
 * Fonte: GET /v3/football/livescores/inplay  (jogos em andamento agora).
 *
 * Papel no sistema: o openfootball é a fonte do calendário/seed (cria seleções
 * e jogos). A SportMonks entra POR CIMA, atualizando placar e status dos jogos
 * que já existem no banco enquanto a bola rola. Não cria jogos nem seleções —
 * o endpoint /inplay só devolve quem está jogando no momento.
 *
 * Pontuação: o trigger trg_recalc_predictions recalcula os pontos só quando o
 * status vira 'finished'. Então durante o jogo gravamos status='live' (placar
 * aparece, ninguém pontua) e, no apito final, status='finished' (o trigger
 * recalcula tudo). Por isso o openfootball tem uma guarda pra não rebaixar de
 * volta um jogo que já marcamos aqui.
 *
 * Reconciliação: casamos a partida da SportMonks com a nossa pelo PAR de
 * seleções (sem depender da ordem casa/fora, que pode divergir entre fontes).
 *
 * Usado pelo cron /api/cron/sync (quando SPORTMONKS_API_TOKEN existe) e pelo
 * script `npm run sync:live`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import { NATIONS } from '@/lib/sync/openfootball'
import type { Database } from '@/types/database'

const DEFAULT_BASE_URL = 'https://api.sportmonks.com/v3/football'
// /inplay precisa só de: participants (quem é casa/fora), scores (o placar) e
// state (se já encerrou). Os includes pesados (events/periods/league/round) não
// fazem falta pro sync de placar — menos payload, mais rápido.
const INPLAY_PATH = '/livescores/inplay?include=participants;scores;state'

// ── normalização e mapa de nomes ────────────────────────────────────────────

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// nome em inglês (como o openfootball escreve) → código FIFA do nosso banco.
const CODE_BY_NAME = new Map<string, string>()
for (const [enName, meta] of Object.entries(NATIONS)) {
  CODE_BY_NAME.set(norm(enName), meta.code)
}

// Apelidos onde a SportMonks usa um nome diferente do openfootball. Mapeia o
// nome (normalizado) direto pro código FIFA que já temos em teams.code.
const NAME_ALIASES: Record<string, string> = {
  usa: 'USA',
  'united states': 'USA',
  'south korea': 'KOR',
  'korea republic': 'KOR',
  iran: 'IRN',
  'ir iran': 'IRN',
  'ivory coast': 'CIV',
  "cote d'ivoire": 'CIV',
  'czech republic': 'CZE',
  czechia: 'CZE',
  turkey: 'TUR',
  turkiye: 'TUR',
  'cape verde': 'CPV',
  'cape verde islands': 'CPV',
  'dr congo': 'COD',
  'congo dr': 'COD',
}

// ── tipos da resposta SportMonks (parciais, defensivos) ─────────────────────

interface SmParticipant {
  id: number
  name?: string
  short_code?: string | null
  meta?: { location?: 'home' | 'away' }
}
interface SmScoreEntry {
  description?: string
  score?: { goals?: number | null; participant?: 'home' | 'away' }
}
interface SmState {
  id?: number
  short_name?: string
}
interface SmFixture {
  id: number
  state_id?: number
  state?: SmState
  participants?: SmParticipant[]
  scores?: SmScoreEntry[]
}
interface SmResponse {
  data?: SmFixture[]
}

// ── detecção de encerrado ───────────────────────────────────────────────────

// short_names de estado que indicam jogo encerrado na SportMonks.
const FINISHED_SHORT = new Set(['FT', 'AET', 'FT_PEN'])
// fallback por state_id (5=FT, 7=AET, 8=FT_PEN) quando 'state' não vier incluído.
const FINISHED_STATE_IDS = new Set([5, 7, 8])

function isFinished(fx: SmFixture): boolean {
  const short = fx.state?.short_name
  if (short) return FINISHED_SHORT.has(short)
  if (fx.state_id != null) return FINISHED_STATE_IDS.has(fx.state_id)
  return false
}

function codeOfParticipant(p: SmParticipant | undefined): string | null {
  if (!p) return null
  const name = norm(p.name ?? '')
  if (NAME_ALIASES[name]) return NAME_ALIASES[name]
  if (CODE_BY_NAME.has(name)) return CODE_BY_NAME.get(name)!
  // último recurso: short_code de 3 letras (pode divergir do FIFA, mas ajuda).
  const sc = (p.short_code ?? '').toUpperCase()
  return /^[A-Z]{3}$/.test(sc) ? sc : null
}

// ── parser puro (testável com mock) ─────────────────────────────────────────

export interface LiveUpdate {
  homeCode: string
  awayCode: string
  homeGoals: number
  awayGoals: number
  finished: boolean
}

/** Extrai as atualizações de placar de um payload /inplay, ignorando o que não
 *  dá pra resolver (sem times, sem placar atual, seleção desconhecida). */
export function parseInplayFixtures(payload: SmResponse): LiveUpdate[] {
  const out: LiveUpdate[] = []
  for (const fx of payload.data ?? []) {
    const parts = fx.participants ?? []
    const homeCode = codeOfParticipant(parts.find((p) => p.meta?.location === 'home'))
    const awayCode = codeOfParticipant(parts.find((p) => p.meta?.location === 'away'))
    if (!homeCode || !awayCode) continue

    const current = (fx.scores ?? []).filter((s) => s.description === 'CURRENT')
    const hg = current.find((s) => s.score?.participant === 'home')?.score?.goals
    const ag = current.find((s) => s.score?.participant === 'away')?.score?.goals
    if (hg == null || ag == null) continue

    out.push({
      homeCode,
      awayCode,
      homeGoals: hg,
      awayGoals: ag,
      finished: isFinished(fx),
    })
  }
  return out
}

// ── runner ──────────────────────────────────────────────────────────────────

export interface SportmonksSyncResult {
  fetched: number
  live: number
  finished: number
  unmatched: string[]
}

// chave do par de seleções, sem ordem (casa/fora pode divergir entre fontes).
function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

// o embed de FK no PostgREST pode vir como objeto ou array; normaliza pra code.
function readCode(rel: unknown): string | null {
  if (!rel) return null
  const obj = Array.isArray(rel) ? rel[0] : rel
  const code = (obj as { code?: string } | undefined)?.code
  return code ?? null
}

interface RawMatchRow {
  id: string
  status: Database['public']['Tables']['matches']['Row']['status']
  home: unknown
  away: unknown
}

export async function runSportmonksSync(
  supabase: SupabaseClient<Database>,
  token: string,
  baseUrl: string = process.env.SPORTMONKS_BASE_URL || DEFAULT_BASE_URL,
): Promise<SportmonksSyncResult> {
  const sep = INPLAY_PATH.includes('?') ? '&' : '?'
  const url = `${baseUrl}${INPLAY_PATH}${sep}api_token=${encodeURIComponent(token)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`SportMonks ${res.status} ${res.statusText}`)
  }
  const payload = (await res.json()) as SmResponse
  const updates = parseInplayFixtures(payload)

  // índice dos nossos jogos por par de seleções.
  const { data, error } = await supabase
    .from('matches')
    .select('id, status, home:home_team_id(code), away:away_team_id(code)')
  if (error) throw new Error(`Erro ao ler matches: ${error.message}`)

  const byPair = new Map<string, { id: string; homeCode: string }>()
  for (const r of (data ?? []) as unknown as RawMatchRow[]) {
    const hc = readCode(r.home)
    const ac = readCode(r.away)
    if (!hc || !ac) continue
    byPair.set(pairKey(hc, ac), { id: r.id, homeCode: hc })
  }

  let live = 0
  let finished = 0
  const unmatched: string[] = []
  const now = new Date().toISOString()

  for (const u of updates) {
    const m = byPair.get(pairKey(u.homeCode, u.awayCode))
    if (!m) {
      unmatched.push(`${u.homeCode}-${u.awayCode}`)
      continue
    }
    // orienta o placar conforme a ordem casa/fora do NOSSO registro.
    const sameOrientation = m.homeCode === u.homeCode
    const homeScore = sameOrientation ? u.homeGoals : u.awayGoals
    const awayScore = sameOrientation ? u.awayGoals : u.homeGoals

    const patch: Database['public']['Tables']['matches']['Update'] = {
      home_score: homeScore,
      away_score: awayScore,
      status: u.finished ? 'finished' : 'live',
      updated_at: now,
    }
    if (u.finished) patch.finished_at = now

    const { error: upErr } = await supabase.from('matches').update(patch).eq('id', m.id)
    if (upErr) throw new Error(`Erro ao atualizar match ${m.id}: ${upErr.message}`)

    if (u.finished) finished++
    else live++
  }

  return { fetched: updates.length, live, finished, unmatched }
}
