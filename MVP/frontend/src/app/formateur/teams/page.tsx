import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default async function TeamsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('id, name, teams(id, name, color, members:team_members(user_id))')
    .eq('formateur_id', session.userId);

  type Team = { id: string; name: string; color: string; members: Array<unknown>; sessionName: string; sessionId: string };

  const allTeams: Team[] = sessions?.flatMap((s) => {
    const teams = (s.teams as Array<{ id: string; name: string; color: string; members: Array<unknown> }>) ?? [];
    return teams.map((t) => ({ ...t, sessionName: s.name, sessionId: s.id }));
  }) ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Équipes</h1>
        <p className="text-slate-500 mt-1">Consultez toutes les équipes de vos sessions</p>
      </div>

      {allTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTeams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: team.color || '#8B5CF6' }}
                  />
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Session :</span>
                    <Link
                      href={`/formateur/sessions/${team.sessionId}`}
                      className="font-medium text-purple-700 hover:underline"
                    >
                      {team.sessionName}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Membres :</span>
                    <Badge variant="info">{team.members?.length ?? 0} joueur(s)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-400">Aucune équipe trouvée</p>
            <p className="text-sm text-slate-500 mt-2">
              Créez une session et ajoutez des équipes pour commencer
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
