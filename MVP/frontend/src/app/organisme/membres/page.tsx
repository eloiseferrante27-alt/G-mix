import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const roleLabel: Record<string, string> = {
  organisme: 'Organisme',
  formateur: 'Formateur',
  joueur: 'Joueur',
};
const roleVariant: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  organisme: 'info',
  formateur: 'warning',
  joueur: 'success',
};

export default async function MembresPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!session.organizationId) redirect('/organisme');

  const supabase = createServiceClient();

  const { data: members } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at')
    .eq('organization_id', session.organizationId)
    .order('role')
    .order('last_name');

  async function handleRemoveMember(formData: FormData) {
    'use server';
    const userId = formData.get('user_id') as string;
    const sess = await getSession();
    if (!sess) return;

    const supabase = createServiceClient();
    await supabase
      .from('profiles')
      .update({ organization_id: null })
      .eq('id', userId)
      .eq('organization_id', sess.organizationId);

    redirect('/organisme/membres');
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
          <p className="text-slate-500 mt-1">Gérez les accès à votre organisation</p>
        </div>
        <Link
          href="/organisme/invitations"
          className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
        >
          ✉️ Inviter un membre
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Membres de l'organisation ({members?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Membre</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Rôle</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Depuis</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {m.first_name} {m.last_name}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{m.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant={roleVariant[m.role] ?? 'default'}>
                      {roleLabel[m.role] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-3">
                    {m.id !== session.userId && (
                      <form action={handleRemoveMember}>
                        <input type="hidden" name="user_id" value={m.id} />
                        <button
                          type="submit"
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Retirer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!members?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Aucun membre pour le moment —{' '}
                    <Link href="/organisme/invitations" className="text-purple-700 hover:underline">
                      invitez des formateurs et joueurs
                    </Link>
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
