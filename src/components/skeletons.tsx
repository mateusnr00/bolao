import { Skeleton } from '@/components/ui/skeleton'
import { BottomNav, TopNav } from '@/components/we26'

type NavKey = 'inicio' | 'boloes' | 'palpites' | 'ranking' | 'perfil'

/* Moldura comum: mantém a navegação (nav é client e renderiza na hora) e só o
   miolo aparece como skeleton enquanto o servidor busca os dados da rota. */
function PageSkeleton({
  active,
  children,
}: {
  active: NavKey
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active={active} />
      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>
      <BottomNav active={active} />
    </div>
  )
}

/* manchete display da página */
function TitleSkeleton() {
  return <Skeleton className="h-9 w-40 rounded-md" />
}

function MatchCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-rule bg-paper p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-12 w-28 rounded-full" />
        <div className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

export function PalpitesSkeleton() {
  return (
    <PageSkeleton active="palpites">
      <div className="space-y-5">
        <TitleSkeleton />
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <ul className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <MatchCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </PageSkeleton>
  )
}

export function RankingSkeleton() {
  return (
    <PageSkeleton active="ranking">
      <div className="space-y-6">
        <div className="space-y-2">
          <TitleSkeleton />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <ul className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2.5">
              <Skeleton className="size-6 rounded" />
              <Skeleton className="h-4 flex-1 max-w-[180px]" />
              <Skeleton className="h-4 w-10" />
            </li>
          ))}
        </ul>
      </div>
    </PageSkeleton>
  )
}

export function DashboardSkeleton() {
  return (
    <PageSkeleton active="inicio">
      <div className="space-y-7">
        <div className="space-y-3">
          <TitleSkeleton />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-[114px] w-[152px] rounded-md" />
          <div className="space-y-2">
            <Skeleton className="ml-auto h-3 w-24" />
            <Skeleton className="ml-auto h-8 w-20" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
        <Skeleton className="h-px w-full" />
        <ul className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-6 rounded" />
              <Skeleton className="h-4 flex-1 max-w-[160px]" />
              <Skeleton className="h-4 w-12" />
            </li>
          ))}
        </ul>
      </div>
    </PageSkeleton>
  )
}

export function BoloesSkeleton() {
  return (
    <PageSkeleton active="boloes">
      <div className="space-y-6">
        <TitleSkeleton />
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-24 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      </div>
    </PageSkeleton>
  )
}

export function PerfilSkeleton() {
  return (
    <PageSkeleton active="perfil">
      <div className="space-y-6">
        <TitleSkeleton />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </PageSkeleton>
  )
}

/* a tela de detalhe do jogo não tem nav inferior; só a moldura superior */
export function MatchDetailSkeleton() {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="palpites" />
      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-10 pt-6">
        <div className="space-y-6">
          <Skeleton className="h-4 w-28" />
          <MatchCardSkeleton />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </main>
    </div>
  )
}
