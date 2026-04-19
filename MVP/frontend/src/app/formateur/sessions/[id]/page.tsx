import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: gameSession } = await supabase
    .from('game_sessions')
    .select('*, scenarios(name), teams(id, name, color, members:team_members(user_id))')
    .eq('id', params.id)
    .eq('formateur_id', session.userId)
    .single();

  if (!gameSession) {
    redirect('/formateur/sessions');
  }

  const teams = (gameSession.teams as Array<{ id: string; name: string; color: string; members: Array<unknown> }>) ?? [];
  const scenario = gameSession.scenarios as { name: string } | null;

  async function handleStartGame() {
    'use server';
    const supabase = await createClient();
    await supabase
      .from('game_sessions')
      .update({ status: 'active', current_turn: 1, started_at: new Date().toISOString() })
      .eq('id', params.id);
    redirect(`/formateur/sessions/${params.id}`);
  }

  async function handleNextTurn() {
    'use server';
    const supabase = await createClient();
    await supabase
      .from('game_sessions')
      .update({ current_turn: (gameSession.current_turn ?? 0) + 1 })
      .eq('id', params.id);
    redirect(`/formateur/sessions/${params.id}`);
  }

  async function handleEndGame() {
    'use server';
    const supabase = await createClient();
    await supabase
      .from('game_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', params.id);
    redirect(`/formateur/sessions/${params.id}`);
  }

  const statusBadge = (s: string): 'default' | 'success' | 'warning' | 'info' => {
    const map: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      draft: 'default', active: 'success', completed: 'info', archived: 'default',
    };
    return map[s] ?? 'default';
  };

  const statusLabel: Record<string, string> = {
    draft: 'Brouillon', active: 'En cours', completed: 'Terminée', archived: 'Archivée',
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/formateur/sessions" className="text-sm text-purple-700 hover:underline mb-2 block">
              ← Retour aux sessions
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{gameSession.name}</h1>
            {gameSession.description && (
              <p className="text-slate-500 mt-1">{gameSession.description}</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={statusBadge(gameSession.status)}>
              {statusLabel[gameSession.status]}
            </Badge>
            <span className="text-sm text-slate-500">
              Tour {gameSession.current_turn}/{gameSession.total_turns}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Scénario :</span>
                <span className="font-medium">{scenario?.name ?? 'Non défini'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Équipes :</span>
                <span className="font-medium">{teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Créée le :</span>
                <span className="font-medium">
                  {new Date(gameSession.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contrôle du jeu</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {gameSession.status === 'draft' && (
                <form action={handleStartGame}>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    ▶️ Démarrer la partie
                  </Button>
                </form>
              )}
              {gameSession.status === 'active' && (
                <>
                  <form action={handleNextTurn}>
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={gameSession.current_turn >= gameSession.total_turns}
                    >
                      ➡️ Tour suivant ({gameSession.current_turn + 1}/{gameSession.total_turns})
                    </Button>
                  </form>
                  <form action={handleEndGame}>
                    <Button type="submit" variant="outline" className="w-full">
                      ⏹️ Terminer la partie
                    </Button>
                  </form>
                </>
              )}
              {gameSession.status === 'completed' && (
                <div className="text-center text-green-600 font-medium py-4">
                  Partie terminée ! 🎉
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Équipes ({teams.length})</CardTitle></CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <div className="space-y-2">
                  {teams.map((team, index) => (
                    <div key={team.id ?? index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color ?? '#8B5CF6' }}
                        />
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {team.members?.length ?? 0} membres
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Aucune équipe pour le moment</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Tableau de bord — KPIs</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Profit total', value: '€0', bg: 'bg-purple-50', text: 'text-purple-600' },
                { label: 'Niveau de service', value: '0%', bg: 'bg-green-50', text: 'text-green-600' },
                { label: 'Stock moyen', value: '0', bg: 'bg-blue-50', text: 'text-blue-600' },
                { label: 'Trésorerie', value: '€0', bg: 'bg-orange-50', text: 'text-orange-600' },
              ].map((kpi) => (
                <div key={kpi.label} className={`p-4 ${kpi.bg} rounded-lg`}>
                  <div className={`text-2xl font-bold ${kpi.text.replace('600', '900')}`}>{kpi.value}</div>
                  <div className={`text-sm ${kpi.text}`}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4">
          <Button variant="outline">📊 Statistiques détaillées</Button>
          <Button variant="outline">📤 Exporter les résultats</Button>
        </div>
      </div>
    </div>
  );
}
