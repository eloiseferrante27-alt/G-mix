import React from 'react';
import Link from 'next/link';
import { GmixLogo } from '@/components/ui/gmix-logo';
import { logout } from '@/app/actions/auth';

interface SidebarProps {
  role: 'admin' | 'formateur' | 'joueur';
  firstName: string;
  lastName: string;
  email: string;
}

const formateurLinks = [
  { href: '/formateur', label: 'Tableau de bord', icon: '📊' },
  { href: '/formateur/sessions', label: 'Sessions', icon: '🎮' },
  { href: '/formateur/scenarios', label: 'Scénarios', icon: '📝' },
  { href: '/formateur/teams', label: 'Équipes', icon: '👥' },
];

const adminLinks = [
  { href: '/admin', label: 'Tableau de bord', icon: '📊' },
  { href: '/admin/organizations', label: 'Organisations', icon: '🏢' },
  { href: '/admin/users', label: 'Utilisateurs', icon: '👤' },
  { href: '/formateur', label: 'Espace formateur', icon: '📝' },
];

const joueurLinks = [
  { href: '/jeu', label: 'Mes sessions', icon: '🎮' },
];

export const Sidebar: React.FC<SidebarProps> = ({ role, firstName, lastName, email }) => {
  const links = role === 'admin' ? adminLinks : role === 'joueur' ? joueurLinks : formateurLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2">
          <GmixLogo size={32} />
          <span className="font-bold text-lg text-slate-900">G-MIX</span>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span className="text-lg">{link.icon}</span>
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-700 font-medium text-sm">
              {firstName.charAt(0)}{lastName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{firstName} {lastName}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-left"
          >
            <span>🚪</span>
            <span>Se déconnecter</span>
          </button>
        </form>
      </div>
    </aside>
  );
};
