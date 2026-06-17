'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, UserRound } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { signOut } from '@/app/(auth)/actions'
import { updateProfile } from '@/app/perfil/actions'
import { Field } from '@/components/auth/field'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { BottomNav, Eyebrow, Rule, TopNav } from '@/components/we26'
import { profileSchema, type ProfileInput } from '@/lib/validations'

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')
  ).toUpperCase()
}

export function ProfileScreen({
  email,
  username,
  displayName,
  avatarUrl,
}: {
  email: string
  username: string
  displayName: string
  avatarUrl: string
}) {
  const [isPending, startTransition] = useTransition()
  const [isSigningOut, startSignOut] = useTransition()

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName, avatarUrl },
  })

  const watchedName = form.watch('displayName')
  const watchedAvatar = form.watch('avatarUrl')
  const previewName = watchedName || username
  const initials = previewName ? initialsOf(previewName) : ''

  const [savedAvatar, setSavedAvatar] = useState(avatarUrl)

  function onSubmit(values: ProfileInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('displayName', values.displayName)
      if (values.avatarUrl) fd.set('avatarUrl', values.avatarUrl)
      const res = await updateProfile(null, fd)
      if (res && 'error' in res) {
        toast.error(res.error)
      } else if (res?.ok) {
        setSavedAvatar(values.avatarUrl ?? '')
        form.reset({
          displayName: values.displayName,
          avatarUrl: values.avatarUrl ?? '',
        })
        toast.success(res.message ?? 'Perfil atualizado!')
      }
    })
  }

  const showAvatar = watchedAvatar || savedAvatar

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="perfil" />

      <main className="mx-auto w-full max-w-[520px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-7">
          <h1 className="display text-[clamp(28px,7vw,40px)] uppercase text-ink">perfil</h1>

          {/* prévia */}
          <div className="flex items-center gap-4 rounded-lg border border-rule p-4">
            <Avatar className="size-16">
              {showAvatar && <AvatarImage src={showAvatar} alt="" />}
              <AvatarFallback className="bg-bone text-[18px] font-semibold text-sepia">
                {initials || <UserRound className="size-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-ink">
                {previewName || 'sua conta'}
              </p>
              {username && (
                <p className="truncate font-mono text-[12px] text-sepia">@{username}</p>
              )}
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field
              id="displayName"
              label="nome de exibição"
              placeholder="seu nome"
              autoComplete="name"
              error={form.formState.errors.displayName?.message}
              {...form.register('displayName')}
            />
            <Field
              id="avatarUrl"
              label="foto (url)"
              placeholder="https://…"
              autoComplete="off"
              error={form.formState.errors.avatarUrl?.message}
              {...form.register('avatarUrl')}
            />
            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
              className="h-11 w-full rounded-md text-[15px] font-medium"
            >
              {isPending ? 'salvando…' : 'salvar alterações'}
            </Button>
          </form>

          {/* dados da conta */}
          <section className="space-y-3">
            <Eyebrow>conta</Eyebrow>
            <div className="space-y-2 rounded-lg border border-rule p-4 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sepia">username</span>
                <span className="font-mono text-ink">@{username}</span>
              </div>
              <Rule />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sepia">email</span>
                <span className="truncate text-ink">{email}</span>
              </div>
            </div>
          </section>

          <button
            type="button"
            disabled={isSigningOut}
            onClick={() => startSignOut(() => signOut())}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-rule py-3 text-[14px] font-medium text-ink transition-colors hover:bg-bone disabled:opacity-60"
          >
            <LogOut className="size-4 text-sepia" />
            {isSigningOut ? 'saindo…' : 'sair da conta'}
          </button>
        </div>
      </main>

      <BottomNav active="perfil" />
    </div>
  )
}
