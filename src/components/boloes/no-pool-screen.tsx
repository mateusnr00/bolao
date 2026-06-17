import { Plus, Ticket } from 'lucide-react'
import Link from 'next/link'

import { BottomNav, TopNav } from '@/components/we26'
import { cn } from '@/lib/utils'

type NavKey = 'inicio' | 'boloes' | 'palpites' | 'ranking' | 'perfil'

export function NoPoolScreen({
  active = 'inicio',
  title,
  subtitle,
}: {
  active?: NavKey
  title: string
  subtitle: string
}) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active={active} />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-2">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">{title}</h1>
            <p className="text-[14px] text-sepia">{subtitle}</p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/boloes/criar"
              className="flex flex-col gap-2 rounded-lg border border-ink bg-ink p-4 text-paper transition-colors hover:bg-ink/90"
            >
              <Plus className="size-5 text-paper" />
              <span className="text-[15px] font-semibold">criar bolão</span>
              <span className="text-[12px] text-paper/70">monte o seu e convide a galera</span>
            </Link>
            <Link
              href="/boloes/entrar"
              className={cn(
                'flex flex-col gap-2 rounded-lg border border-rule p-4 text-ink transition-colors hover:bg-bone',
              )}
            >
              <Ticket className="size-5 text-trophy-deep" />
              <span className="text-[15px] font-semibold">entrar com código</span>
              <span className="text-[12px] text-sepia">recebeu um convite? cola aqui</span>
            </Link>
          </div>
        </div>
      </main>

      <BottomNav active={active} />
    </div>
  )
}
