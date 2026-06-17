'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { createPool } from '@/app/boloes/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomNav, Eyebrow, TopNav } from '@/components/we26'
import { createPoolSchema, type CreatePoolInput } from '@/lib/validations'

export function CreatePoolForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<CreatePoolInput>({
    resolver: zodResolver(createPoolSchema),
    defaultValues: { name: '' },
  })

  function onSubmit(values: CreatePoolInput) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', values.name)
      const res = await createPool(null, fd)
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
            <Eyebrow>novo bolão</Eyebrow>
            <h1 className="display text-[clamp(26px,6vw,36px)] uppercase text-ink">
              crie o seu bolão
            </h1>
            <p className="text-[14px] text-sepia">
              dê um nome e convide a galera com o código gerado.
            </p>
          </section>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">nome do bolão</Label>
              <Input
                id="name"
                autoComplete="off"
                placeholder="ex: copa dos guerreiros"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full rounded-md text-[15px] font-medium"
            >
              {isPending ? 'criando…' : 'criar bolão'}
            </Button>
            <p className="text-center text-[12px] text-sepia">
              a pontuação padrão (placar exato 25 · acertos parciais de 10 a 18)
              já vem configurada.
            </p>
          </form>
        </div>
      </main>

      <BottomNav active="boloes" />
    </div>
  )
}
