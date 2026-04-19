import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, base_scenario } = await request.json();

    // Pour le MVP, on simule la génération IA avec une réponse structurée
    // En production, cela appellerait réellement OpenAI/GPT-4
    const aiResponse = await generateScenarioWithAI(prompt);

    return NextResponse.json({
      success: true,
      config: aiResponse.config,
      description: aiResponse.description
    });
  } catch (error) {
    console.error('AI scenario generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenario with AI' },
      { status: 500 }
    );
  }
}

async function generateScenarioWithAI(prompt: string) {
  // Simulation de réponse IA structurée
  // En production, remplacer par appel réel à OpenAI API
  
  const baseConfig = {
    total_turns: 10,
    max_teams: 6,
    min_teams: 2,
    parameters: [
      {
        id: 'production',
        label: 'Production',
        type: 'number',
        min: 0,
        max: 1000,
        unit: 'unités',
        description: 'Quantité à produire ce tour'
      },
      {
        id: 'prix_vente',
        label: 'Prix de vente',
        type: 'number',
        min: 10,
        max: 100,
        unit: '€',
        description: 'Prix de vente unitaire'
      },
      {
        id: 'stock_securite',
        label: 'Stock de sécurité',
        type: 'number',
        min: 0,
        max: 500,
        unit: 'unités',
        description: 'Niveau de stock de sécurité à maintenir'
      }
    ],
    kpis: [
      {
        id: 'profit',
        label: 'Profit',
        unit: '€',
        formula: 'revenue - costs',
        weight: 0.4,
        description: 'Profitabilité de l\'entreprise'
      },
      {
        id: 'service_level',
        label: 'Niveau de service',
        unit: '%',
        formula: 'orders_fulfilled / total_orders * 100',
        weight: 0.3,
        description: 'Capacité à satisfaire la demande'
      },
      {
        id: 'stock_level',
        label: 'Niveau de stock',
        unit: 'unités',
        formula: 'current_stock',
        weight: 0.2,
        description: 'Niveau moyen de stock'
      },
      {
        id: 'cash_flow',
        label: 'Trésorerie',
        unit: '€',
        formula: 'initial_cash + revenue - costs',
        weight: 0.1,
        description: 'Liquidités disponibles'
      }
    ],
    events: [
      {
        id: 'demand_spike',
        label: 'Augmentation de la demande',
        turn: 3,
        probability: 0.3,
        impact: {
          demand_multiplier: 1.5,
          description: 'La demande augmente soudainement de 50%'
        }
      },
      {
        id: 'supply_disruption',
        label: 'Perturbation d\'approvisionnement',
        turn: 6,
        probability: 0.2,
        impact: {
          lead_time_multiplier: 2.0,
          description: 'Les délais d\'approvisionnement doublent'
        }
      }
    ]
  };

  return {
    config: baseConfig,
    description: `Scénario généré par IA basé sur votre prompt : "${prompt}". Ce business game simule la gestion d'une chaîne logistique avec des décisions de production, de pricing et de gestion des stocks sur ${baseConfig.total_turns} tours.`
  };
}