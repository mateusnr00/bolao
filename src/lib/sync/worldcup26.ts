/**
 * Sync de placar (ao vivo + encerrados) via worldcup26.ir — API REST gratuita e
 * open-source da Copa 2026 (https://github.com/rezarahiminia/worldcup2026).
 *
 * Fontes:
 *   GET /get/teams  → [{ id, name_en, fifa_code, groups, flag }]
 *   GET /get/games  → { games: [{ id, home_team_id, away_team_id, home_score,
 *                       away_score, finished, time_elapsed, type, group, ... }] }
 *
 * Papel: igual ao overlay da SportMonks — o openfootball é a fonte do
 * calendário/seed; aqui só atualizamos placar e status dos jogos que já existem.
 * Casamos pelo PAR de seleções via código FIFA (o `fifa_code` do worldcup26
 * bate 1:1 com o nosso teams.code), resolvido a partir do team id de cada jogo.
 *
 * Vantagem sobre a SportMonks: é gratuito, nativo da Copa 2026 e traz a flag
 * `finished` explícita (sem adivinhar estado).
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
  finished?: string
  time_elapsed?: string
}

// ── parser puro (testável com mock) ─────────────────────────────────────────

/** Cruza teams + games e devolve os updates de placar dos jogos que já
 *  começaram (ao vivo ou encerrados), ignorando o resto. */
export function parseWorldcup26Games(
  teams: Wc26Team[],
  games: Wc26Game[],
): LiveUpdate[] {
  const codeById = new Map<string, string>()
  for (const t of teams) {
    if (t.id != null && t.fifa_code) {
      codeById.set(String(t.id), t.fifa_code.toUpperCase())
    }
  }

  const out: LiveUpdate[] = []
  for (const g of games) {
    const homeCode = codeById.get(String(g.home_team_id))
    const awayCode = codeById.get(String(g.away_team_id))
    // team id "0" (mata-mata ainda indefinido) ou desconhecido → pula
    if (!homeCode || !awayCode) continue

    const finished = String(g.finished ?? '').toUpperCase() === 'TRUE'
    const elapsed = String(g.time_elapsed ?? '').toLowerCase()
    const started = elapsed !== '' && elapsed !== 'notstarted'
    // ainda não começou → não mexe (deixa o openfootball mandar no agendado)
    if (!finished && !started) continue

    const homeGoals = Number(g.home_score)
    const awayGoals = Number(g.away_score)
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue

    out.push({ homeCode, awayCode, homeGoals, awayGoals, finished })
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

async function getJson(url: string, token?: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`worldcup26 ${res.status} ${res.statusText} (${url})`)
  return res.json()
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
