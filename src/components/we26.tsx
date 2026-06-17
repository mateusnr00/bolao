import { House, ListChecks, Trophy, Users } from 'lucide-react'
import Link from 'next/link'

import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
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

// Logos da Copa (hospedados externamente por ora; pra produção, baixar e
// commitar em public/brand e trocar por '/brand/...').
export const LOGO_TROPHY_SRC = 'https://i.postimg.cc/022srSL1/26taca.png'
export const LOGO_EMBLEM_SRC = 'https://i.postimg.cc/FHYXV4rG/fwc.jpg'

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_TROPHY_SRC}
      alt="Copa 2026"
      className={cn('h-8 w-auto object-contain', className)}
    />
  )
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

/* selo "AO VIVO" com pontinho pulsando (usa phase-semi, o vermelho da paleta).
   A animação respeita prefers-reduced-motion via override global em globals.css. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-phase-semi/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-phase-semi',
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-phase-semi opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-phase-semi" />
      </span>
      ao vivo
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
        <div className="flex items-center gap-3 md:gap-4">
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
          </nav>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export function BottomNav({ active = 'inicio' }: { active?: NavKey }) {
  const items: { key: NavKey; icon: typeof House; label: string; href: string }[] = [
    { key: 'inicio', icon: House, label: 'início', href: '/' },
    { key: 'palpites', icon: ListChecks, label: 'palpites', href: '/palpites' },
    { key: 'ranking', icon: Trophy, label: 'ranking', href: '/ranking' },
    { key: 'boloes', icon: Users, label: 'ligas', href: '/boloes' },
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
