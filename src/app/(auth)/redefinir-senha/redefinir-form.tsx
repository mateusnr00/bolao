'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { updatePassword } from '@/app/(auth)/actions'
import { Field } from '@/components/auth/field'
import { Button } from '@/components/ui/button'
import { newPasswordSchema, type NewPasswordInput } from '@/lib/validations'

export function RedefinirForm() {
  const [isPending, startTransition] = useTransition()

  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  function onSubmit(values: NewPasswordInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('password', values.password)
      fd.set('confirm', values.confirm)
      // sucesso redireciona pra home (a action chama redirect)
      const res = await updatePassword(null, fd)
      if (res && 'error' in res) toast.error(res.error)
    })
  }

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="display text-[clamp(32px,9vw,44px)] uppercase leading-none text-ink">
          nova senha
        </h1>
        <p className="text-[14px] text-sepia">
          escolha uma senha nova pra acessar sua conta.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Field
          id="password"
          label="nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Field
          id="confirm"
          label="confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={form.formState.errors.confirm?.message}
          {...form.register('confirm')}
        />
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-md text-[15px] font-medium"
        >
          {isPending ? 'salvando…' : 'salvar nova senha'}
        </Button>
      </form>
    </div>
  )
}
