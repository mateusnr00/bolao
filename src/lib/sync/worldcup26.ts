/**
 * Sync de placar (ao vivo + encerrados) via worldcup26.ir — API REST gratuita e
 * open-source da Copa 2026 (https://github.com/rezarahiminia/worldcup2026).
 *
 * Fontes:
 *   GET /get/teams  → [{ id, name_en, fifa_code, groups, flag }]
 *   GET /get/games  → { games: [{ id, home_team_id, away_team_id, home_score,
 *                       away_score, finished, time_elapsed, type, group, ... }] }
 *
 * Fonte oficial ÚNICA do placar ao vivo. O openfootball só semeia o calendário
 * (horários corretos em UTC); aqui atualizamos placar e status dos jogos que já
 * existem. Casamos pelo PAR de seleções via código FIFA (o `fifa_code` do
 * worldcup26 bate 1:1 com o nosso teams.code), resolvido pelo team id do jogo.
 *
 * Gratuita, nativa da Copa 2026 e com a flag `finished` explícita.
 *
 * Auth: a API pede um JWT (registro gratuito; token vale 84 dias). Mandamos como
 * Bearer quando WC2026_API_KEY existe.
 *
 * Usado pelo cron /api/cron/sync e pelo script `npm run sync:wc26`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import { applyLiveUpdates, type LiveUpdate } from '@/lib/sync/live'
import type { Database } from '@/types/database'

const DEFAULT_BASE_URL = 'https://worldcup26.ir'

interface Wc26Team {
  id?: string | number
  fifa_code?: string
}

interface Wc26Game {
  home_team_id?: string | number
  away_team_id?: string | number
  home_score?: string | number
  away_score?: string | number
  home_scorers?: string
  away_scorers?: string
  finished?: string
  time_elapsed?: string
}

// a API manda os autores como array literal do Postgres, ex.:
//   {"Hri Kin 42'","Ptar Mvsa 45+5'"}  → ["Hri Kin 42'", "Ptar Mvsa 45+5'"]
// (ou "null"/vazio quando não há gols). Cada item é "Nome MINUTO'".
function parseScorers(v: unknown): string[] {
  const raw = String(v ?? '').trim()
  if (!raw || raw.toLowerCase() === 'null') return []
  const inner = raw.replace(/^\{/, '').replace(/\}$/, '')
  if (!inner) return []
  const quoted = inner.match(/"([^"]*)"/g)
  if (quoted) return quoted.map((s) => s.slice(1, -1).trim()).filter(Boolean)
  return inner.split(',').map((s) => s.trim()).filter(Boolean)
}

// ── parser puro (testável com mock) ─────────────────────────────────────────

// team id (worldcup26) → código FIFA (= nosso teams.code)
function codeById(teams: Wc26Team[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of teams) {
    if (t.id != null && t.fifa_code) map.set(String(t.id), t.fifa_code.toUpperCase())
  }
  return map
}

function isFinished(g: Wc26Game): boolean {
  return String(g.finished ?? '').toUpperCase() === 'TRUE'
}

function isStarted(g: Wc26Game): boolean {
  const elapsed = String(g.time_elapsed ?? '').toLowerCase()
  return elapsed !== '' && elapsed !== 'notstarted'
}

/** Cruza teams + games e devolve os updates de placar dos jogos que já
 *  começaram (ao vivo ou encerrados), ignorando o resto. Usado pelo sync. */
export function parseWorldcup26Games(
  teams: Wc26Team[],
  games: Wc26Game[],
): LiveUpdate[] {
  const codes = codeById(teams)

  const out: LiveUpdate[] = []
  for (const g of games) {
    const homeCode = codes.get(String(g.home_team_id))
    const awayCode = codes.get(String(g.away_team_id))
    // team id "0" (mata-mata ainda indefinido) ou desconhecido → pula
    if (!homeCode || !awayCode) continue
    const finished = isFinished(g)
    // ainda não começou → não mexe (deixa o openfootball mandar no agendado)
    if (!finished && !isStarted(g)) continue

    const homeGoals = Number(g.home_score)
    const awayGoals = Number(g.away_score)
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue

    out.push({ homeCode, awayCode, homeGoals, awayGoals, finished })
  }
  return out
}

