import { notFound } from 'next/navigation'

import { MemberScreen } from '@/components/membro/member-screen'
import { getUserPools } from '@/lib/queries/pools'
import { getPoolStats } from '@/lib/queries/stats'

export const dynamic = 'force-dynamic'

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pools = await getUserPools()
  const pool = pools[0]
  if (!pool) notFound()

  const members = await getPoolStats(pool.id)
  const member = members.find((m) => m.userId === id)
  if (!member) notFound()

  // lanterninha do bolão (último colocado) ganha o burrinho no perfil também
  const lastUserId =
    members.length > 1 ? members[members.length - 1].userId : null

  return (
    <MemberScreen
      member={member}
      poolName={pool.name}
      isLanterna={member.userId === lastUserId}
    />
  )
}
