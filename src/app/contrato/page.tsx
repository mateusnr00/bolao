import { ContractScreen } from '@/components/contrato/contract-screen'
import { getMySignature, getPoolSignStatus } from '@/lib/queries/contracts'

export const dynamic = 'force-dynamic'

export default async function ContratoPage() {
  const [signed, status] = await Promise.all([getMySignature(), getPoolSignStatus()])
  return (
    <ContractScreen
      signed={signed}
      signedMembers={status?.signed ?? []}
      unsignedMembers={status?.unsigned ?? []}
    />
  )
}
