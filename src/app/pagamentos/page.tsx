import { NoPoolScreen } from '@/components/boloes/no-pool-screen'
import { PaymentsScreen } from '@/components/payments/payments-screen'
import { getPoolPayments } from '@/lib/queries/payments'
import { getUserPools } from '@/lib/queries/pools'

export const dynamic = 'force-dynamic'

export default async function PagamentosPage() {
  const pools = await getUserPools()
  const pool = pools[0]
  if (!pool) {
    return (
      <NoPoolScreen
        active="ranking"
        title="cobrança"
        subtitle="entre em um bolão pra controlar os pagamentos."
      />
    )
  }

  const data = await getPoolPayments(pool.id)
  return (
    <PaymentsScreen
      poolName={pool.name}
      isOwner={data?.isOwner ?? false}
      paid={data?.paid ?? []}
      unpaid={data?.unpaid ?? []}
    />
  )
}
