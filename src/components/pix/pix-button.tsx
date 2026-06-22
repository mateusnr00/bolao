'use client'

import { Check, Copy, QrCode, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

import { checkPayment, createPix } from '@/components/pix/actions'
import { DONKEY_SRC } from '@/lib/brand'

export function PixButton() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [pix, setPix] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPending, start] = useTransition()

  function reset() {
    setOpen(false)
    setPix(null)
    setQr(null)
    setPaymentId(null)
    setApproved(false)
    setAmount('')
    setCopied(false)
  }

  // "puxa" a aprovação do webhook: enquanto pendente, consulta o status
  useEffect(() => {
    if (!paymentId || approved) return
    const id = setInterval(async () => {
      const res = await checkPayment(paymentId)
      if (res.status === 'APPROVED') setApproved(true)
    }, 3000)
    return () => clearInterval(id)
  }, [paymentId, approved])

  function gerar() {
    const value = parseFloat(amount.replace(',', '.'))
    if (!value || value <= 0) {
      toast.error('Informe um valor')
      return
    }
    start(async () => {
      const res = await createPix(value)
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      setPix(res.pixCode)
      setQr(res.qr)
      setPaymentId(res.paymentId)
    })
  }

  async function copy() {
    if (!pix) return
    try {
      await navigator.clipboard.writeText(pix)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não deu pra copiar')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-bone sm:px-3"
      >
        <QrCode className="size-4 text-sepia" />
        <span className="hidden sm:inline">pagar</span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
            onClick={reset}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] rounded-xl border border-rule bg-paper p-5 shadow-xl"
            >
              {approved ? (
                /* ── pagamento aprovado ─────────────────────────────── */
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={DONKEY_SRC}
                    alt=""
                    className="size-20 rounded-full object-cover ring-2 ring-grass"
                  />
                  <h2 className="display text-[26px] uppercase leading-none text-ink">
                    pagamento aprovado!
                  </h2>
                  <p className="text-[15px] text-sepia">
                    é isso, burrinho — agora bora fazer seus palpites. 🫏
                  </p>
                  <Link
                    href="/palpites"
                    onClick={reset}
                    className="mt-1 flex h-11 w-full items-center justify-center rounded-md bg-ink text-[15px] font-medium text-paper"
                  >
                    fazer meus palpites
                  </Link>
                </div>
              ) : !pix ? (
                /* ── digitar valor ──────────────────────────────────── */
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[17px] font-semibold text-ink">pagar via PIX</h2>
                    <button type="button" onClick={reset} aria-label="fechar">
                      <X className="size-4 text-sepia transition-colors hover:text-ink" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="pix-amount" className="block text-[13px] text-sepia">
                      valor (R$)
                    </label>
                    <input
                      id="pix-amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-11 w-full rounded-md border border-rule-dark bg-paper px-3 font-mono text-[16px] text-ink outline-none focus:border-trophy"
                    />
                    <button
                      type="button"
                      onClick={gerar}
                      disabled={isPending}
                      className="h-11 w-full rounded-md bg-ink text-[15px] font-medium text-paper transition-opacity disabled:opacity-50"
                    >
                      {isPending ? 'gerando…' : 'gerar PIX'}
                    </button>
                  </div>
                </>
              ) : (
                /* ── PIX gerado: QR + copia e cola ──────────────────── */
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[17px] font-semibold text-ink">pague o PIX</h2>
                    <button type="button" onClick={reset} aria-label="fechar">
                      <X className="size-4 text-sepia transition-colors hover:text-ink" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {qr && (
                      <div className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qr}
                          alt="QR Code do PIX"
                          className="size-52 rounded-lg border border-rule bg-white p-2"
                        />
                      </div>
                    )}
                    <p className="text-center text-[12px] text-sepia">
                      escaneie o QR ou copie o código. a confirmação é automática.
                    </p>
                    <textarea
                      readOnly
                      value={pix}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-20 w-full resize-none rounded-md border border-rule bg-bone/40 p-2.5 font-mono text-[11px] leading-relaxed text-ink"
                    />
                    <button
                      type="button"
                      onClick={copy}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink text-[15px] font-medium text-paper"
                    >
                      {copied ? (
                        <>
                          <Check className="size-4" /> copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" /> copiar código
                        </>
                      )}
                    </button>
                    <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-sepia">
                      <span className="size-1.5 animate-pulse rounded-full bg-grass" />
                      aguardando o pagamento…
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
