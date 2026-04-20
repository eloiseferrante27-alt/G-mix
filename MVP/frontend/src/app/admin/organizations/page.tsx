import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPlanConfig } from '@/lib/plans';

export default async function AdminOrganizationsPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const supabase = createServiceClient();
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: memberCounts } = await supabase
    .from('profiles')
    .select('organization_id')
    .not('organization_id', 'is', null)
    .neq('role', 'admin');

  const countByOrg = (memberCounts ?? []).reduce<Record<string, number>>((acc, p) => {
    if (p.organization_id) acc[p.organization_id] = (acc[p.organization_id] ?? 0) + 1;
    return acc;
  }, {});

  if (error) console.error('orgs error', error);

  const now = new Date();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Organisations</h1>
        <p className="text-slate-500 mt-1">{orgs?.length ?? 0} organisation(s) — cliquez pour gérer</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Toutes les organisations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Nom</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Plan actuel</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Abonnement</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Membres</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Contact</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">IA</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Créée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs?.map((org) => {
                const cfg = getPlanConfig(org.plan);
                const expiresAt = org.subscription_expires_at
                  ? new Date(org.subscription_expires_at)
                  : null;
                const isExpired = expiresAt !== null && expiresAt <= now;
                const isPermanent = expiresAt === null;

                return (
                  <tr key={org.id} className="hover:bg-purple-50 cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="font-medium text-purple-700 hover:underline"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {cfg ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">{org.plan}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isExpired ? (
                        <span className="text-xs text-red-500 font-medium">
                          Expiré le {expiresAt!.toLocaleDateString('fr-FR')}
                        </span>
                      ) : isPermanent ? (
                        <span className="text-xs text-slate-400">Permanent</span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">
                          Actif jusqu&apos;au {expiresAt!.toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{countByOrg[org.id] ?? 0}</td>
                    <td className="px-6 py-4 text-slate-600">{org.contact_email ?? '—'}</td>
                    <td className="px-6 py-4">
                      {org.ai_generation_enabled
                        ? <span className="text-green-600 font-medium">✓</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(org.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                );
              })}
              {!orgs?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Aucune organisation
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
