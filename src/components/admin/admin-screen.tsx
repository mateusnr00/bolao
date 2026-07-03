'use client'

import { Ban, Crown, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { setMemberBlocked, setMemberHidden } from '@/components/admin/admin-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'
import type { AdminMember } from '@/lib/queries/admin'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

// botãozinho de moderação: reflete o estado atual e inverte no clique
function ModToggle({
  on,
  busy,
  onLabel,
  offLabel,
  onIcon,
  offIcon,
  tone,
  onClick,
}: {
  on: boolean
  busy: boolean
  onLabel: string
  offLabel: string
  onIcon: React.ReactNode
  offIcon: React.ReactNode
  tone: 'block' | 'hide'
  onClick: () => void
}) {
  const activeCls =
    tone === 'block'
      ? 'border-transparent bg-phase-semi/12 text-phase-semi'
      : 'border-transparent bg-ink/8 text-ink'
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors disabled:opacity-40',
        on ? activeCls : 'border-rule text-sepia hover:bg-bone',
      )}
    >
      {on ? onIcon : offIcon}
      {on ? onLabel : offLabel}
    </button>
  )
}

function MemberRow({ m }: { m: AdminMember }) {
  const [blocked, setBlocked] = useState(m.blocked)
  const [hidden, setHidden] = useState(m.hidden)
  const [busy, startTransition] = useTransition()

  function toggleBlocked() {
    const next = !blocked
    setBlocked(next) // otimista
    startTransition(async () => {
      const res = await setMemberBlocked(m.userId, next)
      if ('error' in res) {
        setBlocked(!next) // desfaz
        toast.error(res.error)
      } else {
        toast.success(next ? `${m.name} não pode mais palpitar` : `${m.name} liberado pra palpitar`)
      }
    })
  }

  function toggleHidden() {
    const next = !hidden
    setHidden(next)
    startTransition(async () => {
      const res = await setMemberHidden(m.userId, next)
      if ('error' in res) {
        setHidden(!next)
        toast.error(res.error)
      } else {
        toast.success(next ? `${m.name} ocultado do bolão` : `${m.name} de volta às listas`)
      }
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2.5">
      <Avatar className={cn('size-10 shrink-0', hidden && 'opacity-50')}>
        {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
        <AvatarFallback className="bg-bone text-[13px] font-semibold text-sepia">
          {initials(m.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn('flex items-center gap-1.5 truncate text-[15px] text-ink', hidden && 'text-sepia')}>
          {m.isMe ? 'você' : m.name}
        </p>
        {m.username && (
          <p className="truncate font-mono text-[12px] text-sepia">@{m.username}</p>
        )}
      </div>

      {m.isOwner ? (
        <span className="flex items-center gap-1.5 rounded-full bg-trophy/15 px-2.5 py-1 text-[12px] font-semibold text-trophy-deep">
          <Crown className="size-3.5" /> dono
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <ModToggle
            on={blocked}
            busy={busy}
            onLabel="bloqueado"
            offLabel="palpita"
            onIcon={<Ban className="size-3.5" />}
            offIcon={<ShieldCheck className="size-3.5" />}
            tone="block"
            onClick={toggleBlocked}
          />
          <ModToggle
            on={hidden}
            busy={busy}
            onLabel="oculto"
            offLabel="visível"
            onIcon={<EyeOff className="size-3.5" />}
            offIcon={<Eye className="size-3.5" />}
            tone="hide"
            onClick={toggleHidden}
          />
        </div>
      )}
    </li>
  )
}

export function AdminScreen({
  poolName,
  members,
}: {
  poolName: string
  members: AdminMember[]
}) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="ranking" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">
              painel do dono
            </h1>
            <p className="text-[13px] text-sepia">{poolName}</p>
          </section>

          <div className="grid gap-2 rounded-lg border border-rule bg-bone/50 p-4 text-[13px] text-sepia">
            <p className="flex items-center gap-2">
              <Ban className="size-4 shrink-0 text-phase-semi" />
              <span>
                <b className="text-ink">bloquear</b> — a pessoa não consegue mais
                registrar nem editar palpite neste bolão.
              </span>
            </p>
            <p className="flex items-center gap-2">
              <EyeOff className="size-4 shrink-0 text-ink" />
              <span>
                <b className="text-ink">ocultar</b> — some do ranking, palpites da
                galera, cobrança, contrato e da contagem. Continua no bolão.
              </span>
            </p>
          </div>

          <Rule />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Eyebrow>membros</Eyebrow>
              <Eyebrow className="text-[10px]">{members.length}</Eyebrow>
            </div>
            <ul className="-mx-2 divide-y divide-rule/60">
              {members.map((m) => (
                <MemberRow key={m.userId} m={m} />
              ))}
            </ul>
          </section>
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
