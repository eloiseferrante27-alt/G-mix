'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { GmixLogo } from '@/components/ui/gmix-logo'
import type { Role } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: '🏠' },
    { href: '/admin/users', label: 'Utilisateurs', icon: '👥' },
    { href: '/admin/organisations', label: 'Organisations', icon: '🏢' },
  ],
  formateur: [
    { href: '/formateur', label: 'Mes sessions', icon: '🎮' },
    { href: '/formateur/scenarios', label: 'Mes scénarios', icon: '📋' },
    { href: '/formateur/sessions/new', label: 'Nouvelle session', icon: '➕' },
  ],
  joueur: [
    { href: '/jeu', label: 'Mes sessions', icon: '🏠' },
  ],
}

interface SidebarProps {
  role: Role
  firstName: string
  lastName: string
  email: string
}

export function Sidebar({ role, firstName, lastName, email }: SidebarProps) {
  const fullName = `${firstName} ${lastName}`.trim()
  const pathname = usePathname()
  const items = NAV[role]

  const roleLabel: Record<Role, string> = {
    admin: 'Administrateur',
    formateur: 'Formateur',
    joueur: 'Joueur',
  }

  const roleColor: Record<Role, string> = {
    admin: 'bg-purple-100 text-purple-700',
    formateur: 'bg-purple-100 text-purple-700',
    joueur: 'bg-green-100 text-green-700',
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#120726] text-white">
      <div className="p-6 border-b border-purple-900/50">
        <div className="flex items-center gap-3">
          <GmixLogo size={44} />
          <span className="font-black text-lg tracking-wide">G-MIX</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/formateur' && item.href !== '/jeu' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-purple-700 text-white'
                  : 'text-purple-200/70 hover:bg-purple-900/40 hover:text-white'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-purple-900/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-purple-800 rounded-full flex items-center justify-center text-xs font-bold uppercase">
            {fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fullName}</p>
            <p className="text-xs text-purple-300/60 truncate">{email}</p>
          </div>
        </div>
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-3', roleColor[role])}>
          {roleLabel[role]}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left text-sm text-purple-300/60 hover:text-white px-3 py-2 rounded-lg hover:bg-purple-900/40 transition-colors"
          >
            🚪 Déconnexion
          </button>
        </form>
      </div>
    </aside>
  )
}
