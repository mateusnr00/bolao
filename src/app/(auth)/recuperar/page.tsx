import type { Metadata } from 'next'

import { RecuperarForm } from './recuperar-form'

export const metadata: Metadata = {
  title: 'Esqueci a senha',
}

export default function RecuperarPage() {
  return <RecuperarForm />
}
