import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusBadge = (s: string) => {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
    draft: 'default', active: 'success', completed: 'info', archived: 'default'
  };
  return map[s] ?? 'default';
};

const statusLabel: Record<string, string> = {
  draft: 'Brouillon', active: 'En cours', completed: 'Terminée', archived: 'Archivée'
};

export default async function SessionsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('*, scenarios(name)')
    .eq('formateur_id', session.userId)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Sessions</h1>
          <p className="text-slate-500 mt-1">Gérez toutes vos sessions de business game</p>
        </div>
        <Link href="/formateur/sessions/new">
          <Button>➕ Nouvelle session</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessions && sessions.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Nom</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Scénario</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Tours</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Statut</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-6 py-3 text-slate-600">{(s.scenarios as { name: string } | null)?.name ?? '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{s.current_turn}/{s.total_turns}</td>
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
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <p className="text-slate-400 mb-4">Aucune session créée</p>
              <Link href="/formateur/sessions/new">
                <Button>Créer ma première session</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}