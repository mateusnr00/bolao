'use client'

import {
  BookOpen,
  ChevronDown,
  Coins,
  FileSignature,
  Globe,
  LogOut,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'

import { signOut } from '@/app/(auth)/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  username: string
  displayName: string | null
  avatarUrl: string | null
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')
  ).toUpperCase()
}

export function UserMenu() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    let active = true
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('pool_members')
          .select('pool_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])
      if (!active) return
      if (data) {
        setProfile({
          username: data.username,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
        })
      }
      setIsMember((count ?? 0) > 0)
    })()
    return () => {
      active = false
    }
  }, [])

  const name = profile?.displayName ?? profile?.username ?? ''
  const initials = name ? initialsOf(name) : ''

  const avatar = (size: string) => (
    <Avatar className={size}>
      {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
      <AvatarFallback className="bg-bone text-[11px] font-semibold text-sepia">
        {initials || <UserRound className="size-4" />}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-rule py-1 pr-1 pl-1 text-ink transition-colors hover:bg-bone sm:pr-2.5">
        {avatar('size-7')}
        <span className="hidden max-w-[150px] truncate text-[13px] font-medium sm:block">
          {name || 'conta'}
        </span>
        <ChevronDown className="hidden size-4 text-sepia sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          {avatar('size-10')}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">
              {name || 'sua conta'}
            </p>
            {profile?.username && (
              <p className="truncate font-mono text-[12px] text-sepia">
                @{profile.username}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          render={<Link href="/perfil" />}
          className="gap-2.5 px-2 py-2 text-[14px]"
        >
          <UserRound className="size-4 text-sepia" /> editar perfil
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/grupos" />}
          className="gap-2.5 px-2 py-2 text-[14px]"
        >
          <Globe className="size-4 text-sepia" /> Copa do Mundo
        </DropdownMenuItem>
        {isMember && (
          <DropdownMenuItem
            render={<Link href="/contrato" />}
            className="gap-2.5 px-2 py-2 text-[14px]"
          >
            <FileSignature className="size-4 text-sepia" /> contrato
          </DropdownMenuItem>
        )}
        {isMember && (
          <DropdownMenuItem
            render={<Link href="/pagamentos" />}
            className="gap-2.5 px-2 py-2 text-[14px]"
          >
            <Coins className="size-4 text-sepia" /> cobrança
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          render={<Link href="/regras" />}
          className="gap-2.5 px-2 py-2 text-[14px]"
        >
          <BookOpen className="size-4 text-sepia" /> regras
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => startTransition(() => signOut())}
          className="gap-2.5 px-2 py-2 text-[14px]"
        >
          <LogOut className="size-4 text-sepia" /> {isPending ? 'saindo…' : 'sair'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
