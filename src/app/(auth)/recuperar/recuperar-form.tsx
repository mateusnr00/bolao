'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { requestPasswordReset } from '@/app/(auth)/actions'
import { Field } from '@/components/auth/field'
import { Button } from '@/components/ui/button'
import { magicLinkSchema, type MagicLinkInput } from '@/lib/validations'

export function RecuperarForm() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  })

  function onSubmit(values: MagicLinkInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', values.email)
      const res = await requestPasswordReset(null, fd)
      if (res && 'error' in res) {
        toast.error(res.error)
      } else if (res?.ok) {
        setSent(true)
        toast.success('Link enviado!')
      }
    })
  }

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="display text-[clamp(32px,9vw,44px)] uppercase leading-none text-ink">
          esqueci a senha
        </h1>
        <p className="text-[14px] text-sepia">
          a gente manda um link pra você criar uma nova.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-rule px-4 py-8 text-center">
          <MailCheck className="size-6 text-trophy-deep" />
          <p className="text-[14px] text-sepia">
            se existir uma conta com esse email, enviamos um link de
            redefinição.
            <br />
            abra pra criar a senha nova.
          </p>
          <p className="text-[12px] text-sepia/80">não chegou? confira o spam.</p>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field
            id="email"
            label="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-md text-[15px] font-medium"
          >
            {isPending ? 'enviando…' : 'enviar link de redefinição'}
          </Button>
        </form>
      )}

      <p className="text-center text-[13px] text-sepia">
        lembrou?{' '}
        <Link
          href="/login"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          voltar pro login
        </Link>
      </p>
    </div>
  )
}
