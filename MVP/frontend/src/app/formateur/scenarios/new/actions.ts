'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function createScenario(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() ?? '';
  const total_turns = parseInt(formData.get('total_turns') as string) || 8;
  const max_teams = parseInt(formData.get('max_teams') as string) || 6;

  if (!name) redirect('/formateur/scenarios/new?error=Le+nom+est+obligatoire');

  // Service client bypasses RLS — user auth already checked via getSession()
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      name,
      description,
      config: {
        total_turns,
        max_teams,
        min_teams: 2,
        parameters: [],
        kpis: [],
        events: [],
      },
      created_by: session.userId,
      organization_id: session.organizationId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    redirect(`/formateur/scenarios/new?error=${encodeURIComponent('Création échouée : ' + error.message)}`);
  }

  redirect(`/formateur/scenarios/${data.id}`);
}
