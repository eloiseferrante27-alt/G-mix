import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function ScenariosPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const supabase = createServiceClient();

  const [{ data: orgScenarios }, { data: templates }] = await Promise.all([
    // Org-specific scenarios
    supabase
      .from('scenarios')
      .select('id, name, description, config, is_template, created_at')
      .eq('organization_id', session.organizationId)
      .order('created_at', { ascending: false }),
    // Base templates (is_template = true, organization_id = null)
    supabase
      .from('scenarios')
      .select('id, name, description, config, is_template, created_at')
      .eq('is_template', true)
      .is('organization_id', null)
      .order('name'),
  ]);

  const ScenarioCard = ({
    scenario,
    isTemplate,
  }: {
    scenario: { id: string; name: string; description: string; config: Record<string, unknown>; created_at: string };
    isTemplate: boolean;
  }) => (
    <Card className={`hover:shadow-lg transition-shadow ${isTemplate ? 'border-purple-200 bg-purple-50/30' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{scenario.name}</CardTitle>
          {isTemplate && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Scénario de base
            </span>
          )}
        </div>
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
              {(scenario.config as { max_teams?: number })?.max_teams || 0} équipes
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
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scénarios</h1>
          <p className="text-slate-500 mt-1">Scénarios de base disponibles + vos scénarios personnalisés</p>
        </div>
        <Link href="/formateur/scenarios/new">
          <Button>➕ Nouveau scénario</Button>
        </Link>
      </div>

      {/* Base templates */}
      {templates && templates.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Scénarios de base G-MIX
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((s) => (
              <ScenarioCard key={s.id} scenario={s} isTemplate={true} />
            ))}
          </div>
        </div>
      )}

      {/* Org scenarios */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Scénarios de votre organisation
        </h2>
        {orgScenarios && orgScenarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgScenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} isTemplate={false} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="text-slate-400 mb-4">Aucun scénario créé pour votre organisation</p>
              <Link href="/formateur/scenarios/new">
                <Button variant="outline">Créer un scénario personnalisé</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
