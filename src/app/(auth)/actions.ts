'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  magicLinkSchema,
  newPasswordSchema,
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

// "Esqueci minha senha": dispara o email de recuperação. O link volta pra
// /auth/callback (que troca o code por sessão de recuperação) e cai na tela
// /redefinir-senha. Por segurança não revela se o email existe ou não.
export async function requestPasswordReset(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Email inválido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await appUrl()}/auth/callback?next=/redefinir-senha`,
  })
  if (error && error.status === 429) {
    return { error: 'Muitas tentativas. Espere um pouco e tente de novo.' }
  }

  // mensagem genérica de propósito (não vaza quais emails têm conta)
  return {
    ok: true,
    message: 'Se houver uma conta com esse email, enviamos um link de redefinição.',
  }
}

// Grava a nova senha. Só funciona dentro de uma sessão válida (a de recuperação,
// criada pelo callback; ou a do usuário já logado trocando a própria senha).
export async function updatePassword(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Sessão de recuperação expirada. Peça um novo link.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    const msg = error.message?.toLowerCase() ?? ''
    if (msg.includes('different from the old')) {
      return { error: 'A nova senha precisa ser diferente da atual.' }
    }
    if (error.status === 429 || msg.includes('rate')) {
      return { error: 'Muitas tentativas. Espere um pouco e tente de novo.' }
    }
    return { error: 'Não foi possível trocar a senha. Tente de novo.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
