import { getSession } from '@/lib/session';
import { Sidebar } from '@/components/layout/sidebar';
import { redirect } from 'next/navigation';

export default async function FormateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'formateur' && session.role !== 'admin') {
    redirect('/jeu');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={session.role}
        firstName={session.firstName}
        lastName={session.lastName}
        email={session.email}
      />
      <main className="flex-1 bg-slate-50">
        {children}
      </main>
    </div>
  );
}