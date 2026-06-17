'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { signUpWithPassword } from '@/app/(auth)/actions'
import { Field } from '@/components/auth/field'
import { Button } from '@/components/ui/button'
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
      <div className="space-y-7">
        <div className="space-y-1.5">
          <h1 className="display text-[clamp(32px,9vw,44px)] uppercase leading-none text-ink">
            quase lá
          </h1>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-rule px-4 py-8 text-center">
          <MailCheck className="size-6 text-trophy-deep" />
          <p className="text-[14px] text-sepia">
            conta criada! confira seu email pra confirmar e entrar.
          </p>
        </div>
        <p className="text-center text-[13px] text-sepia">
          <Link
            href="/login"
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            voltar ao login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="display text-[clamp(32px,9vw,44px)] uppercase leading-none text-ink">
          criar conta
        </h1>
        <p className="text-[14px] text-sepia">leva menos de um minuto.</p>
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
          id="username"
          label="username"
          placeholder="seu_user"
          autoComplete="username"
          error={form.formState.errors.username?.message}
          {...form.register('username')}
        />
        <Field
          id="email"
          label="email"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Field
          id="password"
          label="senha"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-md text-[15px] font-medium"
        >
          {isPending ? 'criando…' : 'criar conta'}
        </Button>
      </form>

      <p className="text-center text-[13px] text-sepia">
        já tem conta?{' '}
        <Link
          href="/login"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          entrar
        </Link>
      </p>
    </div>
  )
}
