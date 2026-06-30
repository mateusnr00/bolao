import { LOGO_TROPHY_SRC } from '@/lib/brand'

interface Team {
  code: string
  flagUrl: string | null
}

// Dimensões/cores do scoreboard (referência FIFA 26). viewBox 1180×176.
const C = {
  coral: '#F7A18E',
  purple: '#B28BFF',
  red: '#FF0000',
  lime: '#B8FF1A',
  cyan: '#A8FFF0',
  black: '#0E0E10',
  white: '#FFFFFF',
}

/** Scoreboard "We Are 26" — clone fiel da arte FIFA 2026, em SVG (escala
 *  sozinho mantendo as proporções). Bandeira · sigla · placar (cápsula ciano) ·
 *  emblema da Copa no meio · placar · sigla · bandeira. */
export function ScoreBoard({
  home,
  away,
  score,
}: {
  home: Team
  away: Team
  score: [number, number] | null
}) {
  const h = score ? String(score[0]) : '–'
  const a = score ? String(score[1]) : '–'
  const display = { fontFamily: 'var(--font-display)' }

  return (
    <svg
      viewBox="0 0 1180 176"
      className="h-auto w-full"
      role="img"
      aria-label={`${home.code} ${h} x ${a} ${away.code}`}
    >
      <defs>
        <clipPath id="sb-flag-h">
          <rect x="118" y="40" width="150" height="96" rx="12" />
        </clipPath>
        <clipPath id="sb-flag-a">
          <rect x="912" y="40" width="150" height="96" rx="12" />
        </clipPath>
      </defs>

      {/* bordas coral/roxa (atrás, aparecem nas pontas) */}
      <rect x="0" y="16" width="40" height="144" rx="20" fill={C.coral} />
      <rect x="1140" y="16" width="40" height="144" rx="20" fill={C.purple} />

      {/* barras de baixo (atrás, aparecem na base): vermelho · lima · roxo */}
      <rect x="70" y="150" width="470" height="26" rx="9" fill={C.red} />
      <rect x="540" y="150" width="470" height="26" rx="9" fill={C.lime} />
      <rect x="1010" y="150" width="120" height="26" rx="9" fill={C.purple} />

      {/* cápsula preta principal */}
      <rect x="14" y="10" width="1152" height="150" rx="34" fill={C.black} />

      {/* bandeira mandante */}
      <image
        href={home.flagUrl ?? undefined}
        x="118"
        y="40"
        width="150"
        height="96"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#sb-flag-h)"
      />
      <rect
        x="118"
        y="40"
        width="150"
        height="96"
        rx="12"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <text
        x="360"
        y="90"
        fill={C.white}
        style={display}
        fontSize="84"
        letterSpacing="-2"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {home.code}
      </text>

      {/* cápsula ciano (placar) — atrás do bloco FIFA */}
      <rect x="408" y="6" width="364" height="164" rx="28" fill={C.cyan} />
      <text
        x="470"
        y="90"
        fill={C.black}
        style={display}
        fontSize="96"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {h}
      </text>
      <text
        x="710"
        y="90"
        fill={C.black}
        style={display}
        fontSize="96"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {a}
      </text>

      {/* bloco FIFA flutuante (emblema da Copa) */}
      <rect x="540" y="0" width="100" height="176" rx="26" fill={C.black} />
      <image
        href={LOGO_TROPHY_SRC}
        x="546"
        y="12"
        width="88"
        height="152"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* sigla visitante */}
      <text
        x="820"
        y="90"
        fill={C.white}
        style={display}
        fontSize="84"
        letterSpacing="-2"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {away.code}
      </text>
      {/* bandeira visitante */}
      <image
        href={away.flagUrl ?? undefined}
        x="912"
        y="40"
        width="150"
        height="96"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#sb-flag-a)"
      />
      <rect
        x="912"
        y="40"
        width="150"
        height="96"
        rx="12"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
    </svg>
  )
}
