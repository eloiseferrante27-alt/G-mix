import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type ScenarioConfig = {
  parameters?: Array<{ id: string; label: string; unit?: string }>;
  kpis?: Array<{ id: string; label: string; unit: string }>;
  events?: Array<{ turn: number; title: string; description?: string }>;
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id: sessionId } = await params;
  const { tab = 'controle' } = await searchParams;

  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const { data: gameSession } = await supabase
    .from('game_sessions')
    .select('*, scenarios(name, config), teams(id, name, color, members:team_members(user_id, profiles(first_name, last_name, email)))')
    .eq('id', sessionId)
    .single();

  if (!gameSession) redirect('/formateur/sessions');

  const teams = (gameSession.teams as Array<{
    id: string; name: string; color: string;
    members: Array<{ user_id: string; profiles: { first_name: string; last_name: string; email: string } | null }>;
  }>) ?? [];

  const scenario = gameSession.scenarios as { name: string; config: ScenarioConfig } | null;
  const config = scenario?.config ?? {};
  const inviteCode = gameSession.invite_code as string | null;

  // Fetch decisions for current turn
  let currentTurnDecisions: Array<{
    team_id: string; data: Record<string, unknown>;
    team_name: string; submitted_at: string;
  }> = [];

  if (gameSession.current_turn > 0) {
    const { data: turnRow } = await serviceSupabase
      .from('turns')
      .select('id')
      .eq('session_id', sessionId)
      .eq('turn_number', gameSession.current_turn)
      .maybeSingle();

    if (turnRow) {
      const { data: decisions } = await serviceSupabase
        .from('decisions')
        .select('team_id, data, submitted_at')
        .eq('turn_id', turnRow.id);

      currentTurnDecisions = (decisions ?? []).map((d) => ({
        team_id: d.team_id,
        data: d.data as Record<string, unknown>,
        submitted_at: d.submitted_at,
        team_name: teams.find((t) => t.id === d.team_id)?.name ?? '—',
      }));
    }
  }

  // Fetch invite code if missing
  let shareCode = inviteCode;
  if (!shareCode) {
    const { data: inv } = await serviceSupabase
      .from('organization_invites')
      .select('token')
      .eq('organization_id', gameSession.organization_id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    shareCode = inv?.token ?? null;
  }

  // ── Server Actions ──────────────────────────────────────────────────────────

  async function handleStartGame() {
    'use server';
    const supabase = await createClient();
    await supabase
      .from('game_sessions')
      .update({ status: 'active', current_turn: 1, started_at: new Date().toISOString() })
      .eq('id', sessionId);
    // Create turn 1
    await supabase.from('turns').upsert(
      { session_id: sessionId, turn_number: 1, status: 'open', started_at: new Date().toISOString() },
      { onConflict: 'session_id,turn_number' }
    );
    redirect(`/formateur/sessions/${sessionId}`);
  }

  async function handleNextTurn() {
    'use server';
    const supabase = await createClient();
    const { data: gs } = await supabase
      .from('game_sessions')
      .select('current_turn, total_turns')
      .eq('id', sessionId)
      .single();
    if (!gs || gs.current_turn >= gs.total_turns) return;
    const nextTurn = gs.current_turn + 1;
    // Close current turn
    await supabase.from('turns')
      .update({ status: 'closed', ended_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('turn_number', gs.current_turn);
    // Open next turn
    await supabase.from('turns').upsert(
      { session_id: sessionId, turn_number: nextTurn, status: 'open', started_at: new Date().toISOString() },
      { onConflict: 'session_id,turn_number' }
    );
    await supabase.from('game_sessions')
      .update({ current_turn: nextTurn })
      .eq('id', sessionId);
    redirect(`/formateur/sessions/${sessionId}`);
  }

  async function handlePauseGame() {
    'use server';
    const supabase = await createClient();
    await supabase.from('game_sessions').update({ status: 'paused' }).eq('id', sessionId);
    redirect(`/formateur/sessions/${sessionId}`);
  }

  async function handleResumeGame() {
    'use server';
    const supabase = await createClient();
    await supabase.from('game_sessions').update({ status: 'active' }).eq('id', sessionId);
    redirect(`/formateur/sessions/${sessionId}`);
  }

  async function handleEndGame() {
    'use server';
    const supabase = await createClient();
    const { data: gs } = await supabase
      .from('game_sessions').select('current_turn').eq('id', sessionId).single();
    if (gs?.current_turn) {
      await supabase.from('turns')
        .update({ status: 'closed', ended_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('turn_number', gs.current_turn);
    }
    await supabase.from('game_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', sessionId);
    redirect(`/formateur/sessions/${sessionId}`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const statusBadge = (s: string): 'default' | 'success' | 'warning' | 'info' => {
    const map: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      draft: 'default', active: 'success', paused: 'warning', completed: 'info', archived: 'default',
    };
    return map[s] ?? 'default';
  };

  const statusLabel: Record<string, string> = {
    draft: 'Brouillon', active: 'En cours', paused: 'En pause', completed: 'Terminée', archived: 'Archivée',
  };

  const tabs = [
    { id: 'controle', label: 'Contrôle' },
    { id: 'decisions', label: `Décisions (${currentTurnDecisions.length}/${teams.length})` },
    { id: 'equipes', label: `Équipes (${teams.length})` },
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
            {gameSession.status !== 'draft' && (
              <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                Tour {gameSession.current_turn} / {gameSession.total_turns}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/formateur/sessions/${sessionId}?tab=${t.id}`}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.id
                  ? 'bg-white border border-b-white border-slate-200 text-purple-700 -mb-px'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Tab: Contrôle */}
        {tab === 'controle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Scénario :</span>
                  <span className="font-medium">{scenario?.name ?? 'Non défini'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Équipes :</span>
                  <span className="font-medium">{teams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Joueurs :</span>
                  <span className="font-medium">
                    {teams.reduce((acc, t) => acc + (t.members?.length ?? 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Créée le :</span>
                  <span className="font-medium">
                    {new Date(gameSession.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {shareCode && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Code d&apos;invitation joueurs :</p>
                    <code className="font-mono text-sm font-medium text-slate-800">{shareCode}</code>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contrôle de la session</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {gameSession.status === 'draft' && (
                  <form action={handleStartGame}>
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                      ▶ Démarrer la partie
                    </Button>
                  </form>
                )}
                {(gameSession.status === 'active' || gameSession.status === 'paused') && (
                  <>
                    {gameSession.status === 'active' && (
                      <>
                        <form action={handleNextTurn}>
                          <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={gameSession.current_turn >= gameSession.total_turns}
                          >
                            ➡ Tour suivant ({gameSession.current_turn + 1} / {gameSession.total_turns})
                          </Button>
                        </form>
                        <form action={handlePauseGame}>
                          <Button type="submit" variant="outline" className="w-full">
                            ⏸ Mettre en pause
                          </Button>
                        </form>
                      </>
                    )}
                    {gameSession.status === 'paused' && (
                      <form action={handleResumeGame}>
                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                          ▶ Reprendre la partie
                        </Button>
                      </form>
                    )}
                    <form action={handleEndGame}>
                      <Button type="submit" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                        ⏹ Terminer la session
                      </Button>
                    </form>
                  </>
                )}
                {gameSession.status === 'completed' && (
                  <div className="text-center py-4">
                    <p className="text-green-600 font-medium text-lg mb-2">Session terminée</p>
                    <p className="text-sm text-slate-500">
                      {teams.length} équipe(s) — {gameSession.total_turns} tours joués
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KPI overview */}
            {config.kpis && config.kpis.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>KPIs du scénario</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {config.kpis.slice(0, 8).map((kpi, i) => {
                      const colors = [
                        'bg-purple-50 text-purple-700',
                        'bg-green-50 text-green-700',
                        'bg-blue-50 text-blue-700',
                        'bg-orange-50 text-orange-700',
                        'bg-red-50 text-red-700',
                        'bg-teal-50 text-teal-700',
                        'bg-pink-50 text-pink-700',
                        'bg-indigo-50 text-indigo-700',
                      ];
                      const c = colors[i % colors.length];
                      return (
                        <div key={kpi.id} className={`p-3 rounded-lg ${c.split(' ')[0]}`}>
                          <p className={`text-xs font-medium ${c.split(' ')[1]} mb-1`}>{kpi.label}</p>
                          <p className={`text-sm font-bold ${c.split(' ')[1]}`}>—</p>
                          <p className="text-xs text-slate-400">{kpi.unit}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Events for current turn */}
            {config.events && gameSession.status === 'active' && (
              (() => {
                const currentEvents = config.events.filter(
                  (e) => e.turn === gameSession.current_turn
                );
                return currentEvents.length > 0 ? (
                  <Card className="lg:col-span-2 border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-amber-800">Événements — Tour {gameSession.current_turn}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {currentEvents.map((ev, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-amber-600 mt-0.5">⚡</span>
                          <div>
                            <p className="font-medium text-amber-900 text-sm">{ev.title}</p>
                            {ev.description && (
                              <p className="text-sm text-amber-700">{ev.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null;
              })()
            )}
          </div>
        )}

        {/* Tab: Décisions */}
        {tab === 'decisions' && (
          <div className="space-y-4">
            {gameSession.status === 'draft' && (
              <div className="py-12 text-center text-slate-400">
                La session n&apos;est pas encore démarrée.
              </div>
            )}
            {gameSession.status !== 'draft' && (
              <>
                <p className="text-sm text-slate-500">
                  Décisions soumises pour le tour {gameSession.current_turn} — {currentTurnDecisions.length} / {teams.length} équipes
                </p>
                <div className="grid gap-4">
                  {teams.map((team) => {
                    const decision = currentTurnDecisions.find((d) => d.team_id === team.id);
                    return (
                      <Card key={team.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: team.color ?? '#8B5CF6' }}
                              />
                              <CardTitle className="text-base">{team.name}</CardTitle>
                            </div>
                            {decision ? (
                              <Badge variant="success">Soumise</Badge>
                            ) : (
                              <Badge variant="default">En attente</Badge>
                            )}
                          </div>
                        </CardHeader>
                        {decision && (
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              {Object.entries(decision.data).map(([key, val]) => {
                                const param = config.parameters?.find((p) => p.id === key);
                                return (
                                  <div key={key} className="bg-slate-50 p-2 rounded">
                                    <p className="text-xs text-slate-500">{param?.label ?? key}</p>
                                    <p className="font-medium text-slate-900">
                                      {String(val)} {param?.unit ?? ''}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                              Soumise le {new Date(decision.submitted_at).toLocaleString('fr-FR')}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                  {teams.length === 0 && (
                    <div className="py-12 text-center text-slate-400">Aucune équipe dans cette session.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Équipes */}
        {tab === 'equipes' && (
          <div className="space-y-4">
            {teams.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-lg mb-2">Aucune équipe pour le moment</p>
                <p className="text-sm">
                  Partagez le code d&apos;invitation pour que les joueurs rejoignent.
                </p>
              </div>
            ) : (
              teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color ?? '#8B5CF6' }}
                      />
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <span className="text-sm text-slate-500 ml-auto">
                        {team.members?.length ?? 0} membre(s)
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {team.members?.length > 0 ? (
                      <div className="space-y-1">
                        {team.members.map((m) => (
                          <div key={m.user_id} className="flex items-center gap-2 text-sm text-slate-600 py-1">
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs text-purple-700 font-medium">
                              {m.profiles?.first_name?.[0] ?? '?'}
                            </div>
                            <span>{m.profiles?.first_name} {m.profiles?.last_name}</span>
                            <span className="text-xs text-slate-400">{m.profiles?.email}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Aucun membre</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
