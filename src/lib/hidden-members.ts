// Participantes ocultados do bolão.
//
// Continuam membros de verdade (mantêm login, palpites e seus próprios dados),
// mas somem das listas que a galera enxerga: ranking, palpites da galera,
// pagamentos, contrato, hall da vergonha e a contagem de membros. É só uma
// cortina de exibição — nada é apagado do banco.
//
// O casamento é por username (case-insensitive), pois é o identificador estável
// do perfil. Este módulo é neutro (sem `server-only`) de propósito: roda tanto
// nas queries do servidor quanto no componente client dos palpites da galera.

const HIDDEN_USERNAMES = new Set(['willdabet', 'gordogranudo'])

export function isHiddenUsername(username: string | null | undefined): boolean {
  if (!username) return false
  return HIDDEN_USERNAMES.has(username.trim().toLowerCase())
}
