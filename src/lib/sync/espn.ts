/**
 * Fonte de RESERVA do placar ao vivo: ESPN (grátis, sem chave).
 * Endpoint: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
 *
 * Produz o mesmo formato Wc26Live[] do adapter principal (worldcup26), pra ser
 * um drop-in: a rota /api/live e o cron usam como fallback quando a worldcup26
 * falha ou vem vazia. Mapeia a seleção da ESPN pro nosso código FIFA pela
 * abreviação (se já for um código válido) ou pelo nome em inglês (com aliases).
 */
import { applyLiveUpdates, type LiveUpdate } from '@/lib/sync/live'
import { NATIONS } from '@/lib/sync/openfootball'
import type { Wc26Live } from '@/lib/sync/worldcup26'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

// normaliza nome pra casar sem depender de acento/pontuação/caixa
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// conjunto de códigos FIFA válidos (os nossos)
const FIFA_CODES = new Set(Object.values(NATIONS).map((n) => n.code))

// nome (inglês, normalizado) → código FIFA. Inclui os nomes do openfootball +
// os aliases da ESPN pros que escrevem diferente.
const NAME_TO_CODE: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const [enName, meta] of Object.entries(NATIONS)) m.set(norm(enName), meta.code)
  const aliases: Record<string, string> = {
    'United States': 'USA',
    'Korea Republic': 'KOR',
    'South Korea': 'KOR',
    'IR Iran': 'IRN',
    Iran: 'IRN',
    'Türkiye': 'TUR',
    Turkiye: 'TUR',
    "Côte d'Ivoire": 'CIV',
    'Cote dIvoire': 'CIV',
    Czechia: 'CZE',
    'Cabo Verde': 'CPV',
    'Bosnia and Herzegovina': 'BIH',
    'Congo DR': 'COD',
    'DR Congo': 'COD',
  }
  for (const [name, code] of Object.entries(aliases)) m.set(norm(name), code)
  return m
})()

function resolveCode(
  abbr: string | undefined,
  ...names: (string | undefined)[]
): string | null {
  if (abbr) {
    const up = abbr.toUpperCase()
    if (FIFA_CODES.has(up)) return up
  }
  for (const n of names) {
    if (!n) continue
    const code = NAME_TO_CODE.get(norm(n))
    if (code) return code
  }
  return null
}

// ── tipos (parciais) da resposta da ESPN ────────────────────────────────────
interface EspnTeam {
  abbreviation?: string
  displayName?: string
  shortDisplayName?: string
  name?: string
}
interface EspnCompetitor {
  homeAway?: string
  score?: string | number
  team?: EspnTeam
}
interface EspnStatus {
  displayClock?: string
  type?: { state?: string }
}
interface EspnCompetition {
  status?: EspnStatus
  competitors?: EspnCompetitor[]
}
interface EspnEvent {
  competitions?: EspnCompetition[]
}
interface EspnScoreboard {
  events?: EspnEvent[]
}

/** Converte o scoreboard da ESPN no formato Wc26Live (só jogos já iniciados). */
export function parseEspnLive(json: unknown): Wc26Live[] {
  const events = (json as EspnScoreboard | null)?.events ?? []
  const out: Wc26Live[] = []

  for (const ev of events) {
    const comp = ev.competitions?.[0]
    if (!comp) continue

    // pre = não começou, in = ao vivo, post = encerrado
    const state = comp.status?.type?.state
    if (state !== 'in' && state !== 'post') continue
    const finished = state === 'post'

    const home = comp.competitors?.find((c) => c.homeAway === 'home')
    const away = comp.competitors?.find((c) => c.homeAway === 'away')
    if (!home || !away) continue

    const homeCode = resolveCode(
      home.team?.abbreviation,
      home.team?.displayName,
      home.team?.name,
      home.team?.shortDisplayName,
    )
    const awayCode = resolveCode(
      away.team?.abbreviation,
      away.team?.displayName,
      away.team?.name,
      away.team?.shortDisplayName,
    )
    if (!homeCode || !awayCode) continue

    const homeGoals = Number(home.score)
    const awayGoals = Number(away.score)
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue

    const raw = String(comp.status?.displayClock ?? '').trim()
    const minMatch = raw.match(/(\d{1,3})/)
    const minute = finished ? null : minMatch ? parseInt(minMatch[1], 10) : null
    const label = finished ? null : minute == null && raw ? raw : null

    out.push({
      homeCode,
      awayCode,
      homeGoals,
      awayGoals,
      finished,
      minute,
      label,
      homeScorers: [],
      awayScorers: [],
    })
  }
  return out
}

async function getJson(url: string, revalidate?: number): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    ...(revalidate != null ? { next: { revalidate } } : { cache: 'no-store' }),
  })
  if (!res.ok) throw new Error(`ESPN ${res.status} ${res.statusText}`)
  return res.json()
}

/** Busca o placar ao vivo da ESPN (reserva), no mesmo formato do principal. */
export async function fetchEspnLive(revalidate?: number): Promise<Wc26Live[]> {
  return parseEspnLive(await getJson(ESPN_URL, revalidate))
}

function toUpdates(live: Wc26Live[]): LiveUpdate[] {
  return live.map((g) => ({
    homeCode: g.homeCode,
    awayCode: g.awayCode,
    homeGoals: g.homeGoals,
    awayGoals: g.awayGoals,
    finished: g.finished,
  }))
}

export interface EspnSyncResult {
  fetched: number
  live: number
  finished: number
  unmatched: string[]
}

/** Aplica o placar da ESPN no banco (usado como reserva do cron). */
export async function runEspnSync(
  supabase: SupabaseClient<Database>,
): Promise<EspnSyncResult> {
  const live = await fetchEspnLive()
  const updates = toUpdates(live)
  const applied = await applyLiveUpdates(supabase, updates)
  return { fetched: updates.length, ...applied }
}
