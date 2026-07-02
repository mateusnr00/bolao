/**
 * Aplicação de placar AO VIVO no banco, compartilhada pelos adapters de fonte
 * (worldcup26). O adapter só precisa produzir LiveUpdate[]; este
 * módulo cuida de casar com os nossos jogos e gravar.
 *
 * Reconciliação: casa pelo PAR de seleções (código FIFA), sem depender da ordem
 * casa/fora — que pode divergir entre fontes. O placar é reorientado conforme a
 * ordem do nosso registro.
 *
 * Pontuação: durante o jogo grava status='live' (placar aparece, ninguém
 * pontua); no apito final grava 'finished' (+finished_at), o que dispara o
 * trigger trg_recalc_predictions que recalcula os pontos no banco.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

export interface LiveUpdate {
  homeCode: string
  awayCode: string
  homeGoals: number
  awayGoals: number
  finished: boolean
}

export interface LiveApplyResult {
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
  return (obj as { code?: string } | undefined)?.code ?? null
}

interface RawMatchRow {
  id: string
  home: unknown
  away: unknown
  score_locked: boolean | null
}

export async function applyLiveUpdates(
  supabase: SupabaseClient<Database>,
  updates: LiveUpdate[],
): Promise<LiveApplyResult> {
  // índice dos nossos jogos por par de seleções.
  const { data, error } = await supabase
    .from('matches')
    .select('id, score_locked, home:home_team_id(code), away:away_team_id(code)')
  if (error) throw new Error(`Erro ao ler matches: ${error.message}`)

  // jogos com placar travado manualmente não são sobrescritos pela API.
  const byPair = new Map<string, { id: string; homeCode: string; locked: boolean }>()
  for (const r of (data ?? []) as unknown as RawMatchRow[]) {
    const hc = readCode(r.home)
    const ac = readCode(r.away)
    if (!hc || !ac) continue
    byPair.set(pairKey(hc, ac), { id: r.id, homeCode: hc, locked: r.score_locked === true })
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
    // placar travado manualmente: ignora o que a API mandar.
    if (m.locked) continue
    // orienta o placar conforme a ordem casa/fora do NOSSO registro.
    const sameOrientation = m.homeCode === u.homeCode
    const patch: Database['public']['Tables']['matches']['Update'] = {
      home_score: sameOrientation ? u.homeGoals : u.awayGoals,
      away_score: sameOrientation ? u.awayGoals : u.homeGoals,
      status: u.finished ? 'finished' : 'live',
      updated_at: now,
    }
    if (u.finished) patch.finished_at = now

    const { error: upErr } = await supabase.from('matches').update(patch).eq('id', m.id)
    if (upErr) throw new Error(`Erro ao atualizar match ${m.id}: ${upErr.message}`)

    if (u.finished) finished++
    else live++
  }

  return { live, finished, unmatched }
}
