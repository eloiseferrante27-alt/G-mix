'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { GmixLogo } from '@/components/ui/gmix-logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { register } from '@/app/actions/auth';
import { Select, SelectItem } from '@/components/ui/select';

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, {});

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GmixLogo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">G-MIX</h1>
          <p className="text-slate-600 mt-2">Créez votre compte</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
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

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="first_name"
                name="first_name"
                type="text"
                label="Prénom"
                placeholder="Jean"
                error={state.errors?.first_name?.[0]}
                required
              />
              <Input
                id="last_name"
                name="last_name"
                type="text"
                label="Nom"
                placeholder="Dupont"
                error={state.errors?.last_name?.[0]}
                required
              />
            </div>

            <Input
              id="password"
              name="password"
              type="password"
              label="Mot de passe"
              placeholder="••••••••"
              error={state.errors?.password?.[0]}
              required
            />

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
                Rôle
              </label>
              <Select id="role" name="role" required defaultValue="joueur">
                <SelectItem value="joueur">Joueur</SelectItem>
                <SelectItem value="formateur">Formateur</SelectItem>
              </Select>
              {state.errors?.role && (
                <p className="mt-1 text-sm text-red-600">{state.errors.role[0]}</p>
              )}
            </div>

            <Button type="submit" className="w-full" loading={pending}>
              Créer mon compte
            </Button>

            <p className="text-center text-sm text-slate-600">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-purple-700 hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
