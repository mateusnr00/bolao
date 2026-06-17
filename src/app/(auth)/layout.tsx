import { Trophy } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <Trophy className="size-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bolão Copa 2026</h1>
          <p className="text-sm text-muted-foreground">
            Palpites entre amigos, ranking ao vivo.
          </p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
