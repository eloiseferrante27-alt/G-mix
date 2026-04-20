import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type ScenarioConfig = {
  parameters?: Array<{ id: string; label: string; unit?: string; min?: number; max?: number; default?: number; description?: string }>;
  kpis?: Array<{ id: string; label: string; unit: string }>;
  events?: Array<{ turn: number; title: string; description?: string }>;
  context?: string;
  rounds?: Array<{ turn: number; context?: string; description?: string }>;
};

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { sessionId } = await params;
  const { tab = 'contexte' } = await searchParams;

  const supabase = await createClient();

  const { data: gameSession } = await supabase
    .from('game_sessions')
    .select('*, scenarios(name, description, config), teams(id, name, color, members:team_members(user_id, profiles(first_name, last_name)))')
    .eq('id', sessionId)
    .single();

  if (!gameSession) redirect('/jeu');

  const teams = (gameSession.teams as Array<{
    id: string; name: string; color: string;
    members: Array<{ user_id: string; profiles: { first_name: string; last_name: string } | null }>;
  }>) ?? [];

  const playerTeam = teams.find((team) =>
    team.members?.some((m) => m.user_id === session.userId)
  );

  if (!playerTeam && gameSession.status !== 'draft') redirect('/jeu');

  const scenario = gameSession.scenarios as { name: string; description: string; config: ScenarioConfig } | null;
  const config = (scenario?.config ?? {}) as ScenarioConfig;
  const currentTurn = gameSession.current_turn ?? 0;

  // Find current turn record and check if decision already submitted
  let turnId: string | null = null;
  let alreadySubmitted = false;
  let submittedDecision: Record<string, unknown> | null = null;

  if (currentTurn > 0 && playerTeam) {
    const { data: turnRow } = await supabase
      .from('turns')
      .select('id')
      .eq('session_id', sessionId)
      .eq('turn_number', currentTurn)
      .maybeSingle();

    turnId = turnRow?.id ?? null;

    if (turnId) {
      const { data: existingDecision } = await supabase
        .from('decisions')
        .select('data')
        .eq('turn_id', turnId)
        .eq('team_id', playerTeam.id)
        .maybeSingle();

      if (existingDecision) {
        alreadySubmitted = true;
        submittedDecision = existingDecision.data as Record<string, unknown>;
      }
    }
  }

  // Fetch decision history for this team
  let decisionHistory: Array<{ turn_number: number; data: Record<string, unknown>; submitted_at: string }> = [];
  if (playerTeam) {
    const { data: turns } = await supabase
      .from('turns')
      .select('id, turn_number')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true });

    if (turns?.length) {
      const { data: decisions } = await supabase
        .from('decisions')
        .select('turn_id, data, submitted_at')
        .eq('team_id', playerTeam.id)
        .in('turn_id', turns.map((t) => t.id));

      decisionHistory = (decisions ?? []).map((d) => ({
        turn_number: turns.find((t) => t.id === d.turn_id)?.turn_number ?? 0,
        data: d.data as Record<string, unknown>,
        submitted_at: d.submitted_at,
      })).sort((a, b) => a.turn_number - b.turn_number);
    }
  }

  // Context for current turn
  const currentRound = config.rounds?.find((r) => r.turn === currentTurn);
  const currentEvents = (config.events ?? []).filter((e) => e.turn === currentTurn);

  // ── Server Action ────────────────────────────────────────────────────────────

  async function handleSubmitDecision(formData: FormData) {
    'use server';
    const sess = await getSession();
    if (!sess) redirect('/login');

    const supabase = await createClient();

    // Re-fetch session state
    const { data: gs } = await supabase
      .from('game_sessions')
      .select('current_turn, status, teams(id, name, members:team_members(user_id))')
      .eq('id', sessionId)
      .single();

    if (!gs || gs.status !== 'active') redirect(`/jeu/${sessionId}`);

    const gTeams = gs.teams as Array<{ id: string; members: Array<{ user_id: string }> }>;
    const team = gTeams?.find((t) => t.members?.some((m) => m.user_id === sess.userId));
    if (!team) redirect(`/jeu/${sessionId}`);

    // Find turn
    const { data: turn } = await supabase
      .from('turns')
      .select('id')
      .eq('session_id', sessionId)
      .eq('turn_number', gs.current_turn)
      .maybeSingle();

    if (!turn) redirect(`/jeu/${sessionId}`);

    // Build decision data from form
    const decisionData: Record<string, unknown> = {};
    for (const [key, val] of formData.entries()) {
      if (key !== 'session_id') decisionData[key] = val;
    }

    await supabase.from('decisions').upsert(
      {
        turn_id: turn.id,
        team_id: team.id,
        user_id: sess.userId,
        data: decisionData,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'turn_id,team_id' }
    );

    redirect(`/jeu/${sessionId}?tab=decision`);
  }

  // ── Status helpers ───────────────────────────────────────────────────────────

  const statusLabel: Record<string, string> = {
    draft: 'Brouillon', active: 'En cours', paused: 'En pause', completed: 'Terminée', archived: 'Archivée',
  };

  const tabs = [
    { id: 'contexte', label: 'Contexte' },
    { id: 'decision', label: alreadySubmitted ? 'Décision ✓' : 'Décision' },
    { id: 'historique', label: `Historique (${decisionHistory.length})` },
  ];

  // ── Pause screen ─────────────────────────────────────────────────────────────
  if (gameSession.status === 'paused') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">⏸</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Session en pause</h1>
            <p className="text-slate-500 mb-6">
              Le formateur a mis la session en pause. Attendez la reprise.
            </p>
            {config.kpis && config.kpis.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {config.kpis.slice(0, 4).map((kpi) => (
                  <div key={kpi.id} className="bg-slate-100 p-3 rounded-lg text-sm">
                    <p className="text-slate-500 text-xs">{kpi.label}</p>
                    <p className="font-bold text-slate-900">—</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Completed screen ─────────────────────────────────────────────────────────
  if (gameSession.status === 'completed') {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🏆</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Session terminée !</h1>
            <p className="text-slate-500">{scenario?.name} — {gameSession.total_turns} tours joués</p>
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle>Résumé de votre équipe</CardTitle></CardHeader>
            <CardContent>
              {playerTeam && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: playerTeam.color ?? '#8B5CF6' }} />
                  <div>
                    <p className="font-medium">{playerTeam.name}</p>
                    <p className="text-sm text-slate-500">{playerTeam.members?.length ?? 0} membre(s)</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-slate-600">
                {decisionHistory.length} décision(s) soumises sur {gameSession.total_turns} tours.
              </p>
            </CardContent>
          </Card>

          {decisionHistory.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Historique de vos décisions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {decisionHistory.map((d) => (
                  <div key={d.turn_number} className="border-l-2 border-purple-200 pl-4">
                    <p className="text-sm font-medium text-slate-900 mb-1">Tour {d.turn_number}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(d.data).map(([key, val]) => {
                        const param = config.parameters?.find((p) => p.id === key);
                        return (
                          <div key={key} className="text-xs text-slate-600">
                            <span className="text-slate-400">{param?.label ?? key} :</span>{' '}
                            <span className="font-medium">{String(val)} {param?.unit ?? ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="mt-6 text-center">
            <Link href="/jeu" className="text-purple-700 hover:underline text-sm">
              ← Retour à mes sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Draft screen (not started) ────────────────────────────────────────────────
  if (gameSession.status === 'draft') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">{gameSession.name}</h1>
            <p className="text-slate-500 mb-2">En attente du formateur...</p>
            <div className="flex justify-center gap-2 mt-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {playerTeam && (
              <p className="text-sm text-slate-400 mt-4">Équipe : {playerTeam.name}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Active game interface ─────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/jeu" className="text-sm text-purple-700 hover:underline mb-1 block">
              ← Mes sessions
            </Link>
            <h1 className="text-xl font-bold text-slate-900">{gameSession.name}</h1>
            <p className="text-sm text-slate-500">
              Équipe : {playerTeam?.name ?? '—'} · Scénario : {scenario?.name ?? '—'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="success">{statusLabel[gameSession.status]}</Badge>
            <span className="text-sm font-semibold text-slate-700">
              Tour {currentTurn} / {gameSession.total_turns}
            </span>
          </div>
        </div>

        {/* KPI Bar (always visible) */}
        {config.kpis && config.kpis.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            {config.kpis.slice(0, 4).map((kpi, i) => {
              const colors = ['bg-purple-50 text-purple-700', 'bg-green-50 text-green-700', 'bg-blue-50 text-blue-700', 'bg-orange-50 text-orange-700'];
              const c = colors[i % colors.length];
              return (
                <div key={kpi.id} className={`p-3 rounded-lg ${c.split(' ')[0]}`}>
                  <p className={`text-xs ${c.split(' ')[1]} mb-0.5`}>{kpi.label}</p>
                  <p className={`text-lg font-bold ${c.split(' ')[1]}`}>—</p>
                  <p className="text-xs text-slate-400">{kpi.unit}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/jeu/${sessionId}?tab=${t.id}`}
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

        {/* Tab: Contexte */}
        {tab === 'contexte' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contexte — Tour {currentTurn}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentRound?.context || currentRound?.description ? (
                  <p className="text-slate-700 leading-relaxed">
                    {currentRound.context ?? currentRound.description}
                  </p>
                ) : (
                  <p className="text-slate-600 leading-relaxed">
                    {scenario?.description || `Tour ${currentTurn} sur ${gameSession.total_turns}. Analysez la situation et soumettez vos décisions stratégiques pour ce round.`}
                  </p>
                )}
              </CardContent>
            </Card>

            {currentEvents.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-amber-800">Événements de marché</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentEvents.map((ev, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-amber-600 mt-0.5">⚡</span>
                      <div>
                        <p className="font-medium text-amber-900">{ev.title}</p>
                        {ev.description && <p className="text-sm text-amber-700 mt-0.5">{ev.description}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Link
                href={`/jeu/${sessionId}?tab=decision`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors font-medium"
              >
                Prendre mes décisions →
              </Link>
            </div>
          </div>
        )}

        {/* Tab: Décision */}
        {tab === 'decision' && (
          <div>
            {alreadySubmitted ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Décision soumise — Tour {currentTurn}</CardTitle>
                    <Badge variant="success">Soumise</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-600 mb-4">Votre décision a été enregistrée pour ce tour. Attendez que le formateur passe au tour suivant.</p>
                  {submittedDecision && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(submittedDecision).map(([key, val]) => {
                        const param = config.parameters?.find((p) => p.id === key);
                        return (
                          <div key={key} className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500">{param?.label ?? key}</p>
                            <p className="font-semibold text-slate-900">{String(val)} {param?.unit ?? ''}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Vos décisions — Tour {currentTurn}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={handleSubmitDecision} className="space-y-4">
                    {config.parameters?.map((param) => (
                      <div key={param.id}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {param.label}
                          {param.unit && <span className="text-slate-400 font-normal text-xs ml-1">({param.unit})</span>}
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
                          <p className="text-xs text-slate-400 mt-1">{param.description}</p>
                        )}
                        {param.min !== undefined && param.max !== undefined && (
                          <p className="text-xs text-slate-400 mt-0.5">Min : {param.min} — Max : {param.max}</p>
                        )}
                      </div>
                    ))}
                    {!config.parameters?.length && (
                      <p className="text-slate-400 text-sm py-4">
                        Ce scénario n&apos;a pas encore de paramètres configurés.
                      </p>
                    )}
                    {config.parameters?.length ? (
                      <Button type="submit" className="w-full">
                        Soumettre ma décision pour ce tour
                      </Button>
                    ) : null}
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Historique */}
        {tab === 'historique' && (
          <div className="space-y-4">
            {decisionHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                Aucune décision soumise pour le moment.
              </div>
            ) : (
              decisionHistory.map((d) => (
                <Card key={d.turn_number}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Tour {d.turn_number}</CardTitle>
                      <span className="text-xs text-slate-400">
                        {new Date(d.submitted_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(d.data).map(([key, val]) => {
                        const param = config.parameters?.find((p) => p.id === key);
                        return (
                          <div key={key} className="bg-slate-50 p-2 rounded text-sm">
                            <p className="text-xs text-slate-400">{param?.label ?? key}</p>
                            <p className="font-medium">{String(val)} {param?.unit ?? ''}</p>
                          </div>
                        );
                      })}
                    </div>
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
