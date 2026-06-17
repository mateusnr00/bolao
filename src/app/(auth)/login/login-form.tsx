'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { signInWithMagicLink, signInWithPassword } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  loginSchema,
  magicLinkSchema,
  type LoginInput,
  type MagicLinkInput,
} from '@/lib/validations'

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const urlError = searchParams.get('error')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (urlError) toast.error(urlError)
  }, [urlError])

  const passwordForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const magicForm = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  })

  const [magicSent, setMagicSent] = useState(false)

  function onPasswordSubmit(values: LoginInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', values.email)
      fd.set('password', values.password)
      fd.set('redirectTo', redirectTo)
      const res = await signInWithPassword(null, fd)
      if (res && 'error' in res) toast.error(res.error)
    })
  }

  function onMagicSubmit(values: MagicLinkInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', values.email)
      const res = await signInWithMagicLink(null, fd)
      if (res && 'error' in res) {
        toast.error(res.error)
      } else if (res?.ok) {
        setMagicSent(true)
        toast.success(res.message ?? 'Link enviado!')
      }
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Senha</TabsTrigger>
            <TabsTrigger value="magic">Link mágico</TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  {...passwordForm.register('email')}
                />
                {passwordForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...passwordForm.register('password')}
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="magic">
            {magicSent ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Enviamos um link para o seu email. Abra para entrar.
              </p>
            ) : (
              <form
                onSubmit={magicForm.handleSubmit(onMagicSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    {...magicForm.register('email')}
                  />
                  {magicForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {magicForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Enviando…' : 'Enviar link mágico'}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
