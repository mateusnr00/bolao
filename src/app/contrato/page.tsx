import { ContractScreen } from '@/components/contrato/contract-screen'
import { getMySignature } from '@/lib/queries/contracts'

export const dynamic = 'force-dynamic'

export default async function ContratoPage() {
  const signed = await getMySignature()
  return <ContractScreen signed={signed} />
}
