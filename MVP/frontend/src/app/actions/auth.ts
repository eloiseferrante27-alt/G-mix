'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession, deleteSession } from '@/lib/session'
import { isDjango, djangoFetch } from '@/lib/backend'
import type { Role } from '@/types'

const LoginSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe trop court' }),
})

const RegisterSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(8, { message: 'Minimum 8 caractères' }),
  first_name: z.string().min(1, { message: 'Prénom requis' }),
  last_name: z.string().min(1, { message: 'Nom requis' }),
  role: z.enum(['formateur', 'joueur']),
})

export type AuthState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const result = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // ── Django backend ──────────────────────────────────────────────────────────
  if (isDjango()) {
    const resp = await djangoFetch('auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email: result.data.email, password: result.data.password }),
    })
    const json = await resp.json()
    if (!resp.ok) return { message: json.error ?? 'Email ou mot de passe incorrect' }

    const { user, access } = json
    await createSession({
      userId: String(user.id),
      email: user.email,
      role: user.role as Role,
      organizationId: user.organization_id ?? '',
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      djangoToken: access,
    })
    const dest = user.role === 'admin' ? '/admin' : user.role === 'formateur' ? '/formateur' : '/jeu'
    redirect(dest)
  }

  // ── Supabase backend (default) ──────────────────────────────────────────────
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error || !data.user) {
    return { message: error?.message === 'Email not confirmed'
      ? 'Email non confirmé — contactez votre administrateur'
      : 'Email ou mot de passe incorrect' }
  }

  // Use service client to bypass RLS — session cookie not yet committed in server action
  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (!profile) {
    return { message: 'Profil introuvable — réessayez dans quelques instants' }
  }

  await createSession({
    userId: data.user.id,
    email: data.user.email!,
    role: profile.role as Role,
    organizationId: profile.organization_id ?? '',
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
  })

  const dest = profile.role === 'admin' ? '/admin' : profile.role === 'formateur' ? '/formateur' : '/jeu'
  redirect(dest)
}

export async function register(state: AuthState, formData: FormData): Promise<AuthState> {
  const result = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    role: formData.get('role'),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { first_name, last_name, email, password, role } = result.data

  // Use admin.createUser to bypass email confirmation entirely (no SMTP needed)
  const service = createServiceClient()
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name, role },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
      return { message: 'Un compte existe déjà avec cet email' }
    }
    return { message: error.message }
  }

  if (!data.user) {
    return { message: 'Erreur lors de la création du compte' }
  }

  await service
    .from('profiles')
    .upsert({
      id: data.user.id,
      email,
      first_name,
      last_name,
      role,
    })

  await createSession({
    userId: data.user.id,
    email,
    role: role as Role,
    organizationId: '',
    firstName: first_name,
    lastName: last_name,
  })

  const dest = role === 'formateur' ? '/formateur' : '/jeu'
  redirect(dest)
}

export async function forgotPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email?.includes('@')) return { errors: { email: ['Email invalide'] } }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  // Always succeed — don't leak whether the email exists
  return { message: 'sent' }
}

export async function logout() {
  if (!isDjango()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  await deleteSession()
  redirect('/login')
}
