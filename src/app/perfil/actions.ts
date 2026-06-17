'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validations'

export type ProfileResult =
  | { error: string }
  | { ok: true; message?: string }

export async function updateProfile(
  _prev: ProfileResult | null,
  formData: FormData,
): Promise<ProfileResult> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get('displayName'),
    avatarUrl: formData.get('avatarUrl') || '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Você precisa estar logado' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.displayName,
      avatar_url: parsed.data.avatarUrl ? parsed.data.avatarUrl : null,
    })
    .eq('id', user.id)

  if (error) {
    return { error: 'Não deu pra salvar, tenta de novo' }
  }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Perfil atualizado!' }
}
