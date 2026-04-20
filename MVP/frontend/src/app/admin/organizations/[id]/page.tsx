import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPlanConfig, getPlanLimits, getPlanTier, isLimitValid } from '@/lib/plans';

const roleVariant: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  admin: 'default', organisme: 'info', formateur: 'warning', joueur: 'success',
};
const roleLabel: Record<string, string> = {
  admin: 'Admin', organisme: 'Organisme', formateur: 'Formateur', joueur: 'Joueur',
};

const PLANS = [
  { key: 'demo',     label: 'Démo',        price: 'Gratuit',    tier: 0 },
  { key: 'plan_199', label: 'Starter',      price: '199 €/mois', tier: 1 },
  { key: 'plan_299', label: 'Pro',          price: '299 €/mois', tier: 2 },
  { key: 'plan_499', label: 'Enterprise',   price: '499 €/mois', tier: 3 },
];

function fmt(v: number) { return v === -1 ? '∞' : String(v); }

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

  const [{ data: org }, { data: members }, { data: sessions }] =
    await Promise.all([
      supabase.from('organizations').select('*').eq('id', id).single(),
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, created_at, disabled')
        .eq('organization_id', id)
        .neq('role', 'admin')
        .order('role').order('last_name'),
      supabase
        .from('game_sessions')
        .select('id, name, status, current_turn, total_turns, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (!org) redirect('/admin/organizations');

  // ── Subscription state ────────────────────────────────────────────────────
  const now = new Date();
  const expiresAt = org.subscription_expires_at ? new Date(org.subscription_expires_at) : null;
  const isPlanActive = !expiresAt || expiresAt > now;      // no date = indefinite
  const isPlanExpired = expiresAt !== null && expiresAt <= now;
  const currentTier = getPlanTier(org.plan);
  const currentPlanCfg = getPlanConfig(org.plan);

  // ── Server actions ────────────────────────────────────────────────────────
  async function handleUpdateOrg(formData: FormData) {
    'use server';
    const sess = await getSession();
    if (!sess || sess.role !== 'admin') redirect('/login');

    const name = (formData.get('name') as string)?.trim();
    if (!name) redirect(`/admin/organizations/${id}?error=Le+nom+est+obligatoire`);

    const contact_email = (formData.get('contact_email') as string)?.trim() || null;
    const newPlan = formData.get('plan') as string;
    const ai_generation_enabled = formData.get('ai_generation_enabled') === 'on';
    const subscription_raw = (formData.get('subscription_expires_at') as string)?.trim();
    const subscription_expires_at = subscription_raw || null;
    const forceDowngrade = formData.get('force_downgrade') === 'on';

    const supabase = createServiceClient();
    const { data: currentOrg } = await supabase
      .from('organizations').select('plan, subscription_expires_at, max_formateurs, max_sessions, max_scenarios').eq('id', id).single();

    // ── Downgrade guard ───────────────────────────────────────────────────
    const currentExp = currentOrg?.subscription_expires_at ? new Date(currentOrg.subscription_expires_at) : null;
    const currentActive = !currentExp || currentExp > new Date();
    const newTier = getPlanTier(newPlan);
    const oldTier = getPlanTier(currentOrg?.plan ?? 'demo');

    if (newTier < oldTier && currentActive && !forceDowngrade) {
      redirect(`/admin/organizations/${id}?error=${encodeURIComponent(
        `L'abonnement "${getPlanConfig(currentOrg?.plan ?? 'demo')?.name}" est encore actif` +
        (currentExp ? ` jusqu'au ${currentExp.toLocaleDateString('fr-FR')}` : '') +
        '. Cochez "Forcer la modification" pour rétrograder quand même.'
      )}`);
    }

    // ── Limit validation ──────────────────────────────────────────────────
    const newPlanLimits = getPlanLimits(newPlan);
    const max_formateurs = parseInt(formData.get('max_formateurs') as string, 10);
    const max_sessions   = parseInt(formData.get('max_sessions')   as string, 10);
    const max_scenarios  = parseInt(formData.get('max_scenarios')  as string, 10);

    const limitErrors: string[] = [];
    if (!isLimitValid(max_formateurs, newPlanLimits.max_formateurs))
      limitErrors.push(`Formateurs min. ${fmt(newPlanLimits.max_formateurs)}`);
    if (!isLimitValid(max_sessions, newPlanLimits.max_sessions))
      limitErrors.push(`Sessions min. ${fmt(newPlanLimits.max_sessions)}`);
    if (!isLimitValid(max_scenarios, newPlanLimits.max_scenarios))
      limitErrors.push(`Scénarios min. ${fmt(newPlanLimits.max_scenarios)}`);

    if (limitErrors.length > 0) {
      redirect(`/admin/organizations/${id}?error=${encodeURIComponent(
        'Limites inférieures au plan : ' + limitErrors.join(', ')
      )}`);
    }

    // ── Save ──────────────────────────────────────────────────────────────
    const { error } = await supabase.from('organizations').update({
      name, contact_email, plan: newPlan, ai_generation_enabled,
      max_formateurs, max_sessions, max_scenarios,
      subscription_expires_at,
    }).eq('id', id);

    if (error) redirect(`/admin/organizations/${id}?error=${encodeURIComponent('Erreur : ' + error.message)}`);
    redirect(`/admin/organizations/${id}?success=Modifications+enregistrées`);
  }

  async function handleResetLimits(formData: FormData) {
    'use server';
    const sess = await getSession();
    if (!sess || sess.role !== 'admin') redirect('/login');
    const planKey = formData.get('plan') as string;
    const limits = getPlanLimits(planKey);
    const supabase = createServiceClient();
    await supabase.from('organizations').update({
      max_formateurs: limits.max_formateurs,
      max_sessions:   limits.max_sessions,
      max_scenarios:  limits.max_scenarios,
    }).eq('id', id);
    redirect(`/admin/organizations/${id}?success=Limites+réinitialisées+aux+valeurs+du+plan`);
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

  const expiresAtValue = expiresAt ? expiresAt.toISOString().split('T')[0] : '';
  const planLimits = getPlanLimits(org.plan);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/organizations" className="text-sm text-purple-700 hover:underline mb-2 block">
          ← Retour aux organisations
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
          {/* Active plan badge */}
          {currentPlanCfg && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentPlanCfg.color}`}>
              {currentPlanCfg.name}
            </span>
          )}
          {isPlanActive && !isPlanExpired && (
            <span className="text-xs text-green-600 font-medium">
              ● Actif{expiresAt ? ` jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}` : ' (permanent)'}
            </span>
          )}
          {isPlanExpired && (
            <span className="text-xs text-red-500 font-medium">
              ✕ Expiré le {expiresAt!.toLocaleDateString('fr-FR')} — retour Démo
            </span>
          )}
        </div>
        <p className="text-slate-400 mt-1 text-xs">
          ID : <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{org.id}</code>
        </p>
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

      {/* ── Edit form ─────────────────────────────────────────────────────── */}
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
                <Input id="contact_email" name="contact_email" type="email"
                  defaultValue={org.contact_email ?? ''} placeholder="contact@ecole.fr" />
              </div>
            </div>

            {/* Plan + expiry */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plan">Plan d&apos;abonnement</Label>
                <select id="plan" name="plan" defaultValue={org.plan}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {PLANS.map((p) => (
                    <option key={p.key} value={p.key}
                      disabled={p.tier < currentTier && isPlanActive}>
                      {p.label} — {p.price}
                      {p.tier < currentTier && isPlanActive ? ' (abonnement actif supérieur)' : ''}
                    </option>
                  ))}
                </select>
                {isPlanActive && expiresAt && (
                  <p className="text-xs text-amber-600 mt-1">
                    Abonnement actif jusqu&apos;au {expiresAt.toLocaleDateString('fr-FR')} — la rétrogradation est bloquée sauf override.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="subscription_expires_at">Date d&apos;expiration</Label>
                <Input id="subscription_expires_at" name="subscription_expires_at" type="date"
                  defaultValue={expiresAtValue} />
                <p className="text-xs text-slate-400 mt-1">Laisser vide = abonnement permanent</p>
              </div>
            </div>

            {/* Custom limits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Limites personnalisées</p>
                  <p className="text-xs text-slate-400">Les valeurs doivent être ≥ aux limites du plan. −1 = illimité.</p>
                </div>
                {/* Reset button */}
                <form action={handleResetLimits}>
                  <input type="hidden" name="plan" value={org.plan} />
                  <button type="submit"
                    className="text-xs text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors">
                    Réinitialiser aux valeurs du plan
                  </button>
                </form>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'max_formateurs', label: 'Formateurs max', current: org.max_formateurs, planDefault: planLimits.max_formateurs },
                  { id: 'max_sessions',   label: 'Sessions max',   current: org.max_sessions,   planDefault: planLimits.max_sessions   },
                  { id: 'max_scenarios',  label: 'Scénarios max',  current: org.max_scenarios,  planDefault: planLimits.max_scenarios  },
                ].map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id} name={field.id} type="number"
                      min={field.planDefault === -1 ? -1 : field.planDefault}
                      defaultValue={field.current ?? field.planDefault}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Plan: {fmt(field.planDefault)} · Actuel: {fmt(field.current ?? field.planDefault)}
                    </p>
                  </div>
                ))}
              </div>
              {/* Joueurs max: always from plan, not stored in DB */}
              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                <span className="font-medium">Joueurs max :</span>
                <span className="font-bold text-slate-900">{fmt(planLimits.max_joueurs)}</span>
                <span className="text-xs text-slate-400">(défini par le plan, non modifiable séparément)</span>
              </div>
            </div>

            {/* IA */}
            <div className="flex items-center gap-3">
              <input id="ai_generation_enabled" name="ai_generation_enabled" type="checkbox"
                defaultChecked={org.ai_generation_enabled ?? false}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" />
              <Label htmlFor="ai_generation_enabled" className="cursor-pointer">
                Génération IA activée
              </Label>
            </div>

            {/* Force downgrade override */}
            {isPlanActive && expiresAt && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <input id="force_downgrade" name="force_downgrade" type="checkbox"
                  className="w-4 h-4 text-red-600 rounded border-red-300" />
                <Label htmlFor="force_downgrade" className="cursor-pointer text-red-700 text-sm">
                  Forcer la modification même si l&apos;abonnement actuel est encore actif (admin seulement)
                </Label>
              </div>
            )}

            <Button type="submit">Enregistrer les modifications</Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Membres', value: members?.length ?? 0, icon: '👥' },
          { label: 'Sessions', value: sessions?.length ?? 0, icon: '🎮' },
          { label: 'Scénarios (via DB)', value: '—', icon: '📝' },
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

      {/* ── Members ───────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Membres ({members?.length ?? 0})</CardTitle></CardHeader>
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
                      <button type="submit" className="text-xs text-red-500 hover:underline">Retirer</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!members?.length && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Aucun membre</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Sessions ──────────────────────────────────────────────────────── */}
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
