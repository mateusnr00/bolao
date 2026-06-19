import type { Metadata } from 'next'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

import { RedefinirForm } from './redefinir-form'

export const metadata: Metadata = {
  title: 'Redefinir senha',
}

export const dynamic = 'force-dynamic'

export default async function RedefinirSenhaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Sem sessão de recuperação (link expirado/aberto direto) → orienta a pedir
  // outro, em vez de mostrar um formulário que não vai salvar.
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="display text-[clamp(32px,9vw,44px)] uppercase leading-none text-ink">
            link expirado
          </h1>
          <p className="text-[14px] text-sepia">
            esse link de redefinição não vale mais. peça um novo pra continuar.
          </p>
        </div>
        <Link
          href="/recuperar"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-ink text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          pedir novo link
        </Link>
        <p className="text-center text-[13px] text-sepia">
          <Link
            href="/login"
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            voltar pro login
          </Link>
        </p>
      </div>
    )
  }

  return <RedefinirForm />
}
