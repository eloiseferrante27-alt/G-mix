import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPlanConfig, getPlanLimits } from '@/lib/plans';

const roleVariant: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  admin: 'default', organisme: 'info', formateur: 'warning', joueur: 'success',
};
const roleLabel: Record<string, string> = {
  admin: 'Admin', organisme: 'Organisme', formateur: 'Formateur', joueur: 'Joueur',
};

const PLANS = [
  { key: 'demo', label: 'Démo (gratuit)' },
  { key: 'plan_199', label: 'Starter — 199 €/mois' },
  { key: 'plan_299', label: 'Pro — 299 €/mois' },
  { key: 'plan_499', label: 'Enterprise — 499 €/mois' },
];

export default async function AdminOrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const { id } = await params;
  const { success, error } = await searchParams;
  const supabase = createServiceClient();

  const [{ data: org }, { data: members }, { data: sessions }, { data: scenarios }] =
    await Promise.all([
      supabase.from('organizations').select('*').eq('id', id).single(),
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, created_at, disabled')
        .eq('organization_id', id)
        .neq('role', 'admin')
        .order('role')
        .order('last_name'),
      supabase
        .from('game_sessions')
        .select('id, name, status, current_turn, total_turns, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('scenarios')
        .select('id, name, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (!org) redirect('/admin/organizations');

  async function handleUpdateOrg(formData: FormData) {
    'use server';
    const sess = await getSession();
    if (!sess || sess.role !== 'admin') redirect('/login');

    const name = (formData.get('name') as string)?.trim();
    if (!name) redirect(`/admin/organizations/${id}?error=Le+nom+est+obligatoire`);

    const contact_email = (formData.get('contact_email') as string)?.trim() || null;
    const plan = formData.get('plan') as string;
    const ai_generation_enabled = formData.get('ai_generation_enabled') === 'on';
    const subscription_raw = (formData.get('subscription_expires_at') as string)?.trim();
    const subscription_expires_at = subscription_raw || null;

    // Limits always derived from plan — single source of truth
    const limits = getPlanLimits(plan);

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('organizations')
      .update({
        name,
        contact_email,
        plan,
        ai_generation_enabled,
        max_formateurs: limits.max_formateurs,
        max_sessions: limits.max_sessions,
        max_scenarios: limits.max_scenarios,
        subscription_expires_at,
      })
      .eq('id', id);

    if (error) redirect(`/admin/organizations/${id}?error=${encodeURIComponent('Erreur : ' + error.message)}`);
    redirect(`/admin/organizations/${id}?success=Modifications+enregistrées`);
  }

  async function handleRemoveMember(formData: FormData) {
    'use server';
    const sess = await getSession();
    if (!sess || sess.role !== 'admin') redirect('/login');
    const userId = formData.get('user_id') as string;
    const supabase = createServiceClient();
    await supabase.from('profiles').update({ organization_id: null }).eq('id', userId);
    redirect(`/admin/organizations/${id}`);
  }

  const expiresAtValue = org.subscription_expires_at
    ? new Date(org.subscription_expires_at).toISOString().split('T')[0]
    : '';

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/organizations" className="text-sm text-purple-700 hover:underline mb-2 block">
          ← Retour aux organisations
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
        <p className="text-slate-500 mt-1 text-sm">ID : <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{org.id}</code></p>
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

      {/* Edit form */}
      <Card className="mb-8">
        <CardHeader><CardTitle>Modifier l&apos;organisation</CardTitle></CardHeader>
        <CardContent>
          <form action={handleUpdateOrg} className="space-y-6">
            {/* Identité */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom de l&apos;organisation</Label>
                <Input id="name" name="name" defaultValue={org.name} required />
              </div>
              <div>
                <Label htmlFor="contact_email">Email de contact</Label>
                <Input id="contact_email" name="contact_email" type="email" defaultValue={org.contact_email ?? ''} placeholder="contact@ecole.fr" />
              </div>
            </div>

            {/* Plan & IA */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plan">Plan</Label>
                <select
                  id="plan"
                  name="plan"
                  defaultValue={org.plan}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {PLANS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="subscription_expires_at">Abonnement jusqu&apos;au</Label>
                <Input
                  id="subscription_expires_at"
                  name="subscription_expires_at"
                  type="date"
                  defaultValue={expiresAtValue}
                />
              </div>
            </div>

            {/* Plan limits preview — auto-applied on save */}
            {(() => {
              const preview = getPlanConfig(org.plan);
              const fmt = (v: number) => v === -1 ? '∞' : String(v);
              return preview ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
                    Limites appliquées par le plan sélectionné
                  </p>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    {[
                      { label: 'Formateurs', value: fmt(preview.maxFormateurs) },
                      { label: 'Sessions', value: fmt(preview.maxSessions) },
                      { label: 'Scénarios', value: fmt(preview.maxScenarios) },
                      { label: 'Joueurs', value: fmt(preview.maxJoueurs) },
                    ].map((item) => (
                      <div key={item.label} className="bg-white rounded-md border border-slate-200 p-3 text-center">
                        <p className="text-lg font-bold text-slate-900">{item.value}</p>
                        <p className="text-xs text-slate-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Ces valeurs se mettent à jour automatiquement lors du changement de plan.</p>
                </div>
              ) : null;
            })()}

            {/* IA toggle */}
            <div className="flex items-center gap-3">
              <input
                id="ai_generation_enabled"
                name="ai_generation_enabled"
                type="checkbox"
                defaultChecked={org.ai_generation_enabled ?? false}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
              />
              <Label htmlFor="ai_generation_enabled" className="cursor-pointer">
                Génération IA activée
              </Label>
            </div>

            <Button type="submit">Enregistrer les modifications</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Membres', value: members?.length ?? 0, icon: '👥' },
          { label: 'Sessions', value: sessions?.length ?? 0, icon: '🎮' },
          { label: 'Scénarios', value: scenarios?.length ?? 0, icon: '📝' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Members */}
      <Card className="mb-6">
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
                <th className="px-6 py-3" />
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
                  <td className="px-6 py-3">
                    <form action={handleRemoveMember}>
                      <input type="hidden" name="user_id" value={m.id} />
                      <button type="submit" className="text-xs text-red-500 hover:underline">
                        Retirer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!members?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">Aucun membre</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Sessions */}
      {sessions && sessions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sessions ({sessions.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Nom</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Statut</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Tour</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-6 py-3">
                      <Badge variant={s.status === 'active' ? 'success' : s.status === 'completed' ? 'info' : 'default'}>
                        {s.status === 'draft' ? 'Brouillon' : s.status === 'active' ? 'En cours' : s.status === 'completed' ? 'Terminée' : s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{s.current_turn}/{s.total_turns}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
