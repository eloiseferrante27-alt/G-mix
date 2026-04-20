import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getPlanConfig } from '@/lib/plans';

export default async function OrganismeDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');

  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', session.userId)
    .single();

  if (!org && session.organizationId) {
    const { data: orgById } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', session.organizationId)
      .single();
    if (orgById) {
      // redirect to same page with org data in scope — just proceed with orgById
    }
  }

  const orgData = org ?? (session.organizationId
    ? (await supabase.from('organizations').select('*').eq('id', session.organizationId).single()).data
    : null);

  const [
    { count: formateurCount },
    { count: joueurCount },
    { count: sessionCount },
    { count: scenarioCount },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('organization_id', session.organizationId).eq('role', 'formateur'),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('organization_id', session.organizationId).eq('role', 'joueur'),
    supabase.from('game_sessions').select('id', { count: 'exact', head: true })
      .eq('organization_id', session.organizationId),
    supabase.from('scenarios').select('id', { count: 'exact', head: true })
      .eq('organization_id', session.organizationId),
  ]);

  const plan = orgData ? getPlanConfig(orgData.plan) : null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <a href="/organisme/settings" className="hover:underline">
          <h1 className="text-2xl font-bold text-slate-900 inline">
            {orgData?.name ?? 'Mon organisation'}
          </h1>
        </a>
        <span className="ml-2 text-xs text-purple-600 hover:underline"><a href="/organisme/settings">✎ Modifier</a></span>
        <div className="flex items-center gap-3 mt-2">
          {plan && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.color}`}>
              {plan.badge}
            </span>
          )}
          {orgData?.ai_generation_enabled && (
            <span className="text-xs text-green-600 font-medium">✓ Génération IA activée</span>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Formateurs', value: formateurCount ?? 0, icon: '🎓', color: 'bg-purple-50' },
          { label: 'Joueurs', value: joueurCount ?? 0, icon: '🎮', color: 'bg-green-50' },
          { label: 'Sessions', value: sessionCount ?? 0, icon: '📋', color: 'bg-blue-50' },
          { label: 'Scénarios', value: scenarioCount ?? 0, icon: '📝', color: 'bg-orange-50' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 py-5">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center text-xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions rapides */}
        <Card>
          <CardHeader><CardTitle>Actions rapides</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: '/organisme/invitations', label: '✉️ Inviter un formateur ou un joueur' },
              { href: '/organisme/membres', label: '👥 Gérer les membres' },
              { href: '/formateur/sessions/new', label: '🎮 Créer une session' },
              { href: '/formateur/scenarios/new', label: '📝 Créer un scénario' },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="block px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
              >
                {a.label}
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Limites du plan */}
        {orgData && plan && (
          <Card>
            <CardHeader><CardTitle>Limites du plan {plan.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Formateurs', used: formateurCount ?? 0, max: plan?.maxFormateurs ?? -1 },
                { label: 'Scénarios', used: scenarioCount ?? 0, max: plan?.maxScenarios ?? -1 },
                { label: 'Sessions', used: sessionCount ?? 0, max: plan?.maxSessions ?? -1 },
              ].map((item) => {
                const pct = item.max > 0 ? Math.min(100, ((item.used / item.max) * 100)) : 0;
                const unlimited = item.max < 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-medium">
                        {item.used} / {unlimited ? '∞' : item.max}
                      </span>
                    </div>
                    {!unlimited && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