// ── placar ao vivo pro front (com minuto) ───────────────────────────────────

export interface Wc26Live {
  homeCode: string
  awayCode: string
  homeGoals: number
  awayGoals: number
  finished: boolean
  minute: number | null // minuto numérico, quando dá pra ler de time_elapsed
  label: string | null // rótulo cru quando não é número (ex.: "HT")
  homeScorers: string[] // autores dos gols da casa ("Nome 42'")
  awayScorers: string[]
}

/** Igual ao parser do sync, mas guarda o minuto/rótulo pra exibir no front. */
export function parseWorldcup26Live(
  teams: Wc26Team[],
  games: Wc26Game[],
): Wc26Live[] {
  const codes = codeById(teams)

  const out: Wc26Live[] = []
  for (const g of games) {
    const homeCode = codes.get(String(g.home_team_id))
    const awayCode = codes.get(String(g.away_team_id))
    if (!homeCode || !awayCode) continue
    const finished = isFinished(g)
    if (!finished && !isStarted(g)) continue

    const homeGoals = Number(g.home_score)
    const awayGoals = Number(g.away_score)
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue

    const raw = String(g.time_elapsed ?? '').trim()
    const minMatch = raw.match(/^(\d{1,3})/)
    const minute = minMatch ? parseInt(minMatch[1], 10) : null
    const label =
      minute == null && raw && raw.toLowerCase() !== 'notstarted' ? raw : null

    out.push({
      homeCode,
      awayCode,
      homeGoals,
      awayGoals,
      finished,
      minute,
      label,
      homeScorers: parseScorers(g.home_scorers),
      awayScorers: parseScorers(g.away_scorers),
    })
  }
  return out
}

// ── runner ──────────────────────────────────────────────────────────────────

export interface Worldcup26SyncResult {
  fetched: number
  live: number
  finished: number
  unmatched: string[]
}

async function getJson(
  url: string,
  token?: string,
  revalidate?: number,
): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(revalidate != null ? { next: { revalidate } } : {}),
  })
  if (!res.ok) throw new Error(`worldcup26 ${res.status} ${res.statusText} (${url})`)
  return res.json()
}

/** Busca o placar ao vivo (jogos que já começaram), com minuto, pro front.
 *  As respostas são cacheadas por `revalidate`s pra não martelar a API quando
 *  muitos clientes fazem polling. */
export async function fetchWorldcup26Live(
  token?: string,
  baseUrl: string = process.env.WC2026_API_BASE_URL || DEFAULT_BASE_URL,
  revalidate = 15,
): Promise<Wc26Live[]> {
  const [teamsJson, gamesJson] = await Promise.all([
    getJson(`${baseUrl}/get/teams`, token, revalidate),
    getJson(`${baseUrl}/get/games`, token, revalidate),
  ])
  return parseWorldcup26Live(
    asArray<Wc26Team>(teamsJson, 'teams'),
    asArray<Wc26Game>(gamesJson, 'games'),
  )
}

// a API pode devolver o array direto ou embrulhado ({ teams }, { games }).
function asArray<T>(json: unknown, key: string): T[] {
  if (Array.isArray(json)) return json as T[]
  const wrapped = (json as Record<string, unknown> | null)?.[key]
  return Array.isArray(wrapped) ? (wrapped as T[]) : []
}

export async function runWorldcup26Sync(
  supabase: SupabaseClient<Database>,
  token?: string,
  baseUrl: string = process.env.WC2026_API_BASE_URL || DEFAULT_BASE_URL,
): Promise<Worldcup26SyncResult> {
  const [teamsJson, gamesJson] = await Promise.all([
    getJson(`${baseUrl}/get/teams`, token),
    getJson(`${baseUrl}/get/games`, token),
  ])
  const teams = asArray<Wc26Team>(teamsJson, 'teams')
  const games = asArray<Wc26Game>(gamesJson, 'games')

  const updates = parseWorldcup26Games(teams, games)
  const applied = await applyLiveUpdates(supabase, updates)
  return { fetched: updates.length, ...applied }
}
