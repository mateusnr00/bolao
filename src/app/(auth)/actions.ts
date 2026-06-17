'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  magicLinkSchema,
  signupSchema,
} from '@/lib/validations'

export type AuthResult =
  | { error: string }
  | { ok: true; message?: string }

// Origem real do request (domínio onde a pessoa está), pra o link do email não
// cair em localhost quando NEXT_PUBLIC_APP_URL não estiver setada em produção.
async function appUrl() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${host}`
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function safeRedirect(path: FormDataEntryValue | null): string {
  const p = typeof path === 'string' ? path : ''
  // Só caminhos internos, evita open redirect.
  return p.startsWith('/') && !p.startsWith('//') ? p : '/'
}

export async function signInWithPassword(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    const msg = error.message?.toLowerCase() ?? ''
    if (error.code === 'email_not_confirmed' || msg.includes('not confirmed')) {
      return { error: 'Email ainda não confirmado.' }
    }
    if (error.status === 429 || msg.includes('rate')) {
      return { error: 'Muitas tentativas. Espere um pouco e tente de novo.' }
    }
    return { error: 'Email ou senha incorretos' }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirect(formData.get('redirectTo')))
}

export async function signUpWithPassword(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    username: formData.get('username'),
    displayName: formData.get('displayName') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()

  // Pré-checa username pra dar erro amigável (a trigger handle_new_user
  // falharia com erro genérico de banco no caso de duplicidade).
  const { data: taken } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .maybeSingle()
  if (taken) {
    return { error: 'Esse username já está em uso' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await appUrl()}/auth/callback`,
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName ?? parsed.data.username,
      },
    },
  })
  if (error) {
    return { error: error.message }
  }

  // Confirmação de email DESLIGADA → já vem sessão, manda pra home.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/')
  }

  // Confirmação LIGADA → sem sessão ainda.
  return {
    ok: true,
    message: 'Conta criada! Confira seu email para confirmar e entrar.',
  }
}

export async function signInWithMagicLink(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Email inválido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${await appUrl()}/auth/callback`,
      shouldCreateUser: false,
    },
  })
  if (error) {
    return { error: error.message }
  }

  return { ok: true, message: 'Link mágico enviado! Confira seu email.' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
