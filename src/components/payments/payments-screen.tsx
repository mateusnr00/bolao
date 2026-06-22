'use client'

import { Check, Clipboard } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { markMemberPaid, unmarkMemberPaid } from '@/components/payments/admin-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'

import type { MemberPayment } from '@/lib/queries/payments'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function Row({
  m,
  kind,
  isOwner,
  busy,
  onMark,
  onUnmark,
}: {
  m: MemberPayment
  kind: 'paid' | 'unpaid'
  isOwner: boolean
  busy: boolean
  onMark: (id: string) => void
  onUnmark: (id: string) => void
}) {
  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-2.5">
      <Avatar className="size-10 shrink-0">
        {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
        <AvatarFallback className="bg-bone text-[13px] font-semibold text-sepia">
          {initials(m.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-ink">{m.isMe ? 'você' : m.name}</p>
        {m.username && (
          <p className="truncate font-mono text-[12px] text-sepia">@{m.username}</p>
        )}
      </div>

      {kind === 'paid' ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-grass/12 px-2.5 py-1 text-[12px] font-semibold text-grass">
            <Check className="size-3.5" /> {m.manual ? 'pago (manual)' : 'pagou'}
          </span>
          {isOwner && m.manual && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUnmark(m.userId)}
              className="text-[12px] font-medium text-sepia transition-colors hover:text-phase-semi disabled:opacity-40"
            >
              desfazer
            </button>
          )}
        </div>
      ) : isOwner ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onMark(m.userId)}
          className="rounded-full border border-rule px-3 py-1 text-[12px] font-semibold text-ink transition-colors hover:bg-bone disabled:opacity-40"
        >
          marcar pago
        </button>
      ) : (
        <span className="rounded-full bg-phase-semi/12 px-2.5 py-1 text-[12px] font-semibold text-phase-semi">
          falta pagar
        </span>
      )}
    </li>
  )
}

export function PaymentsScreen({
  poolName,
  isOwner,
  paid,
  unpaid,
}: {
  poolName: string
  isOwner: boolean
  paid: MemberPayment[]
  unpaid: MemberPayment[]
}) {
  const [copied, setCopied] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, start] = useTransition()

  async function copyUnpaid() {
    const list = unpaid.map((m) => m.name).join('\n')
    try {
      await navigator.clipboard.writeText(list)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não deu pra copiar')
    }
  }

  function mark(id: string) {
    setBusyId(id)
    start(async () => {
      const res = await markMemberPaid(id)
      setBusyId(null)
      if ('error' in res) toast.error(res.error)
      else toast.success('marcado como pago')
    })
  }

  function unmark(id: string) {
    setBusyId(id)
    start(async () => {
      const res = await unmarkMemberPaid(id)
      setBusyId(null)
      if ('error' in res) toast.error(res.error)
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="ranking" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">cobrança 💸</h1>
            <p className="text-[13px] text-sepia">{poolName}</p>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-rule bg-bone/50 p-4">
              <Eyebrow>pagaram</Eyebrow>
              <p className="display text-3xl text-grass tabular">{paid.length}</p>
            </div>
            <div className="rounded-lg border border-rule bg-bone/50 p-4">
              <Eyebrow>faltam pagar</Eyebrow>
              <p className="display text-3xl text-phase-semi tabular">{unpaid.length}</p>
            </div>
          </section>

          <Rule />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Eyebrow>não pagou</Eyebrow>
              {unpaid.length > 0 && (
                <button
                  type="button"
                  onClick={copyUnpaid}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-sepia transition-colors hover:text-ink"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5" /> copiado!
                    </>
                  ) : (
                    <>
                      <Clipboard className="size-3.5" /> copiar lista
                    </>
                  )}
                </button>
              )}
            </div>
            {unpaid.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-sepia">todo mundo pagou. 🎉</p>
            ) : (
              <ul className="-mx-2">
                {unpaid.map((m) => (
                  <Row
                    key={m.userId}
                    m={m}
                    kind="unpaid"
                    isOwner={isOwner}
                    busy={busyId === m.userId}
                    onMark={mark}
                    onUnmark={unmark}
                  />
                ))}
              </ul>
            )}
          </section>

          <Rule />

          <section className="space-y-2">
            <Eyebrow>já pagou</Eyebrow>
            {paid.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-sepia">ninguém pagou ainda.</p>
            ) : (
              <ul className="-mx-2">
                {paid.map((m) => (
                  <Row
                    key={m.userId}
                    m={m}
                    kind="paid"
                    isOwner={isOwner}
                    busy={busyId === m.userId}
                    onMark={mark}
                    onUnmark={unmark}
                  />
                ))}
              </ul>
            )}
          </section>

          <p className="pt-2 text-center text-[12px] text-sepia">
            {isOwner
              ? 'confirma na mão quem você viu pagar no extrato. o PIX confirmado também marca sozinho.'
              : 'marca quem pagou automaticamente quando o PIX é confirmado.'}
          </p>
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
