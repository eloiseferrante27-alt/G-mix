'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login } from '@/app/actions/auth';

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});

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
        error={state.errors?.email?.[0]}
        required
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Mot de passe"
        placeholder="••••••••"
        error={state.errors?.password?.[0]}
        required
      />

      <Button type="submit" className="w-full" loading={pending}>
        Se connecter
      </Button>

      <p className="text-center text-sm text-slate-600">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-purple-700 hover:underline font-medium">
          S'inscrire
        </Link>
      </p>
    </form>
  );
}
