import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import Link from 'next/link';

export default async function NewSessionPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const supabase = createServiceClient();

  const [{ data: orgScenarios }, { data: templateScenarios }] = await Promise.all([
    supabase
      .from('scenarios')
      .select('id, name')
      .eq('organization_id', session.organizationId)
      .order('name'),
    supabase
      .from('scenarios')
      .select('id, name')
      .eq('is_template', true)
      .is('organization_id', null)
      .order('name'),
  ]);

  // Merge: templates first, then org scenarios
  const scenarios = [
    ...(templateScenarios ?? []).map((s) => ({ ...s, _isTemplate: true })),
    ...(orgScenarios ?? []).map((s) => ({ ...s, _isTemplate: false })),
  ];

  async function handleSubmit(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const scenario_id = formData.get('scenario_id') as string;
    const total_turns = parseInt(formData.get('total_turns') as string, 10);

    const sess = await getSession();
    if (!sess) redirect('/login');
    // Service client bypasses RLS — user already authenticated via getSession()
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        name,
        description,
        scenario_id: scenario_id || null,
        formateur_id: sess.userId,
        organization_id: sess.organizationId ?? null,
        status: 'draft',
        current_turn: 0,
        total_turns,
        config: {},
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Impossible de créer la session : ' + (error?.message ?? 'Erreur inconnue'));
    }

    redirect(`/formateur/sessions/${data.id}`);
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/formateur/sessions" className="text-sm text-purple-700 hover:underline mb-2 block">
            ← Retour aux sessions
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Créer une nouvelle session</h1>
          <p className="text-slate-500 mt-1">Configurez votre business game et gérez les équipes</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations de base</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom de la session</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Simulation Supply Chain — Promo 2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="total_turns">Nombre de tours</Label>
                  <Input
                    id="total_turns"
                    name="total_turns"
                    type="number"
                    min="3"
                    max="20"
                    defaultValue="10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Objectifs pédagogiques, contexte..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="scenario_id">Scénario</Label>
                {scenarios && scenarios.length > 0 ? (
                  <Select name="scenario_id" required>
                    <SelectItem value="">Choisissez un scénario</SelectItem>
                    {scenarios.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc._isTemplate ? `⭐ ${sc.name} (base)` : sc.name}
                      </SelectItem>
                    ))}
                  </Select>
                ) : (
                  <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    Aucun scénario disponible.{' '}
                    <Link href="/formateur/scenarios/new" className="underline font-medium">
                      Créer un scénario
                    </Link>{' '}
                    d'abord.
                    <input type="hidden" name="scenario_id" value="" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit">Créer la session</Button>
            <Link href="/formateur/sessions">
              <Button variant="outline" type="button">Annuler</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
