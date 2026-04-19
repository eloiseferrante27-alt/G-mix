import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Sidebar } from '@/components/layout/sidebar'

export default async function FormateurLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !['admin', 'formateur'].includes(session.role)) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar role="formateur" firstName={session.firstName} lastName={session.lastName} email={session.email} />
      <main className="flex-1 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
