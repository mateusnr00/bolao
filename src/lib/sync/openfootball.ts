/**
 * Sync de jogos da Copa 2026 a partir do openfootball (público, sem key).
 * Fonte: https://github.com/openfootball/worldcup.json
 *
 * Idempotente: upsert por external_id (matches) e code (teams).
 * Horários: openfootball traz offset no campo `time` ("13:00 UTC-6") → guardamos
 * em UTC (timestamptz). A exibição em America/Sao_Paulo é feita no app.
 *
 * Limitação da fonte: jogos de mata-mata vêm como placeholder ("2A", "W74")
 * até o grupo terminar; como matches.home_team_id/away_team_id são NOT NULL,
 * esses são pulados até o openfootball preencher os times reais.
 *
 * Usado pelo script `npm run sync` e pela rota de cron `/api/cron/sync`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, MatchStage } from '@/types/database'

const SOURCE =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

// Referência (nome PT + código FIFA + ISO p/ bandeira). Não está no openfootball;
// é dado estático de seleção, não de jogo/placar. Bandeiras via flagcdn.
// ISO usa gb-eng/gb-sct p/ nações britânicas (suportado pelo flagcdn).
// Chave = nome em inglês como o openfootball escreve; `pt` = nome exibido.
const NATIONS: Record<string, { code: string; iso: string; pt: string }> = {
  Mexico: { code: 'MEX', iso: 'mx', pt: 'México' },
  'South Africa': { code: 'RSA', iso: 'za', pt: 'África do Sul' },
  'South Korea': { code: 'KOR', iso: 'kr', pt: 'Coreia do Sul' },
  'Czech Republic': { code: 'CZE', iso: 'cz', pt: 'República Tcheca' },
  Canada: { code: 'CAN', iso: 'ca', pt: 'Canadá' },
  'Bosnia & Herzegovina': { code: 'BIH', iso: 'ba', pt: 'Bósnia e Herzegovina' },
  Qatar: { code: 'QAT', iso: 'qa', pt: 'Catar' },
  Switzerland: { code: 'SUI', iso: 'ch', pt: 'Suíça' },
  Brazil: { code: 'BRA', iso: 'br', pt: 'Brasil' },
  Morocco: { code: 'MAR', iso: 'ma', pt: 'Marrocos' },
  Haiti: { code: 'HAI', iso: 'ht', pt: 'Haiti' },
  Scotland: { code: 'SCO', iso: 'gb-sct', pt: 'Escócia' },
  USA: { code: 'USA', iso: 'us', pt: 'Estados Unidos' },
  Paraguay: { code: 'PAR', iso: 'py', pt: 'Paraguai' },
  Australia: { code: 'AUS', iso: 'au', pt: 'Austrália' },
  Turkey: { code: 'TUR', iso: 'tr', pt: 'Turquia' },
  Germany: { code: 'GER', iso: 'de', pt: 'Alemanha' },
  Curaçao: { code: 'CUW', iso: 'cw', pt: 'Curaçao' },
  'Ivory Coast': { code: 'CIV', iso: 'ci', pt: 'Costa do Marfim' },
  Ecuador: { code: 'ECU', iso: 'ec', pt: 'Equador' },
  Netherlands: { code: 'NED', iso: 'nl', pt: 'Holanda' },
  Japan: { code: 'JPN', iso: 'jp', pt: 'Japão' },
  Sweden: { code: 'SWE', iso: 'se', pt: 'Suécia' },
  Tunisia: { code: 'TUN', iso: 'tn', pt: 'Tunísia' },
  Belgium: { code: 'BEL', iso: 'be', pt: 'Bélgica' },
  Egypt: { code: 'EGY', iso: 'eg', pt: 'Egito' },
  Iran: { code: 'IRN', iso: 'ir', pt: 'Irã' },
  'New Zealand': { code: 'NZL', iso: 'nz', pt: 'Nova Zelândia' },
  Spain: { code: 'ESP', iso: 'es', pt: 'Espanha' },
  'Cape Verde': { code: 'CPV', iso: 'cv', pt: 'Cabo Verde' },
  'Saudi Arabia': { code: 'KSA', iso: 'sa', pt: 'Arábia Saudita' },
  Uruguay: { code: 'URU', iso: 'uy', pt: 'Uruguai' },
  France: { code: 'FRA', iso: 'fr', pt: 'França' },
  Senegal: { code: 'SEN', iso: 'sn', pt: 'Senegal' },
  Iraq: { code: 'IRQ', iso: 'iq', pt: 'Iraque' },
  Norway: { code: 'NOR', iso: 'no', pt: 'Noruega' },
  Argentina: { code: 'ARG', iso: 'ar', pt: 'Argentina' },
  Algeria: { code: 'ALG', iso: 'dz', pt: 'Argélia' },
  Austria: { code: 'AUT', iso: 'at', pt: 'Áustria' },
  Jordan: { code: 'JOR', iso: 'jo', pt: 'Jordânia' },
  Portugal: { code: 'POR', iso: 'pt', pt: 'Portugal' },
  'DR Congo': { code: 'COD', iso: 'cd', pt: 'RD Congo' },
  Uzbekistan: { code: 'UZB', iso: 'uz', pt: 'Uzbequistão' },
  Colombia: { code: 'COL', iso: 'co', pt: 'Colômbia' },
  England: { code: 'ENG', iso: 'gb-eng', pt: 'Inglaterra' },
  Croatia: { code: 'CRO', iso: 'hr', pt: 'Croácia' },
  Ghana: { code: 'GHA', iso: 'gh', pt: 'Gana' },
  Panama: { code: 'PAN', iso: 'pa', pt: 'Panamá' },
}

interface OpenfootballMatch {
  round: string
  num?: number
  date: string
  time: string
  team1: string
  team2: string
  group?: string
  ground?: string
  score?: { ft?: (number | null)[]; ht?: (number | null)[] }
}

export interface SyncResult {
  teams: number
  matches: number
  finished: number
  skipped: number
  unknown: string[]
}

function flagUrl(iso: string): string {
  return `https://flagcdn.com/${iso}.svg`
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// "13:00 UTC-6" + "2026-06-11" → ISO em UTC (Z).
function toUtcIso(date: string, time: string): string | null {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i)
  if (!m) return null
  const [, hh, mm, sign, offH, offM] = m
  const pad = (n: string | number) => String(n).padStart(2, '0')
  const offset = `${sign}${pad(offH)}:${pad(offM ?? '00')}`
  const local = `${date}T${pad(hh)}:${mm}:00${offset}`
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function mapStage(round: string, group?: string): MatchStage {
  if (group) return 'group'
  const r = round.toLowerCase()
  if (r.includes('round of 32')) return 'round_of_32'
  if (r.includes('round of 16')) return 'round_of_16'
  if (r.includes('quarter')) return 'quarter_final'
  if (r.includes('semi')) return 'semi_final'
  if (r.includes('third')) return 'third_place'
  if (r.includes('final')) return 'final'
  return 'group'
}

const isReal = (name: string) => name in NATIONS

export async function runOpenfootballSync(
  supabase: SupabaseClient<Database>,
): Promise<SyncResult> {
  const res = await fetch(SOURCE)
  if (!res.ok) throw new Error(`Falha ao buscar fonte: ${res.status} ${res.statusText}`)
  const data = (await res.json()) as { name: string; matches: OpenfootballMatch[] }

  // Times: deriva das partidas com seleções reais. group_name vem do campo group.
  const teamsByCode = new Map<
    string,
    { external_id: string; name: string; code: string; flag_url: string; group_name: string | null }
  >()
  const unknown = new Set<string>()

  for (const mt of data.matches) {
    for (const name of [mt.team1, mt.team2]) {
      if (!isReal(name)) {
        // placeholders de mata-mata ("2A", "W74") ou nome fora do mapa
        if (!/^([WL]?\d+|\d+[A-Z]|[A-Z]\d+)$/.test(name)) unknown.add(name)
        continue
      }
      const meta = NATIONS[name]
      const groupName = mt.group ? mt.group.replace(/^Group\s+/i, '') : null
      const existing = teamsByCode.get(meta.code)
      teamsByCode.set(meta.code, {
        external_id: meta.code,
        name: meta.pt,
        code: meta.code,
        flag_url: flagUrl(meta.iso),
        group_name: existing?.group_name ?? groupName,
      })
    }
  }

  const teamRows = [...teamsByCode.values()]
  const { error: teamErr } = await supabase.from('teams').upsert(teamRows, { onConflict: 'code' })
  if (teamErr) throw new Error(`Erro no upsert de teams: ${teamErr.message}`)

  // mapa code → id
  const { data: teams, error: selErr } = await supabase.from('teams').select('id, code')
  if (selErr) throw new Error(`Erro ao ler teams: ${selErr.message}`)
  const idByCode = new Map(teams!.map((t) => [t.code, t.id]))

  // Jogos: só os com ambos os times reais (FK NOT NULL).
  const matchRows: Database['public']['Tables']['matches']['Insert'][] = []
  let skipped = 0
  for (const mt of data.matches) {
    if (!isReal(mt.team1) || !isReal(mt.team2)) {
      skipped++
      continue
    }
    const homeId = idByCode.get(NATIONS[mt.team1].code)
    const awayId = idByCode.get(NATIONS[mt.team2].code)
    const kickoff = toUtcIso(mt.date, mt.time)
    if (!homeId || !awayId || !kickoff) {
      skipped++
      continue
    }

    const ft = mt.score?.ft
    const hasScore =
      Array.isArray(ft) && ft.length === 2 && ft[0] != null && ft[1] != null
    const groupName = mt.group ? mt.group.replace(/^Group\s+/i, '') : null
    const externalId = mt.group
      ? `wc2026-g-${slug(groupName ?? '')}-${slug(mt.team1)}-${slug(mt.team2)}`
      : `wc2026-ko-${mt.num}`

    matchRows.push({
      external_id: externalId,
      home_team_id: homeId,
      away_team_id: awayId,
      kickoff_at: kickoff,
      stage: mapStage(mt.round, mt.group),
      group_name: groupName,
      venue: mt.ground ?? null,
      home_score: hasScore ? (ft![0] as number) : null,
      away_score: hasScore ? (ft![1] as number) : null,
      status: hasScore ? 'finished' : 'scheduled',
      finished_at: hasScore ? kickoff : null,
      updated_at: new Date().toISOString(),
    })
  }

  const { error: matchErr } = await supabase
    .from('matches')
    .upsert(matchRows, { onConflict: 'external_id' })
  if (matchErr) throw new Error(`Erro no upsert de matches: ${matchErr.message}`)

  const finished = matchRows.filter((m) => m.status === 'finished').length
  return {
    teams: teamRows.length,
    matches: matchRows.length,
    finished,
    skipped,
    unknown: [...unknown],
  }
}
