'use client'

import { Check, Copy, QrCode, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

import { createPix } from '@/components/pix/actions'

export function PixButton() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [pix, setPix] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, start] = useTransition()

  function reset() {
    setOpen(false)
    setPix(null)
    setAmount('')
    setCopied(false)
  }

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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">pagar via PIX</h2>
              <button type="button" onClick={reset} aria-label="fechar">
                <X className="size-4 text-sepia transition-colors hover:text-ink" />
              </button>
            </div>

            {!pix ? (
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
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-sepia">
                  copie o código abaixo e pague no app do seu banco (PIX copia e
                  cola). a confirmação é automática.
                </p>
                <textarea
                  readOnly
                  value={pix}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-28 w-full resize-none rounded-md border border-rule bg-bone/40 p-2.5 font-mono text-[11px] leading-relaxed text-ink"
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
                <button
                  type="button"
                  onClick={reset}
                  className="h-9 w-full text-[13px] font-medium text-sepia transition-colors hover:text-ink"
                >
                  fechar
                </button>
              </div>
            )}
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}
