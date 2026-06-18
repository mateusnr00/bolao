'use server'

import { createClient } from '@/lib/supabase/server'

const ALLOWED = new Set(['😂', '🤡', '💩', '🫏', '🤮'])

export type ToggleReactionResult =
  | { error: string }
  | { ok: true; active: boolean }

export async function toggleReaction(input: {
  matchId: string
  targetUserId: string
  emoji: string
}): Promise<ToggleReactionResult> {
  if (!ALLOWED.has(input.emoji)) return { error: 'Reação inválida' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado' }
  if (user.id === input.targetUserId) {
    return { error: 'Reaja no palpite dos outros, não no seu 😅' }
  }

  // só dá pra reagir depois do apito (anti-cola)
  const { data: m } = await supabase
    .from('matches')
    .select('status, kickoff_at')
    .eq('id', input.matchId)
    .maybeSingle()
  if (!m) return { error: 'Jogo não encontrado' }
  const started = m.status !== 'scheduled' || new Date(m.kickoff_at) <= new Date()
  if (!started) return { error: 'Só dá pra reagir depois do apito' }

  // toggle: existe → remove; não existe → cria
  const { data: existing } = await supabase
    .from('palpite_reactions')
    .select('id')
    .eq('match_id', input.matchId)
    .eq('target_user_id', input.targetUserId)
    .eq('reactor_id', user.id)
    .eq('emoji', input.emoji)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('palpite_reactions')
      .delete()
      .eq('id', existing.id)
    if (error) return { error: 'Não deu pra remover a reação' }
    return { ok: true, active: false }
  }

  const { error } = await supabase.from('palpite_reactions').insert({
    match_id: input.matchId,
    target_user_id: input.targetUserId,
    reactor_id: user.id,
    emoji: input.emoji,
  })
  if (error) return { error: 'Não deu pra reagir' }
  return { ok: true, active: true }
}
