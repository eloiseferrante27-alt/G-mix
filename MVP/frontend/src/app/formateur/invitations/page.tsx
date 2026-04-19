import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import crypto from 'crypto';

export default async function FormateurInvitationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!session.organizationId) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto text-center py-16">
          <p className="text-2xl mb-3">🏢</p>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Aucune organisation</h1>
          <p className="text-slate-500">
            Vous n&apos;êtes rattaché à aucune organisation. Rejoignez-en une via un code d&apos;invitation.
          </p>
        </div>
      </div>
    );
  }

  const supabase = createServiceClient();

  const { data: invites } = await supabase
    .from('organization_invites')
    .select('*')
    .eq('organization_id', session.organizationId)
    .eq('role', 'joueur')
    .order('created_at', { ascending: false });

  async function handleCreateInvite(formData: FormData) {
    'use server';
    const email = (formData.get('email') as string)?.trim() || null;
    const sess = await getSession();
    if (!sess?.organizationId) return;

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const supabase = createServiceClient();
    await supabase.from('organization_invites').insert({
      organization_id: sess.organizationId,
      email,
      role: 'joueur',
      token,
      invited_by: sess.userId,
      expires_at: expiresAt.toISOString(),
    });

    redirect('/formateur/invitations');
  }

  async function handleRevokeInvite(formData: FormData) {
    'use server';
    const id = formData.get('invite_id') as string;
    const supabase = createServiceClient();
    await supabase.from('organization_invites').delete().eq('id', id);
    redirect('/formateur/invitations');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Inviter des joueurs</h1>
        <p className="text-slate-500 mt-1">
          Invitez des joueurs à rejoindre votre organisation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Créer une invitation</CardTitle></CardHeader>
          <CardContent>
            <form action={handleCreateInvite} className="space-y-4">
              <div>
                <Label htmlFor="email">Email du joueur (optionnel)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="joueur@exemple.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Laissez vide pour un code générique
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-700">
                Les invitations créées par un formateur accordent le rôle <strong>Joueur</strong> uniquement.
              </div>
              <Button type="submit" className="w-full">Créer l&apos;invitation</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Invitations joueurs en cours ({invites?.filter(i => !i.accepted_at).length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Email / Code</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Expire</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invites?.map((inv) => {
                  const isAccepted = !!inv.accepted_at;
                  const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{inv.email || '— générique —'}</div>
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-0.5 block">
                          {inv.token}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {isAccepted ? (
                          <Badge variant="success">Acceptée</Badge>
                        ) : isExpired ? (
                          <Badge variant="default">Expirée</Badge>
                        ) : (
                          <Badge variant="info">En attente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {inv.expires_at
                          ? new Date(inv.expires_at).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!isAccepted && (
                          <form action={handleRevokeInvite}>
                            <input type="hidden" name="invite_id" value={inv.id} />
                            <button type="submit" className="text-red-600 hover:underline text-xs">
                              Révoquer
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!invites?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Aucune invitation créée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="py-4 flex items-start gap-3 text-sm text-slate-600">
          <span className="text-xl">💡</span>
          <div>
            <strong>Comment inviter un joueur :</strong> Partagez le code token.
            Le joueur le saisit lors de son inscription sur{' '}
            <code className="bg-slate-100 px-1 rounded">{appUrl}/register</code> pour
            rejoindre automatiquement votre organisation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
