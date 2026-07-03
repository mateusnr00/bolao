// Participantes ocultados do bolão.
//
// Continuam membros de verdade (mantêm login, palpites e seus próprios dados),
// mas somem das listas que a galera enxerga: ranking, palpites da galera,
// pagamentos, contrato, hall da vergonha e a contagem de membros. É só uma
// cortina de exibição — nada é apagado do banco.
//
// Dá pra ocultar por username (case-insensitive) OU por user_id — o id é o
// jeito à prova de falhas, pois independe de o apelido bater. Este módulo é
// neutro (sem `server-only`) de propósito: roda tanto nas queries do servidor
// quanto no componente client dos palpites da galera.

const HIDDEN_USERNAMES = new Set(['willdabet', 'gordogranudo'])
const HIDDEN_USER_IDS = new Set(['89a60311-854c-4762-ade8-c22f7bc48175'])

export function isHiddenUsername(username: string | null | undefined): boolean {
  if (!username) return false
  return HIDDEN_USERNAMES.has(username.trim().toLowerCase())
}

export function isHiddenUserId(userId: string | null | undefined): boolean {
  if (!userId) return false
  return HIDDEN_USER_IDS.has(userId)
}

/** Oculto se casar por id (mais confiável) ou por username. */
export function isHiddenMember(member: {
  userId?: string | null
  username?: string | null
}): boolean {
  return isHiddenUserId(member.userId) || isHiddenUsername(member.username)
}
