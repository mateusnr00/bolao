import { cn } from '@/lib/utils'

// Elemento-assinatura: 48 unidades (8 col × 6 lin), cada uma representando uma
// das 48 seleções / um jogo / um palpite. Só quadrados e quartos de círculo.
// Posições dos quartos de círculo são FIXAS em todo o app (consistência = marca).
// Mapa (linha-coluna 1-indexado) → canto do quarto de círculo.
const QUARTERS: Record<string, 'tl' | 'tr' | 'bl' | 'br'> = {
  '1-3': 'tl',
  '1-6': 'tr',
  '2-2': 'br',
  '2-7': 'bl',
  '3-4': 'tr',
  '3-5': 'tl',
  '4-1': 'br',
  '4-8': 'bl',
  '5-3': 'tl',
  '5-6': 'tr',
  '6-2': 'br',
  '6-7': 'bl',
  '6-4': 'tr',
  '6-5': 'tl',
}

const COLS = 8
const ROWS = 6
const TOTAL = COLS * ROWS

function quarterPath(corner: 'tl' | 'tr' | 'bl' | 'br', s: number): string {
  // quarto de disco (raio s) ancorado em um canto da célula
  switch (corner) {
    case 'tl':
      return `M0 0 L${s} 0 A${s} ${s} 0 0 1 0 ${s} Z`
    case 'tr':
      return `M${s} 0 L${s} ${s} A${s} ${s} 0 0 1 0 0 Z`
    case 'br':
      return `M${s} ${s} L0 ${s} A${s} ${s} 0 0 1 ${s} 0 Z`
    case 'bl':
      return `M0 ${s} L0 0 A${s} ${s} 0 0 1 ${s} ${s} Z`
  }
}

export interface Grid48Props {
  /** tamanho da célula em px (8 mobile, 16 desktop por padrão) */
  cell?: number
  /** espaçamento entre células em px */
  gap?: number
  /** nº de unidades preenchidas em trophy, da 1ª à N (ex.: progresso de palpites) */
  active?: number
  /** índices (0-47, row-major) destacados em grass (ex.: acertos exatos) */
  exact?: number[]
  /** skeleton: células pulsam em sequência */
  loading?: boolean
  className?: string
  'aria-label'?: string
}

export function Grid48({
  cell = 16,
  gap = 3,
  active = 0,
  exact = [],
  loading = false,
  className,
  'aria-label': ariaLabel,
}: Grid48Props) {
  const exactSet = new Set(exact)
  const step = cell + gap
  const width = COLS * cell + (COLS - 1) * gap
  const height = ROWS * cell + (ROWS - 1) * gap

  const cells = []
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      const idx = (r - 1) * COLS + (c - 1)
      const x = (c - 1) * step
      const y = (r - 1) * step
      const corner = QUARTERS[`${r}-${c}`]

      let fill = 'var(--rule)'
      if (!loading) {
        if (exactSet.has(idx)) fill = 'var(--grass)'
        else if (idx < active) fill = 'var(--trophy)'
      }

      const style = loading
        ? {
            animation: 'grid48-pulse 1.2s ease-in-out infinite',
            animationDelay: `${(c - 1 + (r - 1)) * 60}ms`,
          }
        : undefined

      cells.push(
        corner ? (
          <path
            key={idx}
            d={quarterPath(corner, cell)}
            transform={`translate(${x} ${y})`}
            fill={fill}
            style={style}
          />
        ) : (
          <rect
            key={idx}
            x={x}
            y={y}
            width={cell}
            height={cell}
            fill={fill}
            style={style}
          />
        ),
      )
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('block', className)}
      role="img"
      aria-label={ariaLabel ?? 'grid de 48 seleções'}
    >
      {cells}
    </svg>
  )
}
