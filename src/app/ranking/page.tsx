import { NoPoolScreen } from '@/components/boloes/no-pool-screen'
import { RankingScreen } from '@/components/ranking/ranking-screen'
import { getUserPools } from '@/lib/queries/pools'
import { getLiveMatchGuesses, getPoolRanking } from '@/lib/queries/rankings'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const pools = await getUserPools()
  const pool = pools[0]
  if (!pool) {
    return (
      <NoPoolScreen
        active="ranking"
        title="ranking"
        subtitle="entre em um bolão pra disputar o ranking com a galera."
      />
    )
  }

  const [rows, liveMatches] = await Promise.all([
    getPoolRanking(pool.id),
    getLiveMatchGuesses(),
  ])
  return (
    <RankingScreen
      data={{
        poolName: pool.name,
        memberCount: pool.memberCount,
        rows,
        liveMatches,
      }}
    />
  )
}
