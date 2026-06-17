import { House, ListChecks, Trophy, User } from 'lucide-react'
import Link from 'next/link'

import { signOut } from '@/app/(auth)/actions'
import { cn } from '@/lib/utils'

export type Phase =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final'

export const PHASE_META: Record<Phase, { label: string; bg: string; fg: string }> = {
  group: { label: 'grupos', bg: 'bg-phase-group', fg: 'text-paper' },
  round_of_32: { label: '32-avos', bg: 'bg-phase-32', fg: 'text-ink' },
  round_of_16: { label: 'oitavas', bg: 'bg-phase-16', fg: 'text-paper' },
  quarter_final: { label: 'quartas', bg: 'bg-phase-quarter', fg: 'text-paper' },
  semi_final: { label: 'semi', bg: 'bg-phase-semi', fg: 'text-paper' },
  third_place: { label: '3º lugar', bg: 'bg-phase-quarter', fg: 'text-paper' },
  final: { label: 'final', bg: 'bg-phase-final', fg: 'text-ink' },
}

export function Logo() {
  return <span className="display text-2xl leading-none text-ink">╳26</span>
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.12em] text-sepia', className)}>
      {children}
    </p>
  )
}

export function Rule({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-rule', className)} />
}

export function Flag({
  iso,
  src,
  className,
}: {
  iso?: string
  src?: string
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? `https://flagcdn.com/${iso}.svg`}
      alt=""
      width={28}
      height={21}
      className={cn('h-[15px] w-5 shrink-0 object-cover', className)}
    />
  )
}

export function PhaseBadge({
  phase,
  label,
  className,
}: {
  phase: Phase
  label?: string
  className?: string
}) {
  const meta = PHASE_META[phase]
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]',
        meta.bg,
        meta.fg,
        className,
      )}
    >
      {label ?? meta.label}
    </span>
  )
}

export function ExactDots({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} placares exatos`}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="size-1.5 rounded-full bg-trophy" />
      ))}
    </span>
  )
}

type NavKey = 'inicio' | 'boloes' | 'palpites' | 'ranking' | 'perfil'

export function TopNav({ active }: { active?: NavKey }) {
  const link = (key: NavKey) =>
    cn('transition-colors hover:text-ink', active === key ? 'text-ink' : 'text-sepia')
  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4">
        <Link href="/" aria-label="início">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-[13px] font-medium md:flex">
          <Link href="/boloes" className={link('boloes')}>
            bolões
          </Link>
          <Link href="/palpites" className={link('palpites')}>
            palpites
          </Link>
          <Link href="/ranking" className={link('ranking')}>
            ranking
          </Link>
          <form action={signOut}>
            <button className="flex size-7 items-center justify-center rounded-md border border-rule text-ink transition-colors hover:bg-bone">
              <User className="size-4" />
            </button>
          </form>
        </nav>
        <form action={signOut} className="md:hidden">
          <button className="flex size-8 items-center justify-center rounded-md border border-rule text-ink">
            <User className="size-4" />
          </button>
        </form>
      </div>
    </header>
  )
}

export function BottomNav({ active = 'inicio' }: { active?: NavKey }) {
  const items: { key: NavKey; icon: typeof House; label: string; href: string }[] = [
    { key: 'inicio', icon: House, label: 'início', href: '/' },
    { key: 'palpites', icon: ListChecks, label: 'palpites', href: '/palpites' },
    { key: 'ranking', icon: Trophy, label: 'ranking', href: '/ranking' },
    { key: 'perfil', icon: User, label: 'perfil', href: '/' },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper md:hidden">
      <div className="mx-auto grid max-w-[1280px] grid-cols-4">
        {items.map(({ key, icon: Icon, label, href }) => {
          const isActive = key === active
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                isActive ? 'text-trophy' : 'text-sepia',
              )}
            >
              <Icon className="size-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
