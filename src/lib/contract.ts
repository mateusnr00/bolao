// Texto oficial do contrato do bolão. Guardado junto da assinatura (snapshot),
// pra valer exatamente o que a pessoa leu mesmo se o texto mudar depois.
export const CONTRACT_VERSION = 'v1'

export const CONTRACT_ACCEPT =
  'Declaro que li, entendi e aceito participar do bolão conforme as regras acima.'

export interface ContractClause {
  icon: string
  title: string
  items: string[]
}

export const CONTRACT_INTRO = 'GALERA, FICOU ASSIM O BOLÃO:'

export const CONTRACT_CLAUSES: ContractClause[] = [
  {
    icon: '💰',
    title: 'Valor',
    items: ['R$ 20 por pessoa, válido até o final da Copa.'],
  },
  {
    icon: '🐴',
    title: 'Castigos para quem ficar em último',
    items: [
      'Fase de grupos completa: 1 vídeo falando que é o “burrinho da fase de grupos”.',
      '16 avos de final: 1 vídeo.',
      'Oitavas de final: 1 vídeo.',
      'Quartas, semifinal e final: 1 único vídeo, considerando as três fases juntas.',
      'Em caso de empate na última colocação, todos os empatados deverão gravar o vídeo.',
    ],
  },
  {
    icon: '🏆',
    title: 'Castigo final',
    items: [
      'Quem terminar em último lugar na classificação geral do bolão fará o pior vídeo de todos, com o texto ainda a definir.',
    ],
  },
]

// Versão em texto puro do contrato — é o que fica salvo em contract_text.
export const CONTRACT_TEXT = [
  CONTRACT_INTRO,
  '',
  ...CONTRACT_CLAUSES.flatMap((c) => [
    `${c.icon} ${c.title}:`,
    ...c.items.map((i) => `- ${i}`),
    '',
  ]),
  CONTRACT_ACCEPT,
]
  .join('\n')
  .trim()
