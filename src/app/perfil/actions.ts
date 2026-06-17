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

// ── upload de foto pro Storage (bucket "avatars") ───────────────────────────

const MAX_AVATAR_BYTES = 4 * 1024 * 1024 // 4 MB
const AVATAR_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export type UploadAvatarResult = { error: string } | { ok: true; url: string }

export async function uploadAvatar(
  formData: FormData,
): Promise<UploadAvatarResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecione uma imagem' }
  }
  const ext = AVATAR_TYPES[file.type]
  if (!ext) {
    return { error: 'Use uma imagem PNG, JPG, WEBP ou GIF' }
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: 'Imagem muito grande (máx. 4 MB)' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Você precisa estar logado' }
  }

  // caminho na pasta do próprio usuário (a RLS do Storage exige isso)
  const path = `${user.id}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (upErr) {
    return { error: 'Não deu pra enviar a imagem, tenta de novo' }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path)

  // já grava no perfil (a pessoa pode só ajustar o nome depois)
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
  if (updErr) {
    return { error: 'Imagem enviada, mas não deu pra salvar no perfil' }
  }

  revalidatePath('/', 'layout')
  return { ok: true, url: publicUrl }
}
