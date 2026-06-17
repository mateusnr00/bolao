import { NoPoolScreen } from '@/components/boloes/no-pool-screen'
import { DashboardScreen } from '@/components/dashboard/dashboard-screen'
import type { GameCardData } from '@/components/landing/matches-grid'
import { LandingScreen } from '@/components/landing/landing-screen'
import { getDashboard } from '@/lib/queries/dashboard'
import { getMatches } from '@/lib/queries/matches'
import { getUserPools } from '@/lib/queries/pools'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Jogos pra vitrine da landing: alguns resultados recentes (+ ao vivo) e os
// próximos a sair, em ordem cronológica. matches/teams têm RLS pública.
async function landingGames(): Promise<GameCardData[]> {
  try {
    const all = await getMatches()
    const now = Date.now()
    const started = all.filter((m) => new Date(m.kickoffAt).getTime() <= now)
    const upcoming = all.filter((m) => new Date(m.kickoffAt).getTime() > now)
    const window = [...started.slice(-6), ...upcoming.slice(0, 10)]
    return window.map((m) => ({
      id: m.id,
      kickoffAt: m.kickoffAt,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      groupName: m.groupName,
      home: { code: m.home.code, flagUrl: m.home.flagUrl },
      away: { code: m.away.code, flagUrl: m.away.flagUrl },
    }))
  } catch {
    return []
  }
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <LandingScreen games={await landingGames()} />

  const pools = await getUserPools()
  const pool = pools[0]
  if (!pool) {
    return (
      <NoPoolScreen
        active="inicio"
        title="bem-vindo"
        subtitle="crie um bolão ou entre com um código pra começar a palpitar."
      />
    )
  }

  const data = await getDashboard({
    id: pool.id,
    name: pool.name,
    inviteCode: pool.inviteCode,
    memberCount: pool.memberCount,
  })
  return <DashboardScreen data={data} />
}
