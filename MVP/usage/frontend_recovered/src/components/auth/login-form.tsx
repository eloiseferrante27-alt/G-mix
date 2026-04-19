'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, type AuthState } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const initialState: AuthState = {}

export function LoginForm() {
  const [state, action, isPending] = useActionState(login, initialState)

  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <Input
        id="email"
        name="email"
        type="email"
        label="Adresse email"
        placeholder="vous@exemple.com"
        autoComplete="email"
        required
        error={state.errors?.email?.[0]}
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Mot de passe"
        placeholder="••••••••"
        autoComplete="current-password"
        required
        error={state.errors?.password?.[0]}
      />

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-purple-700 hover:underline">
          Mot de passe oublié ?
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={isPending}>
        Se connecter
      </Button>

      <p className="text-center text-sm text-slate-600">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-purple-700 hover:underline font-medium">
          Créer un compte
        </Link>
      </p>
    </form>
  )
}
