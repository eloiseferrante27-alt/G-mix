import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPlanConfig } from '@/lib/plans';

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

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', session.organizationId)
    .single();

  if (!org) redirect('/organisme');

  const plan = getPlanConfig(org.plan);

  async function handleUpdateOrg(formData: FormData) {
    'use server';
    const name = (formData.get('name') as string)?.trim();
    const contactEmail = (formData.get('contact_email') as string)?.trim();

    if (!name) redirect('/organisme/settings?error=Le+nom+est+obligatoire');

    const sess = await getSession();
    if (!sess?.organizationId) redirect('/login');

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('organizations')
      .update({ name, contact_email: contactEmail || null })
      .eq('id', sess.organizationId);

    if (error) redirect('/organisme/settings?error=Erreur+lors+de+la+mise+à+jour');
    redirect('/organisme/settings?success=Modifications+enregistrées');
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Paramètres de l&apos;organisation</h1>
          <p className="text-slate-500 mt-1">Gérez les informations de votre organisation</p>
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
          <Card>
            <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
            <CardContent>
              <form action={handleUpdateOrg} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de l&apos;organisation</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={org.name}
                    placeholder="Mon école de formation"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Email de contact</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={org.contact_email ?? ''}
                    placeholder="contact@monecole.fr"
                  />
                </div>
                <Button type="submit">Enregistrer les modifications</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Plan actuel</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${plan?.color ?? 'bg-slate-100 text-slate-700'}`}>
                  {plan?.name ?? org.plan}
                </span>
                {plan?.price ? (
                  <span className="text-slate-600">{plan.price} €/mois</span>
                ) : (
                  <span className="text-slate-500">Gratuit</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Jeux max', value: plan?.maxJeux === -1 ? '∞' : plan?.maxJeux },
                  { label: 'Joueurs max', value: plan?.maxJoueurs === -1 ? '∞' : plan?.maxJoueurs },
                  { label: 'Formateurs max', value: plan?.maxFormateurs === -1 ? '∞' : plan?.maxFormateurs },
                  { label: 'Sessions max', value: plan?.maxSessions === -1 ? '∞' : plan?.maxSessions },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="font-semibold text-slate-900">{item.value ?? '—'}</p>
                  </div>
                ))}
              </div>

              {plan?.aiGeneration && (
                <p className="text-green-600 text-xs font-medium">✓ Génération IA activée</p>
              )}

              <div className="pt-2 border-t border-slate-100">
                <p className="text-slate-400 text-xs">
                  Pour changer de plan, contactez l&apos;administrateur G-MIX.
                </p>
              </div>
            </CardContent>
          </Card>

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
              {org.subscription_expires_at && (
                <div className="flex justify-between">
                  <span>Abonnement jusqu&apos;au :</span>
                  <span>{new Date(org.subscription_expires_at).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
