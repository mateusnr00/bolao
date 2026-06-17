import type { Metadata } from 'next'

import { RegrasScreen } from '@/components/regras/regras-screen'

export const metadata: Metadata = {
  title: 'Regras',
  description: 'Como funciona o bolão: palpites, trava, pontuação e ranking.',
}

export default function RegrasPage() {
  return <RegrasScreen />
}
