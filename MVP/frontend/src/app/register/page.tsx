'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GmixLogo } from '@/components/ui/gmix-logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    // TODO: Implement registration logic
    // For now, just redirect to login
    window.location.href = '/login';
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              id="email"
              name="email"
              type="email"
              label="Adresse email"
              placeholder="vous@exemple.com"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="first_name"
                name="first_name"
                type="text"
                label="Prénom"
                placeholder="Jean"
                required
              />
              <Input
                id="last_name"
                name="last_name"
                type="text"
                label="Nom"
                placeholder="Dupont"
                required
              />
            </div>

            <Input
              id="password"
              name="password"
              type="password"
              label="Mot de passe"
              placeholder="••••••••"
              required
            />

            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              label="Confirmer le mot de passe"
              placeholder="••••••••"
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
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