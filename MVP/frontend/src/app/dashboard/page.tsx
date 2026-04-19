import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const statusBadge = (s: string) => {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
    draft: 'default', active: 'success', completed: 'info', archived: 'default'
  };
  return map[s] ?? 'default';
};

const statusLabel: Record<string, string> = {
  draft: 'Brouillon', active: 'En cours', completed: 'Terminée', archived: 'Archivée'
};

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();
  
  // Récupérer les sessions où le joueur est membre d'une équipe
  const { data: gameSessions } = await supabase
    .from('game_sessions')
    .select('*, scenarios(name)')
    .eq('organization_id', session.organizationId);

  // Filtrer les sessions où le joueur participe
  const playerSessions = gameSessions?.filter(sessionData => {
    const teams = sessionData.teams as any[] || [];
    return teams.some(team => 
      team.members?.some((member: any) => member.id === session.userId)
    );
  }) || [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bonjour, {session.firstName} 👋</h1>
        <p className="text-slate-500 mt-1">Voici vos parties en cours</p>
      </div>

      {playerSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playerSessions.map((sessionData) => {
            const teams = sessionData.teams as any[] || [];
            const playerTeam = teams.find(team => 
              team.members?.some((member: any) => member.id === session.userId)
            );
            const scenario = sessionData.scenarios as { name: string } | null;

            return (
              <Card key={sessionData.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{sessionData.name}</CardTitle>
                    <Badge variant={statusBadge(sessionData.status)}>
                      {statusLabel[sessionData.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {scenario?.name || 'Scénario non défini'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: playerTeam?.color || '#8B5CF6' }}
                    />
                    <span className="font-medium">Équipe: {playerTeam?.name}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tour {sessionData.current_turn}/{sessionData.total_turns}</span>
                    <span>{teams.length} équipes</span>
                  </div>

                  {sessionData.status === 'active' && (
                    <Link href={`/jeu/${sessionData.id}`}>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        ▶️ Rejoindre la partie
                      </Button>
                    </Link>
                  )}

                  {sessionData.status === 'completed' && (
                    <div className="text-center text-green-600 font-medium">
                      Partie terminée ! 🎉
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune partie en cours</h2>
            <p className="text-slate-500 mb-6">
              Votre formateur doit vous inviter à une session de business game
            </p>
            <Link href="/">
              <Button variant="outline">Retour à l'accueil</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}