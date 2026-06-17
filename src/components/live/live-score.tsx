'use client'

import { LiveBadge } from '@/components/we26'
import { useLivePair } from '@/lib/live-store'
import { cn } from '@/lib/utils'

const SCORE_SIZE = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
} as const

function minuteLabel(minute: number | null, label: string | null): string | null {
  if (minute != null) return `${minute}'`
  if (!label) return null
  const l = label.toLowerCase()
  if (l === 'ht') return 'intervalo'
  if (l === 'et' || l === 'aet') return 'prorrogação'
  if (l === 'pen' || l === 'pen_live') return 'pênaltis'
  // "live"/"inplay" sem minuto → não mostra texto (o badge AO VIVO já basta)
  if (l === 'live' || l === 'inplay' || l === 'in_play') return null
  return label
}

/**
 * Placar ao vivo vindo do front (polling em /api/live), com minuto correndo.
 * Quando o jogo não está rolando (ou a fonte não tem ele), cai no `fallback` —
 * o placar/estado que veio do servidor. Casa pelo par de seleções e reorienta
 * o placar conforme a ordem casa/fora passada.
 */
export function LiveScore({
  homeCode,
  awayCode,
  size = 'md',
  fallback,
  withBadge = true,
}: {
  homeCode: string
  awayCode: string
  size?: keyof typeof SCORE_SIZE
  fallback: React.ReactNode
  withBadge?: boolean
}) {
  const live = useLivePair(homeCode, awayCode)
  if (!live) return <>{fallback}</>

  const sameOrientation = live.homeCode === homeCode
  const h = sameOrientation ? live.homeGoals : live.awayGoals
  const a = sameOrientation ? live.awayGoals : live.homeGoals
  const min = minuteLabel(live.minute, live.label)

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          'font-mono tabular font-semibold text-phase-semi',
          SCORE_SIZE[size],
        )}
      >
        {h}
        <span className="px-1 text-sepia">×</span>
        {a}
      </span>
      <span className="flex items-center gap-1.5">
        {withBadge && <LiveBadge />}
        {min && (
          <span className="font-mono text-[11px] font-semibold text-phase-semi">
            {min}
          </span>
        )}
      </span>
    </div>
  )
}
