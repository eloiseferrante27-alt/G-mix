import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const roleVariant: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  admin: 'default', organisme: 'info', formateur: 'warning', joueur: 'success',
};
const roleLabel: Record<string, string> = {
  admin: 'Admin', organisme: 'Organisme', formateur: 'Formateur', joueur: 'Joueur',
};
const planVariant: Record<string, 'default' | 'info' | 'success'> = {
  free: 'default', pro: 'info', enterprise: 'success',
};

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: org }, { data: members }, { data: sessions }, { data: scenarios }] =
    await Promise.all([
      supabase.from('organizations').select('*').eq('id', id).single(),
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, created_at')
        .eq('organization_id', id)
        .neq('role', 'admin')
        .order('role')
        .order('last_name'),
      supabase
        .from('game_sessions')
        .select('id, name, status, current_turn, total_turns, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('scenarios')
        .select('id, name, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (!org) redirect('/admin/organizations');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/organizations"
          className="text-sm text-purple-700 hover:underline mb-2 block"
        >
          ← Retour aux organisations
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
          <Badge variant={planVariant[org.plan] ?? 'default'}>
            {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
          </Badge>
          {org.ai_generation_enabled && (
            <span className="text-xs text-green-600 font-medium">✓ IA activée</span>
          )}
        </div>
        {org.contact_email && (
          <p className="text-slate-500 mt-1">{org.contact_email}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Membres', value: members?.length ?? 0, icon: '👥' },
          { label: 'Sessions', value: sessions?.length ?? 0, icon: '🎮' },
          { label: 'Scénarios', value: scenarios?.length ?? 0, icon: '📝' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Members */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Membres ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Utilisateur</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Rôle</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-xs flex-shrink-0">
                        {m.first_name?.[0] ?? '?'}{m.last_name?.[0] ?? ''}
                      </div>
                      <span className="font-medium text-slate-900">
                        {m.first_name} {m.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{m.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant={roleVariant[m.role] ?? 'default'}>
                      {roleLabel[m.role] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-slate-500 text-xs">
                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
              {!members?.length && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    Aucun membre
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Sessions */}
      {sessions && sessions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sessions ({sessions.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Nom</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Statut</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Tour</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-6 py-3">
                      <Badge variant={
                        s.status === 'active' ? 'success' :
                        s.status === 'completed' ? 'info' : 'default'
                      }>
                        {s.status === 'draft' ? 'Brouillon' :
                         s.status === 'active' ? 'En cours' :
                         s.status === 'completed' ? 'Terminée' : s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{s.current_turn}/{s.total_turns}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
