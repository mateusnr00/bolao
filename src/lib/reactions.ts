import { createClient } from '@/lib/supabase/client'

// emojis de zoeira sugeridos pra reagir nos palpites (dá pra digitar outro)
export const REACTION_EMOJIS = ['😂', '🤡', '💩', '🫏', '🤮', '😱'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

// estado das reações de um palpite: por emoji, quantos e se eu reagi
export type ReactionState = Record<string, { count: number; mine: boolean }>

/** Busca todas as reações de um jogo e agrupa por usuário-alvo (quem foi reagido). */
export async function fetchMatchReactions(
  matchId: string,
): Promise<Map<string, ReactionState>> {
  const supabase = createClient()
  const [{ data: auth }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('palpite_reactions')
      .select('target_user_id, reactor_id, emoji')
      .eq('match_id', matchId),
  ])
  const meId = auth.user?.id

  const map = new Map<string, ReactionState>()
  for (const r of data ?? []) {
    const st = map.get(r.target_user_id) ?? {}
    const cur = st[r.emoji] ?? { count: 0, mine: false }
    cur.count += 1
    if (meId && r.reactor_id === meId) cur.mine = true
    st[r.emoji] = cur
    map.set(r.target_user_id, st)
  }
  return map
}
