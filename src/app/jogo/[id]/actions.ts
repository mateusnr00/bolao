'use server'

import { revalidatePath } from 'next/cache'

import { getUserPoolIds } from '@/lib/queries/predictions'
import { createClient } from '@/lib/supabase/server'
import { predictionSchema } from '@/lib/validations'

export type SavePredictionResult = { error: string } | { ok: true }

export async function savePrediction(input: {
  matchId: string
  homeScore: number
  awayScore: number
}): Promise<SavePredictionResult> {
  const parsed = predictionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const { matchId, homeScore, awayScore } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado' }

  // Trava no apito: precisa estar agendado e ainda não ter começado.
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('kickoff_at, status')
    .eq('id', matchId)
    .maybeSingle()
  if (matchErr) return { error: 'Erro ao validar o jogo' }
  if (!match) return { error: 'Jogo não encontrado' }
  if (match.status !== 'scheduled' || new Date(match.kickoff_at) <= new Date()) {
    return { error: 'Palpites encerrados para este jogo' }
  }

  const poolIds = await getUserPoolIds()
  if (poolIds.length === 0) {
    return { error: 'Entre em um bolão antes de palpitar' }
  }

  // Um placar, replicado em todos os bolões do usuário.
  const rows = poolIds.map((poolId) => ({
    user_id: user.id,
    match_id: matchId,
    pool_id: poolId,
    home_score: homeScore,
    away_score: awayScore,
  }))

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'user_id,match_id,pool_id' })
  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` }
  }

  revalidatePath(`/jogo/${matchId}`)
  revalidatePath('/palpites')
  return { ok: true }
}
