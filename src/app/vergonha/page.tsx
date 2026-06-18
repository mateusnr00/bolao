import { NoPoolScreen } from '@/components/boloes/no-pool-screen'
import { HallVergonhaScreen } from '@/components/vergonha/hall-vergonha-screen'
import { getUserPools } from '@/lib/queries/pools'
import { getPoolStats } from '@/lib/queries/stats'

export const dynamic = 'force-dynamic'

export default async function VergonhaPage() {
  const pools = await getUserPools()
  const pool = pools[0]
  if (!pool) {
    return (
      <NoPoolScreen
        active="ranking"
        title="hall da vergonha"
        subtitle="entre em um bolão pra ver as maiores burradas da galera."
      />
    )
  }

  const members = await getPoolStats(pool.id)
  // ordena pelas maiores vergonhas: mais burrinhos, depois mais zeros, depois pior média
  const rows = members
    .filter((m) => m.predictionsMade > 0)
    .sort(
      (a, b) =>
        b.burrinhoCount - a.burrinhoCount ||
        b.zeroCount - a.zeroCount ||
        a.average - b.average,
    )

  return <HallVergonhaScreen rows={rows} poolName={pool.name} />
}
