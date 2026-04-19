'use server';

import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function createScenario(formData: FormData) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const total_turns = parseInt(formData.get('total_turns') as string);
  const max_teams = parseInt(formData.get('max_teams') as string);
  
  const supabase = await createClient();
  
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
        events: []
      },
      created_by: session.userId,
      organization_id: session.organizationId
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create scenario');
  }

  redirect(`/formateur/scenarios/${data.id}`);
}