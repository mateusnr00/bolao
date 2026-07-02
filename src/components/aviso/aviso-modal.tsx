'use client'

import { XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

// Imagem do aviso (bucket público no Supabase Storage).
const AVISO_SRC =
  'https://wqnsdhqqbxhdjwnhdeej.supabase.co/storage/v1/object/public/AVISO/aviso.png'

// Chave de sessão: uma vez fechado, não reaparece nesta sessão do navegador
// (evita reabrir a cada navegação/refresh). Some ao fechar a aba.
const DISMISS_KEY = 'aviso-dismissed'

/**
 * Aviso que abre ao entrar no site: mostra a imagem do aviso por cima de tudo,
 * com um X no canto pra fechar. Fecha também no Esc ou clicando no fundo.
 */
export function AvisoModal() {
  const [open, setOpen] = useState(false)

  // decide na montagem (client-only, lendo sessionStorage) pra não piscar no SSR.
  // setState pós-montagem é intencional: sincroniza com um estado externo
  // (sessionStorage) que não existe no servidor, evitando mismatch de hidratação.
  useEffect(() => {
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      dismissed = false
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setOpen(true)
  }, [])

  // trava o scroll do fundo e fecha no Esc enquanto estiver aberto.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  function close() {
    setOpen(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // sessionStorage indisponível: fecha mesmo assim.
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aviso"
      onClick={close}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 supports-backdrop-filter:backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-full max-w-lg"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fechar aviso"
          className="absolute -top-3 -right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <XIcon className="size-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={AVISO_SRC}
          alt="Aviso"
          className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}
