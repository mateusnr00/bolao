import { BoloesScreen } from '@/components/boloes/boloes-screen'
import { getUserPools } from '@/lib/queries/pools'

export const dynamic = 'force-dynamic'

export default async function BoloesPage() {
  const pools = await getUserPools()
  return <BoloesScreen pools={pools} />
}
