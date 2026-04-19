'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { GmixLogo } from '@/components/ui/gmix-logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { register } from '@/app/actions/auth';

type RoleOption = 'organisme' | 'formateur' | 'joueur';

const roleDescriptions: Record<RoleOption, { label: string; description: string; icon: string }> = {
  organisme: {
    label: 'Organisme',
    description: 'Vous gérez une organisation et ses accès (formateurs, joueurs, sessions)',
    icon: '🏢',
  },
  formateur: {
    label: 'Formateur',
    description: 'Vous créez et animez des sessions de business game pour vos équipes',
    icon: '🎓',
  },
  joueur: {
    label: 'Joueur',
    description: 'Vous participez aux sessions de business game',
    icon: '🎮',
  },
};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, {});
  const [selectedRole, setSelectedRole] = useState<RoleOption>('formateur');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GmixLogo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">G-MIX</h1>
          <p className="text-slate-600 mt-2">Créez votre compte</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form action={action} className="space-y-5">
            {state.message && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {state.message}
              </div>
            )}

            {/* Sélection du rôle */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Vous êtes…</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(roleDescriptions) as [RoleOption, typeof roleDescriptions[RoleOption]][]).map(([role, info]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-center transition-colors
                      ${selectedRole === role
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-600 hover:border-purple-300'}`}
                  >
                    <span className="text-xl">{info.icon}</span>
                    <span className="text-xs font-medium">{info.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{roleDescriptions[selectedRole].description}</p>
              <input type="hidden" name="role" value={selectedRole} />
            </div>

            {/* Champs communs */}
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
              placeholder="Minimum 8 caractères"
              error={state.errors?.password?.[0]}
              required
            />

            {/* Champ spécifique organisme : nom de l'organisation */}
            {selectedRole === 'organisme' && (
              <Input
                id="org_name"
                name="org_name"
                type="text"
                label="Nom de votre organisation"
                placeholder="Ex: École de Commerce Paris"
                error={state.errors?.org_name?.[0]}
                required
              />
            )}

            {/* Champ spécifique formateur/joueur : code d'invitation optionnel */}
            {(selectedRole === 'formateur' || selectedRole === 'joueur') && (
              <Input
                id="org_code"
                name="org_code"
                type="text"
                label="Code d'invitation organisation (optionnel)"
                placeholder="Laissez vide pour rejoindre plus tard"
              />
            )}

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
