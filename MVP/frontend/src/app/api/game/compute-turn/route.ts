import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

type DecisionPayload = {
  parameter_id?: string;
  value?: number;
};

export async function POST(request: NextRequest) {
  try {
    const { sessionId, turnNumber } = await request.json();
    if (!sessionId || typeof turnNumber !== 'number') {
      return NextResponse.json({ error: 'Missing sessionId or turnNumber' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: gameSession } = await supabase
      .from('game_sessions')
      .select('id, scenarios(config)')
      .eq('id', sessionId)
      .single();

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: turn } = await supabase
      .from('turns')
      .select('id')
      .eq('session_id', sessionId)
      .eq('turn_number', turnNumber)
      .single();

    if (!turn) {
      return NextResponse.json({ error: 'Turn not found' }, { status: 404 });
    }

    const [{ data: teams }, { data: decisions }] = await Promise.all([
      supabase.from('teams').select('id, name').eq('session_id', sessionId),
      supabase.from('decisions').select('team_id, data').eq('turn_id', turn.id),
    ]);

    const decisionsByTeam = new Map<string, DecisionPayload[]>();
    for (const decision of decisions ?? []) {
      const raw = decision.data;
      const normalized = Array.isArray(raw)
        ? raw as DecisionPayload[]
        : Object.entries((raw ?? {}) as Record<string, number>).map(([parameter_id, value]) => ({
            parameter_id,
            value: Number(value),
          }));
      decisionsByTeam.set(decision.team_id, normalized);
    }

    const config = (gameSession.scenarios as { config?: Record<string, unknown> } | null)?.config ?? {};

    const results = (teams ?? []).map((team) => {
      const teamDecisions = decisionsByTeam.get(team.id) ?? [];
      const kpis = calculateKPIs(teamDecisions, config, turnNumber);

      return {
        turn_id: turn.id,
        team_id: team.id,
        kpis,
        score: kpis.profit,
      };
    });

    if (results.length > 0) {
      const { error } = await supabase
        .from('turn_results')
        .upsert(results, { onConflict: 'turn_id,team_id' });

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Game computation error:', error);
    return NextResponse.json(
      { error: 'Failed to compute turn results' },
      { status: 500 }
    );
  }
}

function calculateKPIs(decisions: DecisionPayload[], _config: Record<string, unknown>, turn: number) {
  const production = decisions.find((d) => d.parameter_id === 'production' || d.parameter_id === 'production_volume')?.value || 0;
  const price = decisions.find((d) => d.parameter_id === 'prix_vente' || d.parameter_id === 'selling_price')?.value || 0;
  const safetyStock = decisions.find((d) => d.parameter_id === 'stock_securite' || d.parameter_id === 'inventory_target')?.value || 0;

  const baseDemand = 500 + (turn * 50);
  const demandVariation = Math.random() * 200 - 100;
  const demand = Math.max(0, baseDemand + demandVariation);

  const revenue = Math.min(production, demand) * price;
  const productionCost = production * 10;
  const storageCost = safetyStock * 2;
  const profit = revenue - productionCost - storageCost;
  const serviceLevel = demand === 0 ? 100 : (production >= demand ? 100 : (production / demand) * 100);
  const avgStock = safetyStock + (production - demand) / 2;

  return {
    profit: Math.round(profit),
    service_level: Math.round(serviceLevel),
    stock_level: Math.round(avgStock),
    cash_flow: Math.round(profit),
  };
}
