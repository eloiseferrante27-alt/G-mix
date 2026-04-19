import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import Anthropic from '@anthropic-ai/sdk';

export default async function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const supabase = await createClient();
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .single();

  if (!scenario) redirect('/formateur/scenarios');

  const scenarioId = scenario.id as string;

  async function handleGenerateWithAI(formData: FormData) {
    'use server';
    const prompt = formData.get('prompt') as string;
    const sess = await getSession();
    if (!sess) redirect('/login');

    const supabase = await createClient();
    const { data: current } = await supabase
      .from('scenarios')
      .select('config, description')
      .eq('id', scenarioId)
      .single();

    let config = current?.config ?? {};
    let description = current?.description ?? '';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Tu es un expert en business games pédagogiques. Génère un scénario en JSON pour un jeu de simulation basé sur ce contexte: "${prompt}".
Réponds UNIQUEMENT avec un JSON valide contenant:
{
  "description": "string",
  "config": {
    "total_turns": number,
    "max_teams": number,
    "min_teams": 2,
    "parameters": [{"id":"string","label":"string","type":"number","min":number,"max":number,"unit":"string","default":number,"description":"string"}],
    "kpis": [{"id":"string","label":"string","unit":"string"}],
    "events": [{"turn":number,"title":"string","description":"string","impact":"string"}]
  }
}`,
          }],
        });
        const text = (message.content[0] as { type: string; text: string }).text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.config) config = parsed.config;
          if (parsed.description) description = parsed.description;
        }
      } catch {
        // AI failed — keep existing config
      }
    }

    await supabase
      .from('scenarios')
      .update({ config, description })
      .eq('id', scenarioId);

    redirect(`/formateur/scenarios/${scenarioId}`);
  }

  const config = scenario.config as {
    total_turns?: number; max_teams?: number; min_teams?: number;
    parameters?: Array<{ id: string; label: string; type: string }>;
    kpis?: Array<{ id: string; label: string; unit: string }>;
    events?: Array<{ turn: number; title: string }>;
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/formateur/scenarios" className="text-sm text-purple-700 hover:underline mb-2 block">
              ← Retour aux scénarios
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{scenario.name}</h1>
            <p className="text-slate-500 mt-1">{scenario.description || 'Aucune description'}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="info">{config.total_turns ?? '?'} tours</Badge>
            <Badge variant="success">{config.max_teams ?? '?'} équipes max</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Génération IA du scénario</CardTitle></CardHeader>
            <CardContent>
              <form action={handleGenerateWithAI} className="space-y-4">
                <Textarea
                  name="prompt"
                  placeholder="Décrivez votre contexte... Ex: 'Scénario de gestion de chaîne logistique, 10 tours, 4 équipes, focus sur la gestion des stocks'"
                  rows={6}
                  required
                />
                <Button type="submit">✨ Générer avec Claude</Button>
              </form>
              {!process.env.ANTHROPIC_API_KEY && (
                <p className="mt-3 text-xs text-amber-600">
                  ⚠ Configurez ANTHROPIC_API_KEY dans .env.local pour activer la génération IA.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Configuration actuelle</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Paramètres de base</h3>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Tours : <span className="font-medium text-slate-900">{config.total_turns ?? '—'}</span></div>
                  <div>Équipes max : <span className="font-medium text-slate-900">{config.max_teams ?? '—'}</span></div>
                  <div>Équipes min : <span className="font-medium text-slate-900">{config.min_teams ?? 2}</span></div>
                </div>
              </div>

              {config.parameters && config.parameters.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Paramètres de décision ({config.parameters.length})
                  </h3>
                  <ul className="space-y-1 text-slate-600">
                    {config.parameters.map((p, i) => (
                      <li key={i}>• {p.label} <span className="text-slate-400">({p.type})</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {config.kpis && config.kpis.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">KPIs ({config.kpis.length})</h3>
                  <ul className="space-y-1 text-slate-600">
                    {config.kpis.map((k, i) => (
                      <li key={i}>• {k.label} <span className="text-slate-400">({k.unit})</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {config.events && config.events.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Événements ({config.events.length})</h3>
                  <ul className="space-y-1 text-slate-600">
                    {config.events.map((e, i) => (
                      <li key={i}>• Tour {e.turn} — {e.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!config.parameters?.length && !config.kpis?.length && !config.events?.length && (
                <p className="text-slate-400 italic">
                  Utilisez la génération IA pour configurer ce scénario.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
