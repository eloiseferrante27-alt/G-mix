'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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
  role: z.enum(['organisme', 'formateur', 'joueur']),
  org_name: z.string().optional(),
  org_code: z.string().optional(),
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
    redirect(_dest(user.role))
  }

  // ── Supabase backend (default) ──────────────────────────────────────────────
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error || !data.user) {
    return {
      message: error?.message === 'Email not confirmed'
        ? 'Email non confirmé — contactez votre administrateur'
        : 'Email ou mot de passe incorrect',
    }
  }

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
    email: profile.email ?? data.user.email!,
    role: profile.role as Role,
    organizationId: profile.organization_id ?? '',
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
  })

  redirect(_dest(profile.role))
}

export async function register(state: AuthState, formData: FormData): Promise<AuthState> {
  const result = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    role: formData.get('role'),
    org_name: formData.get('org_name') || undefined,
    org_code: formData.get('org_code') || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { first_name, last_name, email, password, role, org_name, org_code } = result.data

  // Validation spécifique par rôle
  if (role === 'organisme' && !org_name?.trim()) {
    return { errors: { org_name: ['Le nom de votre organisation est requis'] } }
  }

  const service = createServiceClient()

  // Créer l'utilisateur auth
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name, role },
  })

  if (error) {
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('already exists')
    ) {
      return { message: 'Un compte existe déjà avec cet email' }
    }
    return { message: error.message }
  }

  if (!data.user) {
    return { message: 'Erreur lors de la création du compte' }
  }

  const userId = data.user.id
  let organizationId = ''

  // ── Organisme : crée son organisation ──────────────────────────────────────
  if (role === 'organisme') {
    const { data: org, error: orgError } = await service
      .from('organizations')
      .insert({
        name: org_name!.trim(),
        contact_email: email,
        plan: 'free',
        owner_id: userId,
      })
      .select('id')
      .single()

    if (orgError || !org) {
      // Rollback user
      await service.auth.admin.deleteUser(userId)
      return { message: 'Erreur lors de la création de l\'organisation' }
    }
    organizationId = org.id
  }

  // ── Formateur / Joueur : rejoint via code d'invitation ──────────────────────
  if ((role === 'formateur' || role === 'joueur') && org_code?.trim()) {
    const { data: invite } = await service
      .from('organization_invites')
      .select('organization_id, accepted_at, expires_at')
      .eq('token', org_code.trim())
      .is('accepted_at', null)
      .single()

    if (invite) {
      const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date()
      if (!isExpired) {
        organizationId = invite.organization_id
        // Marquer l'invitation comme acceptée
        await service
          .from('organization_invites')
          .update({ accepted_at: new Date().toISOString() })
          .eq('token', org_code.trim())
      }
    }
    // Si code invalide, on continue sans org (l'utilisateur pourra rejoindre plus tard)
  }

  // Créer le profil
  await service.from('profiles').upsert({
    id: userId,
    email,
    first_name,
    last_name,
    role,
    organization_id: organizationId || null,
  }, { onConflict: 'id' })

  // Si organisme, mettre à jour owner_id dans l'org (maintenant que le profil existe)
  if (role === 'organisme' && organizationId) {
    await service
      .from('organizations')
      .update({ owner_id: userId })
      .eq('id', organizationId)
  }

  await createSession({
    userId,
    email,
    role: role as Role,
    organizationId,
    firstName: first_name,
    lastName: last_name,
  })

  redirect(_dest(role))
}

export async function forgotPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email?.includes('@')) return { errors: { email: ['Email invalide'] } }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

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

function _dest(role: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'organisme') return '/organisme'
  if (role === 'formateur') return '/formateur'
  return '/jeu'
}
