import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPlanConfig } from '@/lib/plans';

const roleVariant: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  organisme: 'info', formateur: 'warning', joueur: 'success',
};
const roleLabel: Record<string, string> = {
  organisme: 'Organisme', formateur: 'Formateur', joueur: 'Joueur',
};

export default async function OrganismeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'organisme' && session.role !== 'admin') redirect('/organisme');

  const { success, error } = await searchParams;

  const supabase = createServiceClient();

  const orgId = session.organizationId;
  if (!orgId) redirect('/organisme');

  const [{ data: org }, { data: members }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, disabled')
      .eq('organization_id', orgId)
      .neq('role', 'admin')
      .order('role')
      .order('last_name'),
  ]);

  if (!org) redirect('/organisme');

  const plan = getPlanConfig(org.plan);

  async function handleUpdateOrg(formData: FormData) {
    'use server';
    const sess = await getSession();
    if (!sess?.organizationId) redirect('/login');

    const name = (formData.get('name') as string)?.trim();
    if (!name) redirect('/organisme/settings?error=Le+nom+est+obligatoire');

    const contact_email = (formData.get('contact_email') as string)?.trim() || null;

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('organizations')
      .update({ name, contact_email })
      .eq('id', sess.organizationId);

    if (error) redirect('/organisme/settings?error=Erreur+lors+de+la+mise+à+jour');
    redirect('/organisme/settings?success=Modifications+enregistrées');
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
        <p className="text-slate-500 mt-1">Informations et paramètres de votre organisation</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {decodeURIComponent(success)}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="space-y-6">
        {/* Edit form */}
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent>
            <form action={handleUpdateOrg} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom de l&apos;organisation</Label>
                  <Input id="name" name="name" defaultValue={org.name} required />
                </div>
                <div>
                  <Label htmlFor="contact_email">Email de contact</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={org.contact_email ?? ''}
                    placeholder="contact@ecole.fr"
                  />
                </div>
              </div>
              <Button type="submit">Enregistrer les modifications</Button>
            </form>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader><CardTitle>Plan et limites</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${plan?.color ?? 'bg-slate-100 text-slate-700'}`}>
                {plan?.name ?? org.plan}
              </span>
              {plan?.price ? (
                <span className="text-slate-600 text-sm">{plan.price} €/mois</span>
              ) : (
                <span className="text-slate-500 text-sm">Gratuit</span>
              )}
              {org.ai_generation_enabled && (
                <span className="text-xs text-green-600 font-medium">✓ IA activée</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Formateurs max', value: plan?.maxFormateurs },
                { label: 'Sessions max', value: plan?.maxSessions },
                { label: 'Scénarios max', value: plan?.maxScenarios },
                { label: 'Joueurs max', value: plan?.maxJoueurs },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="font-semibold text-slate-900">
                    {item.value === -1 || item.value === undefined ? '∞' : item.value}
                  </p>
                </div>
              ))}
            </div>

            {org.subscription_expires_at && (
              <p className="text-xs text-slate-500">
                Abonnement jusqu&apos;au {new Date(org.subscription_expires_at).toLocaleDateString('fr-FR')}
              </p>
            )}

            <p className="text-slate-400 text-xs border-t border-slate-100 pt-3">
              Pour changer de plan, contactez l&apos;administrateur G-MIX.
            </p>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle>Membres ({members?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Utilisateur</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Rôle</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members?.map((m) => (
                  <tr key={m.id} className={`hover:bg-slate-50 ${m.disabled ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-xs flex-shrink-0">
                          {m.first_name?.[0] ?? '?'}{m.last_name?.[0] ?? ''}
                        </div>
                        <span className="font-medium text-slate-900">{m.first_name} {m.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{m.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant={roleVariant[m.role] ?? 'default'}>{roleLabel[m.role] ?? m.role}</Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {new Date(m.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
                {!members?.length && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                      Aucun membre —{' '}
                      <a href="/organisme/invitations" className="text-purple-700 hover:underline">
                        inviter des membres
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Infos techniques */}
        <Card>
          <CardHeader><CardTitle>Informations techniques</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>ID organisation :</span>
              <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{org.id}</code>
            </div>
            <div className="flex justify-between">
              <span>Créée le :</span>
              <span>{new Date(org.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
