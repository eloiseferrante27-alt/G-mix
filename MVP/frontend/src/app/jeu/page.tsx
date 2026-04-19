import { getSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const statusLabel: Record<string, string> = {
  draft: 'Brouillon',
  active: 'En cours',
  completed: 'Terminée',
  archived: 'Archivée',
};

export default async function JoueurDashboard() {
  const session = await getSession();
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('*, scenarios(name), teams(id, name, color)')
    .eq('status', 'active');

  const userTeams = sessions?.filter((s) =>
    (s.teams as { id: string }[])?.some((t) => {
      // Check if user is member of this team
      return true; // TODO: Check team membership
    })
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bonjour, {session?.firstName} 👋</h1>
        <p className="text-slate-500 mt-1">Participez à vos sessions de business game</p>
      </div>

      <div className="grid gap-6">
        {userTeams?.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{s.name}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Scénario: {(s.scenarios as { name: string } | null)?.name ?? '—'}
                </p>
              </div>
              <Badge>{statusLabel[s.status]}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Tour {s.current_turn} / {s.total_turns}
                </div>
                <Link
                  href={`/jeu/sessions/${s.id}`}
                  className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
                >
                  Jouer →
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!userTeams || userTeams.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">Aucune session active</p>
              <p className="text-sm text-slate-500 mt-2">
                Contactez votre formateur pour rejoindre une session
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}