import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function AdminDashboard() {
  const session = await getSession();
  const supabase = createServiceClient();

  const [
    { count: orgCount },
    { count: userCount },
    { count: sessionCount },
  ] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
    supabase.from('game_sessions').select('id', { count: 'exact', head: true }),
  ]);

  const stats = [
    { label: 'Organisations', value: orgCount ?? 0, icon: '🏢', href: '/admin/organizations' },
    { label: 'Utilisateurs', value: userCount ?? 0, icon: '👤', href: '/admin/organizations' },
    { label: 'Sessions de jeu', value: sessionCount ?? 0, icon: '🎮', href: '/formateur' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Administration G-MIX</h1>
        <p className="text-slate-500 mt-1">Bonjour, {session?.firstName} — vue globale de la plateforme</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">
                  {s.icon}
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Actions rapides</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { href: '/admin/organizations', label: '🏢 Gérer les organisations et membres' },
              { href: '/formateur/scenarios/new', label: '📝 Créer un scénario' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="block w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
              >
                {action.label}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Informations système</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Backend actif :</span>
              <span className="font-medium text-green-600">Supabase</span>
            </div>
            <div className="flex justify-between">
              <span>Backend fallback :</span>
              <span className="font-medium text-slate-500">Django (port 8000)</span>
            </div>
            <div className="flex justify-between">
              <span>Version :</span>
              <span className="font-medium">G-MIX MVP v0.1</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
