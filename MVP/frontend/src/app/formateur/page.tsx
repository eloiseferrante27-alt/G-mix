import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPlanConfig } from '@/lib/plans';

const statusBadge = (s: string) => {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
    draft: 'default', active: 'success', completed: 'info', archived: 'default'
  };
  return map[s] ?? 'default';
};

const statusLabel: Record<string, string> = {
  draft: 'Brouillon', active: 'En cours', completed: 'Terminée', archived: 'Archivée'
};

export default async function FormateurDashboard() {
  const session = await getSession();
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();

  const [{ data: sessions }, { data: profile }] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('*, scenarios(name), teams(id)')
      .eq('formateur_id', session!.userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('organization_id, organizations(id, name, plan, ai_generation_enabled, max_scenarios, max_sessions)')
      .eq('id', session!.userId)
      .single(),
  ]);

  const org = profile?.organizations as unknown as {
    id: string; name: string; plan: string
    ai_generation_enabled: boolean; max_scenarios: number; max_sessions: number
  } | null;
  const planCfg = org ? getPlanConfig(org.plan) : null;

  const active = sessions?.filter((s) => s.status === 'active').length ?? 0;
  const total = sessions?.length ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bonjour, {session?.firstName} 👋</h1>
          <p className="text-slate-500 mt-1">Gérez vos sessions de business game</p>
        </div>
        <Link
          href="/formateur/sessions/new"
          className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
        >
          ➕ Nouvelle session
        </Link>
      </div>

      {org && planCfg && (
        <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏢</span>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{org.name}</p>
              <p className="text-xs text-slate-400">Votre organisation</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${planCfg.color}`}>
              {planCfg.badge}
            </span>
            {org.ai_generation_enabled ? (
              <span className="text-green-600 text-xs font-medium">✓ Génération IA activée</span>
            ) : (
              <span className="text-slate-400 text-xs">IA non disponible sur ce plan</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">🎮</div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{total}</p>
              <p className="text-sm text-slate-500">Sessions créées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">▶️</div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{active}</p>
              <p className="text-sm text-slate-500">Sessions actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">✅</div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{sessions?.filter((s) => s.status === 'completed').length ?? 0}</p>
              <p className="text-sm text-slate-500">Sessions terminées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Session</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Scénario</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Tour</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Équipes</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Statut</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions?.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-6 py-3 text-slate-600">{(s.scenarios as { name: string } | null)?.name ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{s.current_turn}/{s.total_turns}</td>
                  <td className="px-6 py-3 text-slate-600">{(s.teams as { id: string }[])?.length ?? 0}</td>
                  <td className="px-6 py-3">
                    <Badge variant={statusBadge(s.status)}>{statusLabel[s.status]}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/formateur/sessions/${s.id}`}
                      className="text-purple-700 hover:underline text-sm font-medium"
                    >
                      Gérer →
                    </Link>
                  </td>
                </tr>
              ))}
              {!sessions?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-400 mb-3">Aucune session créée</p>
                    <Link
                      href="/formateur/sessions/new"
                      className="text-purple-700 hover:underline text-sm font-medium"
                    >
                      Créer ma première session →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}