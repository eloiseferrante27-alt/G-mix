import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, turnNumber } = await request.json();

    const supabase = await createClient();
    
    // Récupérer la session de jeu
    const { data: gameSession } = await supabase
      .from('game_sessions')
      .select('*, scenarios(config)')
      .eq('id', sessionId)
      .single();

    if (!gameSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const teams = gameSession.teams as any[] || [];
    const config = gameSession.scenarios?.config || {};
    
    // Calculer les résultats pour chaque équipe
    const results = teams.map(team => {
      const teamDecisions = team.decisions?.[turnNumber] || [];
      const kpis = calculateKPIs(teamDecisions, config, turnNumber);
      
      return {
        team_id: team.id,
        turn: turnNumber,
        decisions: teamDecisions,
        kpis: kpis,
        timestamp: new Date().toISOString()
      };
    });

    // Mettre à jour la session avec les résultats
    const updatedResults = [
      ...(gameSession.results || []),
      ...results
    ];

    await supabase
      .from('game_sessions')
      .update({
        results: updatedResults
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Game computation error:', error);
    return NextResponse.json(
      { error: 'Failed to compute turn results' },
      { status: 500 }
    );
  }
}

function calculateKPIs(decisions: any[], config: any, turn: number): any {
  // Simulation de calcul de KPIs basée sur les décisions
  // En production, cela utiliserait des formules mathématiques complexes
  
  const production = decisions.find(d => d.parameter_id === 'production')?.value || 0;
  const price = decisions.find(d => d.parameter_id === 'prix_vente')?.value || 0;
  const safetyStock = decisions.find(d => d.parameter_id === 'stock_securite')?.value || 0;

  // Simulation de demande (aléatoire avec tendance)
  const baseDemand = 500 + (turn * 50);
  const demandVariation = Math.random() * 200 - 100;
  const demand = Math.max(0, baseDemand + demandVariation);

  // Calcul du profit
  const revenue = Math.min(production, demand) * price;
  const productionCost = production * 10; // Coût de production unitaire
  const storageCost = safetyStock * 2; // Coût de stockage unitaire
  const profit = revenue - productionCost - storageCost;

  // Calcul du niveau de service
  const serviceLevel = production >= demand ? 100 : (production / demand) * 100;

  // Calcul du stock moyen
  const avgStock = safetyStock + (production - demand) / 2;

  // Calcul de la trésorerie (simplifié)
  const cashFlow = profit;

  return {
    profit: Math.round(profit),
    service_level: Math.round(serviceLevel),
    stock_level: Math.round(avgStock),
    cash_flow: Math.round(cashFlow)
  };
}