import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default async function RejoindreSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { error, success } = await searchParams;

  async function handleJoin(formData: FormData) {
    'use server';
    const token = (formData.get('token') as string)?.trim();
    if (!token) redirect('/jeu/rejoindre?error=Code+manquant');

    const sess = await getSession();
    if (!sess) redirect('/login');

    const supabase = createServiceClient();

    // Find the invite
    const { data: invite } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .maybeSingle();

    if (!invite) redirect('/jeu/rejoindre?error=Code+invalide+ou+expiré');

    // Check not expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      redirect('/jeu/rejoindre?error=Ce+code+a+expiré');
    }

    // Check email match if specified
    if (invite.email && invite.email.toLowerCase() !== sess.email?.toLowerCase()) {
      redirect('/jeu/rejoindre?error=Ce+code+est+réservé+à+une+autre+adresse+email');
    }

    // Check role
    if (invite.role !== 'joueur') {
      redirect('/jeu/rejoindre?error=Ce+code+est+réservé+aux+formateurs');
    }

    // Attach user to organization
    await supabase
      .from('profiles')
      .update({ organization_id: invite.organization_id })
      .eq('id', sess.userId);

    // Mark invite as accepted
    await supabase
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    redirect('/jeu?success=Organisation+rejointe+avec+succès');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🎮</p>
          <h1 className="text-2xl font-bold text-slate-900">Rejoindre une session</h1>
          <p className="text-slate-500 mt-2">
            Entrez le code d&apos;invitation fourni par votre formateur
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Code d&apos;invitation</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {decodeURIComponent(error)}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {decodeURIComponent(success)}
              </div>
            )}

            <form action={handleJoin} className="space-y-4">
              <div>
                <Label htmlFor="token">Code d&apos;invitation</Label>
                <Input
                  id="token"
                  name="token"
                  placeholder="ex : a1b2c3d4e5f6..."
                  className="font-mono"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Code reçu par email ou transmis par votre formateur
                </p>
              </div>
              <Button type="submit" className="w-full">
                Rejoindre l&apos;organisation
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-4 text-sm text-slate-500">
          <Link href="/jeu" className="text-purple-700 hover:underline">
            ← Retour à mes sessions
          </Link>
        </p>
      </div>
    </div>
  );
}
