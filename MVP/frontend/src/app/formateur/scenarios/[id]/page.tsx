import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import Anthropic from '@anthropic-ai/sdk';

type ScenarioConfig = {
  total_turns?: number;
  max_teams?: number;
  min_teams?: number;
  parameters?: Array<{ id: string; label: string; type: string; min?: number; max?: number; unit?: string; default?: number; description?: string }>;
  kpis?: Array<{ id: string; label: string; unit: string }>;
  events?: Array<{ turn: number; title: string; description?: string }>;
};

function extractJson(text: string): string | null {
  // Try markdown code block first (```json ... ``` or ``` ... ```)
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch?.[1]) return mdMatch[1].trim();

  // Try raw JSON object: find first { and match to its closing }
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export default async function ScenarioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const { success, error: pageError } = await searchParams;

  // Always use service client to bypass RLS for reads/writes in this page
  const supabase = createServiceClient();
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .single();

  if (!scenario) redirect('/formateur/scenarios');

  const scenarioId = scenario.id as string;

  // ── Server Action ────────────────────────────────────────────────────────────

  async function handleGenerateWithAI(formData: FormData) {
    'use server';
    const prompt = (formData.get('prompt') as string)?.trim();
    if (!prompt) {
      redirect(`/formateur/scenarios/${scenarioId}?error=Le+prompt+ne+peut+pas+être+vide`);
    }

    const sess = await getSession();
    if (!sess) redirect('/login');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      redirect(`/formateur/scenarios/${scenarioId}?error=Clé+Anthropic+manquante+dans+.env.local+(ANTHROPIC_API_KEY)`);
    }

    // ── Call AI — errors captured into variable, NOT in catch with redirect ──

    type ParsedScenario = { description?: string; config?: ScenarioConfig };
    let parsed: ParsedScenario | null = null;
    let aiError: string | null = null;

    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `Tu es un expert en business games pédagogiques.
Génère un scénario complet pour une simulation de gestion d'entreprise basée sur ce contexte: "${prompt}"

RÈGLE ABSOLUE: Réponds UNIQUEMENT avec du JSON valide. Zéro texte avant ou après. Pas de blocs markdown. Pas d'explication.

Structure JSON EXACTE à respecter:
{
  "description": "Description du scénario en 2-3 phrases, contexte pédagogique",
  "config": {
    "total_turns": 8,
    "max_teams": 6,
    "min_teams": 2,
    "parameters": [
      {
        "id": "identifiant_snake_case",
        "label": "Nom affiché au joueur",
        "type": "number",
        "min": 0,
        "max": 1000,
        "unit": "unité de mesure",
        "default": 100,
        "description": "Explication courte de ce paramètre"
      }
    ],
    "kpis": [
      {
        "id": "identifiant_snake_case",
        "label": "Nom du KPI",
        "unit": "€ ou % ou unités"
      }
    ],
    "events": [
      {
        "turn": 3,
        "title": "Titre court de l'événement",
        "description": "Description de l'impact sur le marché ou l'entreprise"
      }
    ]
  }
}

Contraintes:
- 3 à 5 paramètres de décision cohérents avec le secteur
- 3 à 4 KPIs mesurables
- 2 à 3 événements répartis sur les tours
- total_turns entre 6 et 12
- max_teams entre 4 et 8`,
          },
        ],
      });

      const rawText = (message.content[0] as { type: string; text: string }).text;
      const jsonStr = extractJson(rawText);

      if (!jsonStr) {
        aiError = `L'IA n'a pas retourné de JSON. Réponse reçue: "${rawText.slice(0, 200)}..."`;
      } else {
        try {
          parsed = JSON.parse(jsonStr) as ParsedScenario;
        } catch (parseErr) {
          aiError = `JSON invalide reçu: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
        }

        if (parsed && !parsed.config) {
          aiError = 'JSON reçu mais sans champ "config"';
          parsed = null;
        }

        if (parsed?.config && (!parsed.config.parameters?.length || !parsed.config.kpis?.length)) {
          aiError = 'Scénario incomplet: paramètres ou KPIs manquants';
          parsed = null;
        }
      }
    } catch (err: unknown) {
      aiError = err instanceof Error ? err.message : String(err);
    }

    // ── Handle AI failure ────────────────────────────────────────────────────
    if (aiError || !parsed?.config) {
      redirect(
        `/formateur/scenarios/${scenarioId}?error=${encodeURIComponent(aiError ?? 'Génération échouée')}`
      );
    }

    // ── Save to DB ───────────────────────────────────────────────────────────
    const supabase = createServiceClient();
    const { error: updateError } = await supabase
      .from('scenarios')
      .update({
        config: parsed!.config,
        description: parsed!.description ?? scenario.description ?? '',
      })
      .eq('id', scenarioId);

    if (updateError) {
      redirect(
        `/formateur/scenarios/${scenarioId}?error=${encodeURIComponent('Sauvegarde échouée: ' + updateError.message)}`
      );
    }

    redirect(`/formateur/scenarios/${scenarioId}?success=Scénario+généré+avec+succès`);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const config = (scenario.config ?? {}) as ScenarioConfig;
  const hasConfig = !!(config.parameters?.length && config.kpis?.length);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/formateur/scenarios" className="text-sm text-purple-700 hover:underline mb-2 block">
              ← Retour aux scénarios
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{scenario.name}</h1>
            <p className="text-slate-500 mt-1">{scenario.description || 'Aucune description — générez le scénario avec l\'IA'}</p>
          </div>
          <div className="flex gap-2">
            {config.total_turns && <Badge variant="info">{config.total_turns} tours</Badge>}
            {config.max_teams && <Badge variant="success">{config.max_teams} équipes max</Badge>}
            {hasConfig
              ? <Badge variant="success">Configuré</Badge>
              : <Badge variant="default">Non configuré</Badge>
            }
          </div>
        </div>

        {/* Feedback banners */}
        {pageError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3">
            <span className="text-red-500 mt-0.5 text-lg">✗</span>
            <div>
              <p className="font-medium text-red-800">Erreur de génération</p>
              <p className="text-sm text-red-700 mt-0.5">{decodeURIComponent(pageError)}</p>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg flex items-start gap-3">
            <span className="text-green-600 mt-0.5 text-lg">✓</span>
            <p className="font-medium text-green-800">{decodeURIComponent(success)}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Generation form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Génération IA
                {!process.env.ANTHROPIC_API_KEY && (
                  <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    Clé API manquante
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleGenerateWithAI} className="space-y-4">
                <Textarea
                  name="prompt"
                  placeholder={`Décrivez votre contexte...\n\nEx: Simulation de gestion d'une chaîne logistique, 8 tours, 4 équipes concurrentes. Les joueurs doivent optimiser leurs stocks, leur production et leur prix de vente face à une demande fluctuante.`}
                  rows={7}
                  required
                />
                <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-700 space-y-1">
                  <p className="font-medium">Conseils pour un bon prompt :</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Précisez le secteur (logistique, finance, retail...)</li>
                    <li>Mentionnez le nombre de tours souhaité</li>
                    <li>Décrivez les décisions clés à prendre</li>
                    <li>Indiquez les objectifs pédagogiques</li>
                  </ul>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!process.env.ANTHROPIC_API_KEY}
                >
                  ✨ Générer avec Claude
                </Button>
                {!process.env.ANTHROPIC_API_KEY && (
                  <p className="text-xs text-amber-600">
                    Configurez ANTHROPIC_API_KEY dans frontend/.env.local pour activer la génération IA.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Current config display */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration actuelle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!hasConfig && (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>Ce scénario n&apos;a pas encore été configuré.</p>
                  <p className="mt-1">Utilisez la génération IA pour le remplir automatiquement.</p>
                </div>
              )}

              {hasConfig && (
                <>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Paramètres de base</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { label: 'Tours', value: config.total_turns },
                        { label: 'Équipes max', value: config.max_teams },
                        { label: 'Équipes min', value: config.min_teams ?? 2 },
                      ].map((item) => (
                        <div key={item.label} className="bg-slate-50 p-2 rounded text-center">
                          <p className="text-slate-400">{item.label}</p>
                          <p className="font-bold text-slate-900 text-base">{item.value ?? '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {config.parameters && config.parameters.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Paramètres de décision ({config.parameters.length})
                      </h3>
                      <div className="space-y-1.5">
                        {config.parameters.map((p, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                            <div className="flex-1">
                              <span className="font-medium text-slate-800">{p.label}</span>
                              {p.unit && <span className="text-slate-400 ml-1">({p.unit})</span>}
                              {p.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                              )}
                            </div>
                            {p.min !== undefined && p.max !== undefined && (
                              <span className="text-xs text-slate-400 whitespace-nowrap">
                                {p.min}–{p.max}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.kpis && config.kpis.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        KPIs ({config.kpis.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {config.kpis.map((k, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                          >
                            {k.label} ({k.unit})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.events && config.events.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Événements ({config.events.length})
                      </h3>
                      <div className="space-y-1.5">
                        {config.events.map((e, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs p-2 bg-amber-50 rounded">
                            <span className="text-amber-500 font-bold whitespace-nowrap">Tour {e.turn}</span>
                            <div>
                              <p className="font-medium text-slate-800">{e.title}</p>
                              {e.description && <p className="text-slate-500">{e.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Link to use this scenario */}
        {hasConfig && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Scénario prêt à l&apos;emploi</p>
              <p className="text-sm text-slate-500">Créez une session de jeu avec ce scénario.</p>
            </div>
            <Link
              href="/formateur/sessions/new"
              className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
            >
              Créer une session →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
