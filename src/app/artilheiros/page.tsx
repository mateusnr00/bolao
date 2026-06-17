import { ArtilheirosScreen } from '@/components/artilheiros/artilheiros-screen'
import { getTopScorers } from '@/lib/queries/goals'

export const dynamic = 'force-dynamic'

export default async function ArtilheirosPage() {
  const scorers = await getTopScorers(10)
  return <ArtilheirosScreen scorers={scorers} />
}
