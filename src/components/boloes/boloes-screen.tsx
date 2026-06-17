'use client'

import { Check, Copy, Crown, Plus, Share2, Ticket, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { BottomNav, Eyebrow, TopNav } from '@/components/we26'
import { cn } from '@/lib/utils'

export interface PoolCard {
  id: string
  name: string
  slug: string
  inviteCode: string
  isOwner: boolean
  memberCount: number
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('código copiado')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('não deu pra copiar')
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border border-rule px-2 py-1 font-mono text-[13px] font-medium tracking-wide text-ink transition-colors hover:bg-bone"
    >
      {code}
      {copied ? (
        <Check className="size-3.5 text-grass" />
      ) : (
        <Copy className="size-3.5 text-sepia" />
      )}
    </button>
  )
}

function ShareButton({ pool }: { pool: PoolCard }) {
  function share() {
    const text = `bora palpitar na Copa 2026 comigo no bolão "${pool.name}"? entra com o código ${pool.inviteCode}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-trophy-deep transition-colors hover:text-ink"
    >
      <Share2 className="size-3.5" /> convidar
    </button>
  )
}

function PoolRow({ pool }: { pool: PoolCard }) {
  return (
    <li className="space-y-2.5 rounded-lg border border-rule p-4 transition-colors hover:border-rule-dark">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-ink">{pool.name}</p>
          <div className="mt-1 flex items-center gap-x-2 gap-y-1 text-[12px] text-sepia">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {pool.memberCount} {pool.memberCount === 1 ? 'membro' : 'membros'}
            </span>
            {pool.isOwner && (
              <>
                <span className="text-rule">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-trophy-deep">
                  <Crown className="size-3.5" /> dono
                </span>
              </>
            )}
          </div>
        </div>
        <Link
          href="/palpites"
          className="shrink-0 text-[13px] font-medium text-sepia transition-colors hover:text-ink"
        >
          palpitar →
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3">
        <CopyCode code={pool.inviteCode} />
        <ShareButton pool={pool} />
      </div>
    </li>
  )
}

function CtaCard({
  href,
  icon: Icon,
  title,
  desc,
  primary,
}: {
  href: string
  icon: typeof Plus
  title: string
  desc: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4 transition-colors',
        primary
          ? 'border-ink bg-ink text-paper hover:bg-ink/90'
          : 'border-rule text-ink hover:bg-bone',
      )}
    >
      <Icon className={cn('size-5', primary ? 'text-paper' : 'text-trophy-deep')} />
      <span className="text-[15px] font-semibold">{title}</span>
      <span className={cn('text-[12px]', primary ? 'text-paper/70' : 'text-sepia')}>
        {desc}
      </span>
    </Link>
  )
}

export function BoloesScreen({ pools }: { pools: PoolCard[] }) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="boloes" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">bolões</h1>

          <div className="grid grid-cols-2 gap-3">
            <CtaCard
              href="/boloes/criar"
              icon={Plus}
              title="criar bolão"
              desc="monte o seu e convide a galera"
              primary
            />
            <CtaCard
              href="/boloes/entrar"
              icon={Ticket}
              title="entrar com código"
              desc="recebeu um convite? cola aqui"
            />
          </div>

          <section className="space-y-3">
            <Eyebrow>meus bolões</Eyebrow>
            {pools.length === 0 ? (
              <p className="rounded-lg border border-dashed border-rule px-4 py-10 text-center text-[14px] text-sepia">
                você ainda não está em nenhum bolão.
                <br />
                crie o seu ou entre com um código.
              </p>
            ) : (
              <ul className="space-y-3">
                {pools.map((p) => (
                  <PoolRow key={p.id} pool={p} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <BottomNav active="inicio" />
    </div>
  )
}
