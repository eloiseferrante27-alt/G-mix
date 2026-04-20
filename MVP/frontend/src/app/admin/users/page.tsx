import { redirect } from 'next/navigation';
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const { role: filterRole } = await searchParams;

  const supabase = createServiceClient();

  let query = supabase
    .from('profiles')
    .select('*, organizations!profiles_organization_id_fkey(name)')
    .order('created_at', { ascending: false });

  if (filterRole && filterRole !== 'all') {
    query = query.eq('role', filterRole);
  }

  const { data: users } = await query;

  // Count per role for filter tabs
  const { data: roleCounts } = await supabase
    .from('profiles')
    .select('role');

  const counts: Record<string, number> = { all: 0, organisme: 0, formateur: 0, joueur: 0, admin: 0 };
  (roleCounts ?? []).forEach((r) => {
    counts[r.role] = (counts[r.role] ?? 0) + 1;
    counts['all'] = (counts['all'] ?? 0) + 1;
  });

  async function handleToggleDisable(formData: FormData) {
    'use server';
    const userId = formData.get('user_id') as string;
    const disabled = formData.get('disabled') === 'true';
    const supabase = createServiceClient();
    await supabase.from('profiles').update({ disabled: !disabled }).eq('id', userId);
    redirect('/admin/users');
  }

  const filterTabs = [
    { key: 'all', label: 'Tous', count: counts['all'] },
    { key: 'admin', label: 'Admins', count: counts['admin'] },
    { key: 'organisme', label: 'Organismes', count: counts['organisme'] },
    { key: 'formateur', label: 'Formateurs', count: counts['formateur'] },
    { key: 'joueur', label: 'Joueurs', count: counts['joueur'] },
  ];

  const active = filterRole ?? 'all';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
        <p className="text-slate-500 mt-1">{counts['all']} utilisateur(s) sur la plateforme</p>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-2 mb-6">
        {filterTabs.map((t) => (
          <a
            key={t.key}
            href={t.key === 'all' ? '/admin/users' : `/admin/users?role=${t.key}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              active === t.key
                ? 'bg-purple-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label} <span className="ml-1 opacity-75">({t.count})</span>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {active === 'all' ? 'Tous les utilisateurs' : `${roleLabel[active]}s`}
            {' '}({users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Utilisateur</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Rôle</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Organisation</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Inscrit le</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Statut</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users?.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 ${u.disabled ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-xs flex-shrink-0">
                        {(u.first_name?.[0] ?? '?')}{(u.last_name?.[0] ?? '')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={roleVariant[u.role] ?? 'default'}>
                      {roleLabel[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {(u.organizations as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    {u.disabled ? (
                      <Badge variant="default">Désactivé</Badge>
                    ) : (
                      <Badge variant="success">Actif</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.role !== 'admin' && (
                      <form action={handleToggleDisable}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="disabled" value={String(!!u.disabled)} />
                        <button
                          type="submit"
                          className={`text-xs hover:underline ${u.disabled ? 'text-green-600' : 'text-red-500'}`}
                        >
                          {u.disabled ? 'Réactiver' : 'Désactiver'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!users?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Aucun utilisateur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
