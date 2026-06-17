'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Atualiza os dados da página (router.refresh re-busca o server component) num
 * intervalo, enquanto há jogo ao vivo. Só renderizado quando existe partida
 * 'live', então fora desse cenário não custa nada. Pausa com a aba em segundo
 * plano pra não ficar batendo no servidor à toa.
 */
export function LiveRefresher({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return null
}
