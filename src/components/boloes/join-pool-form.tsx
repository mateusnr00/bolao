'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { joinPool } from '@/app/boloes/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomNav, Eyebrow, TopNav } from '@/components/we26'
import { joinPoolSchema, type JoinPoolInput } from '@/lib/validations'

export function JoinPoolForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<JoinPoolInput>({
    resolver: zodResolver(joinPoolSchema),
    defaultValues: { inviteCode: '' },
  })

  function onSubmit(values: JoinPoolInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('inviteCode', values.inviteCode)
      const res = await joinPool(null, fd)
      if (res && 'error' in res) toast.error(res.error)
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopNav active="boloes" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div className="space-y-7">
          <Link
            href="/boloes"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-sepia transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" /> bolões
          </Link>

          <section className="space-y-2">
            <Eyebrow>entrar em bolão</Eyebrow>
            <h1 className="display text-[clamp(26px,6vw,36px)] uppercase text-ink">
              tem um código?
            </h1>
            <p className="text-[14px] text-sepia">
              cole o código de 8 caracteres que recebeu no convite.
            </p>
          </section>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">código do convite</Label>
              <Input
                id="inviteCode"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ex: a7k2qx9p"
                className="font-mono tracking-[0.2em]"
                {...form.register('inviteCode')}
              />
              {form.formState.errors.inviteCode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.inviteCode.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full rounded-md text-[15px] font-medium"
            >
              {isPending ? 'entrando…' : 'entrar no bolão'}
            </Button>
          </form>
        </div>
      </main>

      <BottomNav active="boloes" />
    </div>
  )
}
