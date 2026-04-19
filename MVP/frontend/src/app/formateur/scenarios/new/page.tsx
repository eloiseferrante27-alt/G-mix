import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createScenario } from './actions';

export default async function NewScenarioPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Créer un nouveau scénario</h1>
          <p className="text-slate-500 mt-1">Configurez les paramètres de base de votre business game</p>
        </div>

        <form action={createScenario} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du scénario</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Gestion de chaîne logistique"
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
                  placeholder="Décrivez le contexte de votre business game..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration des équipes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_teams">Nombre maximum d'équipes</Label>
                  <Input
                    id="max_teams"
                    name="max_teams"
                    type="number"
                    min="2"
                    max="20"
                    defaultValue="6"
                    required
                  />
                </div>
                <div>
                  <Label>Nombre minimum d'équipes</Label>
                  <Input value="2" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit">Créer le scénario</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
