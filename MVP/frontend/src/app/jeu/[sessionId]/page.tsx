import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function GamePage({ params }: { params: { sessionId: string } }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();

  const { data: gameSession } = await supabase
    .from('game_sessions')
    .select('*, scenarios(name, config), teams(id, name, color, members:team_members(user_id))')
    .eq('id', params.sessionId)
    .single();

  if (!gameSession) {
    redirect('/jeu');
  }

  const teams: Array<{ id: string; name: string; color: string; members: Array<{ user_id: string }> }> =
    (gameSession.teams as unknown as Array<{ id: string; name: string; color: string; members: Array<{ user_id: string }> }>) ?? [];

  const playerTeam = teams.find((team) =>
    team.members?.some((m) => m.user_id === session.userId)
  );

  if (!playerTeam) {
    redirect('/jeu');
  }

  const scenario = gameSession.scenarios as { name: string; config: Record<string, unknown> } | null;
  const config = (scenario?.config ?? {}) as { parameters?: Array<{ id: string; label: string; unit?: string; min?: number; max?: number; default?: number; description?: string }> };
  const currentTurn = gameSession.current_turn ?? 0;

  async function handleSubmitDecision(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const decisions = config.parameters?.map((param) => ({
      parameter_id: param.id,
      value: formData.get(param.id) as string,
    })) ?? [];

    await supabase.from('decisions').upsert({
      session_id: params.sessionId,
      team_id: playerTeam!.id,
      user_id: session!.userId,
      turn_number: currentTurn,
      data: Object.fromEntries(decisions.map((d) => [d.parameter_id, d.value])),
      submitted_at: new Date().toISOString(),
    });

    redirect(`/jeu/${params.sessionId}`);
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
            <h1 className="text-2xl font-bold text-slate-900">{gameSession.name}</h1>
            <p className="text-slate-500 mt-1">Équipe: {playerTeam.name}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={statusBadge(gameSession.status)}>
              {statusLabel[gameSession.status]}
            </Badge>
            <span className="text-sm text-slate-500">
              Tour {currentTurn}/{gameSession.total_turns}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Informations du tour</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold mb-2">Contexte du tour {currentTurn}</h3>
                <p className="text-sm text-slate-600">
                  {scenario?.name ?? 'Scénario en cours'} — Gestion de chaîne logistique
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Votre équipe :</h4>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: playerTeam.color || '#8B5CF6' }}
                  />
                  <span className="font-medium">{playerTeam.name}</span>
                </div>
              </div>
              {gameSession.status === 'active' && (
                <div className="text-sm text-green-600">✅ Partie en cours — à vous de jouer !</div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Prendre vos décisions</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleSubmitDecision} className="space-y-4">
                {config.parameters?.map((param) => (
                  <div key={param.id} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {param.label}
                      {param.unit && <span className="text-slate-500 text-xs ml-2">({param.unit})</span>}
                    </label>
                    <input
                      type="number"
                      name={param.id}
                      min={param.min}
                      max={param.max}
                      defaultValue={param.default ?? param.min}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    {param.description && (
                      <p className="text-xs text-slate-500">{param.description}</p>
                    )}
                  </div>
                ))}
                <Button type="submit" disabled={gameSession.status !== 'active'}>
                  📤 Soumettre les décisions
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Vos KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Votre profit', value: '€0', bg: 'bg-purple-50', text: 'text-purple-600' },
                { label: 'Niveau de service', value: '0%', bg: 'bg-green-50', text: 'text-green-600' },
                { label: 'Votre stock', value: '0', bg: 'bg-blue-50', text: 'text-blue-600' },
                { label: 'Votre trésorerie', value: '€0', bg: 'bg-orange-50', text: 'text-orange-600' },
              ].map((kpi) => (
                <div key={kpi.label} className={`p-4 ${kpi.bg} rounded-lg`}>
                  <div className={`text-2xl font-bold ${kpi.text.replace('600', '900')}`}>{kpi.value}</div>
                  <div className={`text-sm ${kpi.text}`}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
