'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Notif {
  id: string
  title: string
  body: string | null
  matchId: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationsBell() {
  const [items, setItems] = useState<Notif[]>([])
  const [loaded, setLoaded] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (active) setLoaded(true)
        return
      }
      if (active) setUserId(user.id)
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, match_id, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      if (active) {
        setItems(
          (data ?? []).map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            matchId: n.match_id,
            readAt: n.read_at,
            createdAt: n.created_at,
          })),
        )
        setLoaded(true)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const unread = items.filter((n) => !n.readAt).length

  function markAllRead() {
    const ids = items.filter((n) => !n.readAt).map((n) => n.id)
    if (ids.length === 0) return
    const stamp = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: stamp })))
    const supabase = createClient()
    void supabase.from('notifications').update({ read_at: stamp }).in('id', ids)
  }

  // dispensa uma notificação (apaga do banco; RLS garante que é a sua)
  function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id))
    const supabase = createClient()
    void supabase.from('notifications').delete().eq('id', id)
  }

  // limpa todas as suas notificações
  function clearAll() {
    if (!userId || items.length === 0) return
    setItems([])
    const supabase = createClient()
    void supabase.from('notifications').delete().eq('user_id', userId)
  }

  function when(iso: string) {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR })
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) markAllRead()
      }}
    >
      <DropdownMenuTrigger
        aria-label="notificações"
        className="relative flex size-9 items-center justify-center rounded-full border border-rule text-ink transition-colors hover:bg-bone"
      >
        <Bell className="size-[18px] text-sepia" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-phase-semi px-1 text-[10px] font-bold leading-[18px] text-paper">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-rule px-3 py-2.5">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
            notificações
          </p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] font-medium text-sepia transition-colors hover:text-ink"
            >
              limpar tudo
            </button>
          )}
        </div>

        {!loaded ? (
          <p className="px-3 py-6 text-center text-[13px] text-sepia">carregando…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-sepia">
            nada por aqui ainda.
          </p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-rule overflow-y-auto">
            {items.map((n) => {
              const inner = (
                <>
                  <span className="mt-1 block size-2 shrink-0 rounded-full">
                    {!n.readAt && (
                      <span className="block size-2 rounded-full bg-phase-semi" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-snug text-ink">
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-sepia">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-sepia/80">
                      {when(n.createdAt)}
                    </span>
                  </span>
                </>
              )
              const cls = 'flex min-w-0 flex-1 items-start gap-2.5 px-3 py-2.5'
              return (
                <li
                  key={n.id}
                  className={cn(
                    'flex items-stretch',
                    !n.readAt && 'bg-phase-semi/5',
                  )}
                >
                  {n.matchId ? (
                    <Link
                      href={`/jogo/${n.matchId}`}
                      className={cn(cls, 'transition-colors hover:bg-bone')}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                  <button
                    type="button"
                    aria-label="dispensar"
                    onClick={() => dismiss(n.id)}
                    className="shrink-0 px-2.5 text-sepia transition-colors hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
