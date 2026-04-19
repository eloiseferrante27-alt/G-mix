import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { isDjango, djangoFetch } from '@/lib/backend';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // ── Django backend ──────────────────────────────────────────────────────────
  if (isDjango()) {
    const body = await request.json();
    const resp = await djangoFetch('ai/generate-scenario/', {
      method: 'POST',
      body: JSON.stringify(body),
      token: session.djangoToken,
    });
    const json = await resp.json();
    if (!resp.ok) {
      return NextResponse.json(
        { error: json.error ?? 'Erreur lors de la génération' },
        { status: resp.status }
      );
    }
    return NextResponse.json(json);
  }

  // ── Supabase backend ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(plan, ai_generation_enabled)')
    .eq('id', session.userId)
    .single();

  const org = profile?.organizations as unknown as { plan: string; ai_generation_enabled: boolean } | null;

  if (session.role === 'formateur' && (!org || !org.ai_generation_enabled)) {
    return NextResponse.json(
      { error: 'La génération IA nécessite un abonnement Pro ou Entreprise.' },
      { status: 403 }
    );
  }

  // Use the AI package from packages/ai
  const { buildScenario } = await import('@gmix/ai');
  const body = await request.json();

  try {
    const scenario = await buildScenario(body);
    return NextResponse.json({ scenario });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la génération du scénario' },
      { status: 500 }
    );
  }
}