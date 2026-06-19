'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { signInWithMagicLink, signInWithPassword } from '@/app/(auth)/actions'
import { Field } from '@/components/auth/field'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  loginSchema,
  magicLinkSchema,
  type LoginInput,
  type MagicLinkInput,
} from '@/lib/validations'

type Mode = 'password' | 'magic'

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const urlError = searchParams.get('error')
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<Mode>('password')
  const [magicSent, setMagicSent] = useState(false)

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
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="display text-[clamp(32px,9vw,44px)] uppercase leading-none text-ink">
          entrar
        </h1>
        <p className="text-[14px] text-sepia">bom te ver de novo.</p>
      </div>

      {/* alternador senha / link mágico */}
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-rule bg-bone/60 p-1">
        {(
          [
            ['password', 'senha'],
            ['magic', 'link mágico'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              'rounded-md py-2 text-[13px] font-medium transition-colors',
              mode === key
                ? 'bg-paper text-ink shadow-sm'
                : 'text-sepia hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'password' ? (
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="space-y-4"
        >
          <Field
            id="email"
            label="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            error={passwordForm.formState.errors.email?.message}
            {...passwordForm.register('email')}
          />
          <Field
            id="password"
            label="senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={passwordForm.formState.errors.password?.message}
            {...passwordForm.register('password')}
          />
          <div className="-mt-1 text-right">
            <Link
              href="/recuperar"
              className="text-[12px] text-sepia underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              esqueci minha senha
            </Link>
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-md text-[15px] font-medium"
          >
            {isPending ? 'entrando…' : 'entrar'}
          </Button>
        </form>
      ) : magicSent ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-rule px-4 py-8 text-center">
          <MailCheck className="size-6 text-trophy-deep" />
          <p className="text-[14px] text-sepia">
            enviamos um link pro seu email.
            <br />
            abra pra entrar.
          </p>
        </div>
      ) : (
        <form
          onSubmit={magicForm.handleSubmit(onMagicSubmit)}
          className="space-y-4"
        >
          <Field
            id="magic-email"
            label="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            error={magicForm.formState.errors.email?.message}
            {...magicForm.register('email')}
          />
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-md text-[15px] font-medium"
          >
            {isPending ? 'enviando…' : 'enviar link mágico'}
          </Button>
          <p className="text-center text-[12px] text-sepia">
            sem senha. a gente manda um link de acesso.
          </p>
        </form>
      )}

      <p className="text-center text-[13px] text-sepia">
        não tem conta?{' '}
        <Link
          href="/signup"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          criar conta
        </Link>
      </p>
    </div>
  )
}
