import { COPA_LOGO_WHITE_SRC } from '@/lib/brand'

interface Team {
  code: string
  flagUrl: string | null
}

// Cores do scoreboard (referência FIFA 26). viewBox 1180×176.
const C = {
  coral: '#F7A18E',
  purple: '#B28BFF',
  red: '#FF0000',
  lime: '#B8FF1A',
  cyan: '#A8FFF0',
  black: '#0E0E10',
  white: '#FFFFFF',
}

/** Scoreboard "We Are 26" (FIFA 2026) em SVG — escala sozinho mantendo as
 *  proporções. Bandeira · sigla · placar (cápsula ciano) · emblema · placar ·
 *  sigla · bandeira. */
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
          <rect x="66" y="38" width="156" height="100" rx="12" />
        </clipPath>
        <clipPath id="sb-flag-a">
          <rect x="958" y="38" width="156" height="100" rx="12" />
        </clipPath>
      </defs>

      {/* esquerda: coral (vertical) → vermelho (base), conectados no canto */}
      <rect x="0" y="18" width="36" height="156" rx="18" fill={C.coral} />
      <rect x="16" y="150" width="548" height="24" rx="12" fill={C.red} />
      {/* direita: verde (base) → roxo (vertical), conectados no canto */}
      <rect x="616" y="150" width="548" height="24" rx="12" fill={C.lime} />
      <rect x="1144" y="18" width="36" height="156" rx="18" fill={C.purple} />

      {/* cápsula preta principal */}
      <rect x="14" y="10" width="1152" height="150" rx="34" fill={C.black} />

      {/* bandeira mandante */}
      <image
        href={home.flagUrl ?? undefined}
        x="66"
        y="38"
        width="156"
        height="100"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#sb-flag-h)"
      />
      <rect
        x="66"
        y="38"
        width="156"
        height="100"
        rx="12"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      {/* sigla mandante (entre a bandeira e a cápsula ciano) */}
      <text
        x="320"
        y="88"
        fill={C.white}
        style={display}
        fontSize="80"
        letterSpacing="-2"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {home.code}
      </text>

      {/* cápsula ciano (placar) */}
      <rect x="428" y="6" width="324" height="164" rx="28" fill={C.cyan} />
      <text
        x="487"
        y="88"
        fill={C.black}
        style={display}
        fontSize="92"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {h}
      </text>
      <text
        x="693"
        y="88"
        fill={C.black}
        style={display}
        fontSize="92"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {a}
      </text>

      {/* bloco FIFA flutuante (emblema branco da Copa) */}
      <rect x="542" y="2" width="96" height="172" rx="26" fill={C.black} />
      <image
        href={COPA_LOGO_WHITE_SRC}
        x="552"
        y="20"
        width="76"
        height="136"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* sigla visitante (entre a cápsula ciano e a bandeira) */}
      <text
        x="860"
        y="88"
        fill={C.white}
        style={display}
        fontSize="80"
        letterSpacing="-2"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {away.code}
      </text>
      {/* bandeira visitante */}
      <image
        href={away.flagUrl ?? undefined}
        x="958"
        y="38"
        width="156"
        height="100"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#sb-flag-a)"
      />
      <rect
        x="958"
        y="38"
        width="156"
        height="100"
        rx="12"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
    </svg>
  )
}
