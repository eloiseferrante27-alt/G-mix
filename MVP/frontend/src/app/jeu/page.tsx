import { getSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const statusLabel: Record<string, string> = {
  draft: 'En attente',
  active: 'En cours',
  paused: 'En pause',
  completed: 'Terminée',
  archived: 'Archivée',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  draft: 'default', active: 'success', paused: 'warning', completed: 'info', archived: 'default',
};

export default async function JoueurDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');

  const supabase = await createClient();

  // Fetch teams the player is member of
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select('team_id, teams(id, name, color, session_id)')
    .eq('user_id', session.userId);

  const sessionIds = (teamMemberships ?? [])
    .map((tm) => (tm.teams as { session_id: string } | null)?.session_id)
    .filter(Boolean) as string[];

  const { data: sessions } = sessionIds.length
    ? await supabase
        .from('game_sessions')
        .select('*, scenarios(name)')
        .in('id', sessionIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const activeSessions = (sessions ?? []).filter((s) => s.status !== 'archived');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Bonjour, {session.firstName}
        </h1>
        <p className="text-slate-500 mt-1">Vos sessions de business game</p>
      </div>

      {/* Rejoindre par code */}
      <Card className="mb-6 border-purple-200 bg-purple-50">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium text-purple-900">Rejoindre une session</p>
            <p className="text-sm text-purple-700">Utilisez un code d&apos;invitation pour rejoindre une organisation</p>
          </div>
          <Link
            href="/jeu/rejoindre"
            className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors whitespace-nowrap"
          >
            + Rejoindre
          </Link>
        </CardContent>
      </Card>

      {/* Sessions list */}
      <div className="space-y-4">
        {activeSessions.map((s) => {
          const team = (teamMemberships ?? []).find(
            (tm) => (tm.teams as { session_id: string } | null)?.session_id === s.id
          );
          const teamInfo = team?.teams as { name: string; color: string } | null;
          return (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{s.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {(s.scenarios as { name: string } | null)?.name ?? '—'}
                    </p>
                  </div>
                  <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {teamInfo && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: teamInfo.color ?? '#8B5CF6' }}
                        />
                        <span>Équipe {teamInfo.name}</span>
                      </div>
                    )}
                    <span>Tour {s.current_turn} / {s.total_turns}</span>
                  </div>
                  <Link
                    href={`/jeu/${s.id}`}
                    className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
                  >
                    {s.status === 'active' ? 'Jouer →' : s.status === 'completed' ? 'Voir résultats →' : 'Voir →'}
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {activeSessions.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-4xl mb-4">🎮</p>
              <p className="text-slate-500 font-medium mb-2">Aucune session pour le moment</p>
              <p className="text-sm text-slate-400">
                Utilisez le bouton &quot;Rejoindre&quot; pour entrer un code d&apos;invitation reçu de votre formateur.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
