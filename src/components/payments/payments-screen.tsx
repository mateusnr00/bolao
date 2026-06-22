'use client'

import { Check, Clipboard, Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'

import type { MemberPayment } from '@/lib/queries/payments'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function Row({ m, kind }: { m: MemberPayment; kind: 'paid' | 'unpaid' }) {
  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-2.5">
      <Avatar className="size-10 shrink-0">
        {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
        <AvatarFallback className="bg-bone text-[13px] font-semibold text-sepia">
          {initials(m.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-ink">
          {m.isMe ? 'você' : m.name}
        </p>
        {m.username && (
          <p className="truncate font-mono text-[12px] text-sepia">@{m.username}</p>
        )}
      </div>
      {kind === 'paid' ? (
        <span className="flex items-center gap-1.5 rounded-full bg-grass/12 px-2.5 py-1 text-[12px] font-semibold text-grass">
          <Check className="size-3.5" /> pagou
        </span>
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

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="ranking" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">cobrança 💸</h1>
            <p className="text-[13px] text-sepia">{poolName}</p>
          </section>

          {!isOwner ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-rule bg-bone/40 px-4 py-12 text-center">
              <Lock className="size-6 text-sepia" />
              <p className="text-[15px] text-sepia">
                só o dono do bolão vê quem pagou e quem falta cobrar.
              </p>
            </div>
          ) : (
            <>
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
                  <p className="py-8 text-center text-[14px] text-sepia">
                    todo mundo pagou. 🎉
                  </p>
                ) : (
                  <ul className="-mx-2">
                    {unpaid.map((m) => (
                      <Row key={m.userId} m={m} kind="unpaid" />
                    ))}
                  </ul>
                )}
              </section>

              <Rule />

              <section className="space-y-2">
                <Eyebrow>já pagou</Eyebrow>
                {paid.length === 0 ? (
                  <p className="py-8 text-center text-[14px] text-sepia">
                    ninguém pagou ainda.
                  </p>
                ) : (
                  <ul className="-mx-2">
                    {paid.map((m) => (
                      <Row key={m.userId} m={m} kind="paid" />
                    ))}
                  </ul>
                )}
              </section>

              <p className="pt-2 text-center text-[12px] text-sepia">
                marca quem pagou automaticamente quando o PIX é confirmado.
              </p>
            </>
          )}
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
