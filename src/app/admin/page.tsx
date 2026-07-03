import { redirect } from 'next/navigation'

import { AdminScreen } from '@/components/admin/admin-screen'
import { getPoolAdmin } from '@/lib/queries/admin'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const data = await getPoolAdmin()
  // só o dono de um bolão entra aqui
  if (!data) redirect('/ranking')

  return <AdminScreen poolName={data.poolName} members={data.members} />
}
