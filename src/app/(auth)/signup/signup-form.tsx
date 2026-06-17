'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { signUpWithPassword } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signupSchema, type SignupInput } from '@/lib/validations'

export function SignupForm() {
  const [isPending, startTransition] = useTransition()
  const [confirmSent, setConfirmSent] = useState(false)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', username: '', displayName: '' },
  })

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', values.email)
      fd.set('password', values.password)
      fd.set('username', values.username)
      if (values.displayName) fd.set('displayName', values.displayName)
      const res = await signUpWithPassword(null, fd)
      if (res && 'error' in res) {
        toast.error(res.error)
      } else if (res?.ok) {
        setConfirmSent(true)
        toast.success(res.message ?? 'Conta criada!')
      }
    })
  }

  if (confirmSent) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Conta criada! Confira seu email para confirmar e entrar.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              placeholder="Seu nome"
              autoComplete="name"
              {...form.register('displayName')}
            />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="seu_user"
              autoComplete="username"
              {...form.register('username')}
            />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@email.com"
              autoComplete="email"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Criando…' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
