'use client'

import { Check, Eraser, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { toast } from 'sonner'

import { signContract } from '@/components/contrato/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'
import {
  CONTRACT_ACCEPT,
  CONTRACT_CLAUSES,
  CONTRACT_INTRO,
} from '@/lib/contract'
import type { MemberSign, MySignature } from '@/lib/queries/contracts'

// ── área de assinatura (canvas) ─────────────────────────────────────────────
interface PadHandle {
  clear: () => void
  toDataURL: () => string
}

const SignaturePad = forwardRef<PadHandle, { onInkChange: (hasInk: boolean) => void }>(
  function SignaturePad({ onInkChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawing = useRef(false)
    const inked = useRef(false)
    const last = useRef<{ x: number; y: number } | null>(null)

    const paintBg = () => {
      const c = canvasRef.current
      const x = c?.getContext('2d')
      if (!c || !x) return
      x.save()
      x.setTransform(1, 0, 0, 1, 0, 0)
      x.fillStyle = '#ffffff'
      x.fillRect(0, 0, c.width, c.height)
      x.restore()
    }

    useLayoutEffect(() => {
      const c = canvasRef.current
      if (!c) return
      const dpr = window.devicePixelRatio || 1
      const rect = c.getBoundingClientRect()
      c.width = Math.round(rect.width * dpr)
      c.height = Math.round(rect.height * dpr)
      const x = c.getContext('2d')
      if (x) {
        x.scale(dpr, dpr)
        x.lineCap = 'round'
        x.lineJoin = 'round'
        x.lineWidth = 2.5
        x.strokeStyle = '#1a1a1a'
      }
      paintBg()
    }, [])

    const pos = (e: React.PointerEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const down = (e: React.PointerEvent) => {
      drawing.current = true
      last.current = pos(e)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const move = (e: React.PointerEvent) => {
      if (!drawing.current) return
      const x = canvasRef.current?.getContext('2d')
      if (!x || !last.current) return
      const p = pos(e)
      x.beginPath()
      x.moveTo(last.current.x, last.current.y)
      x.lineTo(p.x, p.y)
      x.stroke()
      last.current = p
      if (!inked.current) {
        inked.current = true
        onInkChange(true)
      }
    }
    const up = () => {
      drawing.current = false
      last.current = null
    }

    useImperativeHandle(ref, () => ({
      clear() {
        paintBg()
        inked.current = false
        onInkChange(false)
      },
      toDataURL() {
        return canvasRef.current?.toDataURL('image/png') ?? ''
      },
    }))

    return (
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="h-44 w-full touch-none rounded-lg border-2 border-dashed border-rule-dark bg-white"
      />
    )
  },
)

// ── tela do contrato ────────────────────────────────────────────────────────
function ContractBody() {
  return (
    <div className="space-y-4 rounded-xl border border-rule bg-bone/40 p-5">
      <p className="display text-[18px] uppercase tracking-wide text-ink">{CONTRACT_INTRO}</p>
      {CONTRACT_CLAUSES.map((c) => (
        <div key={c.title} className="space-y-1.5">
          <p className="text-[15px] font-semibold text-ink">
            {c.icon} {c.title}
          </p>
          <ul className="space-y-1 pl-1">
            {c.items.map((it, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-sepia">
                <span className="text-trophy">•</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Rule />
      <p className="text-[14px] font-medium italic leading-relaxed text-ink">“{CONTRACT_ACCEPT}”</p>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (a + b).toUpperCase()
}

function SignRow({ m, ok }: { m: MemberSign; ok: boolean }) {
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
      {ok ? (
        <span className="flex items-center gap-1.5 rounded-full bg-grass/12 px-2.5 py-1 text-[12px] font-semibold text-grass">
          <Check className="size-3.5" /> assinou
        </span>
      ) : (
        <span className="rounded-full bg-phase-semi/12 px-2.5 py-1 text-[12px] font-semibold text-phase-semi">
          falta assinar
        </span>
      )}
    </li>
  )
}

export function ContractScreen({
  signed,
  signedMembers,
  unsignedMembers,
}: {
  signed: MySignature | null
  signedMembers: MemberSign[]
  unsignedMembers: MemberSign[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [hasInk, setHasInk] = useState(false)
  const [done, setDone] = useState(false)
  const [isPending, start] = useTransition()
  const padRef = useRef<PadHandle>(null)

  const alreadySigned = signed ?? null
  const canSubmit = name.trim().length >= 3 && hasInk && !isPending

  function submit() {
    const signature = padRef.current?.toDataURL() ?? ''
    if (!signature) {
      toast.error('Faça a assinatura')
      return
    }
    start(async () => {
      const res = await signContract({ fullName: name, signature })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      setDone(true)
      router.refresh() // atualiza a lista de quem assinou
    })
  }

  const signedView = alreadySigned || done

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="regras" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-6">
          <section className="space-y-1">
            <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">
              contrato do bolão
            </h1>
            <p className="text-[13px] text-sepia">
              leia as regras e assine pra entrar oficialmente.
            </p>
          </section>

          <ContractBody />

          {signedView ? (
            /* ── já assinado ──────────────────────────────────────────── */
            <section className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-xl border border-grass/40 bg-grass/8 px-4 py-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-grass/15">
                  <Check className="size-6 text-grass" />
                </span>
                <h2 className="display text-[22px] uppercase leading-none text-ink">
                  contrato assinado com sucesso
                </h2>
                <p className="text-[14px] text-sepia">
                  você está oficialmente participando do bolão. 🤝
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-rule bg-paper p-4">
                <Eyebrow>assinatura</Eyebrow>
                {alreadySigned ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={alreadySigned.signature}
                      alt="sua assinatura"
                      className="h-36 w-full rounded-lg border border-rule bg-white object-contain"
                    />
                    <p className="text-[14px] text-ink">{alreadySigned.fullName}</p>
                    <p className="text-[12px] text-sepia">
                      assinado em{' '}
                      {new Date(alreadySigned.signedAt).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-[14px] text-ink">{name}</p>
                )}
                <p className="flex items-center gap-1.5 pt-1 text-[12px] text-sepia">
                  <Lock className="size-3.5" /> a assinatura não pode ser alterada. peça pro admin
                  liberar se precisar refazer.
                </p>
              </div>
            </section>
          ) : (
            /* ── assinar ──────────────────────────────────────────────── */
            <section className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="full-name" className="block text-[13px] text-sepia">
                  nome completo
                </label>
                <input
                  id="full-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="seu nome completo"
                  className="h-11 w-full rounded-md border border-rule-dark bg-paper px-3 text-[16px] text-ink outline-none focus:border-trophy"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] text-sepia">assine abaixo</label>
                  <button
                    type="button"
                    onClick={() => padRef.current?.clear()}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-sepia transition-colors hover:text-ink"
                  >
                    <Eraser className="size-3.5" /> limpar assinatura
                  </button>
                </div>
                <SignaturePad ref={padRef} onInkChange={setHasInk} />
                <p className="text-center text-[12px] text-sepia">
                  assine com o dedo, o mouse ou o touchpad.
                </p>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="h-12 w-full rounded-md bg-ink text-[15px] font-semibold text-paper transition-opacity disabled:opacity-40"
              >
                {isPending ? 'assinando…' : 'aceitar e assinar contrato'}
              </button>
            </section>
          )}

          {(signedMembers.length > 0 || unsignedMembers.length > 0) && (
            <>
              <Rule />
              <section className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-rule bg-bone/50 p-4">
                    <Eyebrow>assinaram</Eyebrow>
                    <p className="display text-3xl text-grass tabular">{signedMembers.length}</p>
                  </div>
                  <div className="rounded-lg border border-rule bg-bone/50 p-4">
                    <Eyebrow>faltam assinar</Eyebrow>
                    <p className="display text-3xl text-phase-semi tabular">
                      {unsignedMembers.length}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Eyebrow>não assinou</Eyebrow>
                  {unsignedMembers.length === 0 ? (
                    <p className="py-8 text-center text-[14px] text-sepia">
                      todo mundo assinou. 🤝
                    </p>
                  ) : (
                    <ul className="-mx-2">
                      {unsignedMembers.map((m) => (
                        <SignRow key={m.userId} m={m} ok={false} />
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <Eyebrow>já assinou</Eyebrow>
                  {signedMembers.length === 0 ? (
                    <p className="py-8 text-center text-[14px] text-sepia">
                      ninguém assinou ainda.
                    </p>
                  ) : (
                    <ul className="-mx-2">
                      {signedMembers.map((m) => (
                        <SignRow key={m.userId} m={m} ok />
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <BottomNav active="ranking" />
    </div>
  )
}
