import { Flag } from '@/components/we26'
import { LOGO_TROPHY_SRC } from '@/lib/brand'

interface Team {
  code: string
  flagUrl: string | null
}

/** Placar estilizado "We Are 26": bandeira · sigla · placar (bloco mint) ·
 *  emblema da Copa no meio · placar · sigla · bandeira. Barra escura com borda
 *  colorida — fica igual nos dois temas (sempre escura, como o scoreboard). */
export function ScoreBoard({
  home,
  away,
  score,
  live = false,
}: {
  home: Team
  away: Team
  score: [number, number] | null
  live?: boolean
}) {
  const h = score ? String(score[0]) : '–'
  const a = score ? String(score[1]) : '–'

  return (
    <div className="overflow-hidden rounded-[20px] bg-[linear-gradient(100deg,#ef6f6c_0%,#34d3a6_38%,#b6e62a_72%,#9b6bdf_100%)] p-[3px] shadow-md">
      <div className="flex items-center justify-between gap-1.5 rounded-[17px] bg-[#0e0e10] px-3 py-3 sm:gap-3 sm:px-4">
        {/* mandante */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Flag
            src={home.flagUrl ?? undefined}
            className="h-7 w-10 shrink-0 rounded-md ring-1 ring-white/15 sm:h-9 sm:w-12"
          />
          <span className="truncate font-mono text-[26px] font-extrabold tracking-tight text-white sm:text-4xl">
            {home.code}
          </span>
        </div>

        {/* placar + emblema */}
        <div className="flex shrink-0 items-center">
          <span className="flex h-12 min-w-10 items-center justify-center rounded-l-xl bg-[#9ff0cf] px-2 font-mono text-3xl font-extrabold tabular text-[#0e0e10] sm:h-16 sm:min-w-14 sm:text-5xl">
            {h}
          </span>
          <span className="z-10 -mx-2.5 flex size-14 shrink-0 items-center justify-center rounded-full border-4 border-[#0e0e10] bg-[#0e0e10] sm:size-[72px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_TROPHY_SRC}
              alt=""
              className="h-10 w-auto object-contain sm:h-14"
            />
          </span>
          <span className="flex h-12 min-w-10 items-center justify-center rounded-r-xl bg-[#9ff0cf] px-2 font-mono text-3xl font-extrabold tabular text-[#0e0e10] sm:h-16 sm:min-w-14 sm:text-5xl">
            {a}
          </span>
        </div>

        {/* visitante */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <span className="truncate font-mono text-[26px] font-extrabold tracking-tight text-white sm:text-4xl">
            {away.code}
          </span>
          <Flag
            src={away.flagUrl ?? undefined}
            className="h-7 w-10 shrink-0 rounded-md ring-1 ring-white/15 sm:h-9 sm:w-12"
          />
        </div>
      </div>

      {live && (
        <div className="flex items-center justify-center gap-1.5 bg-[#0e0e10] pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#34d3a6]">
          <span className="size-1.5 animate-pulse rounded-full bg-[#34d3a6]" />
          ao vivo
        </div>
      )}
    </div>
  )
}
