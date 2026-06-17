import { Skeleton } from '@/components/ui/skeleton'

// Renderiza dentro do AuthLayout: só o esqueleto do formulário, pra não herdar
// o skeleton de dashboard da raiz ao navegar para /login ou /signup.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  )
}
