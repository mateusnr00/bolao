import { NoPoolScreen } from '@/components/boloes/no-pool-screen'
import { DashboardScreen } from '@/components/dashboard/dashboard-screen'
import { LandingScreen } from '@/components/landing/landing-screen'
import { getDashboard } from '@/lib/queries/dashboard'
import { getUserPools } from '@/lib/queries/pools'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <LandingScreen />

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
