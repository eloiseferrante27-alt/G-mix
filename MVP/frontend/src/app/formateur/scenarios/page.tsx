import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function ScenariosPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*')
    .eq('created_by', session.userId)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Scénarios</h1>
          <p className="text-slate-500 mt-1">Créez et gérez vos scénarios de business game</p>
        </div>
        <Link href="/formateur/scenarios/new">
          <Button>➕ Nouveau scénario</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios && scenarios.length > 0 ? (
          scenarios.map((scenario) => (
            <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{scenario.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {scenario.description || 'Aucune description'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="info">
                      {(scenario.config as { total_turns?: number })?.total_turns || 0} tours
                    </Badge>
                    <Badge variant="success">
                      {(scenario.config as { max_teams?: number })?.max_teams || 0} équipes max
                    </Badge>
                  </div>
                  <Link
                    href={`/formateur/scenarios/${scenario.id}`}
                    className="text-purple-700 hover:underline text-sm font-medium"
                  >
                    Voir →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-slate-400 mb-4">Aucun scénario créé</p>
                <Link href="/formateur/scenarios/new">
                  <Button>Créer mon premier scénario</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}