import Link from 'next/link';
import { GmixLogo } from '@/components/ui/gmix-logo';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-white">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <GmixLogo size={80} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4">
          G-MIX
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-md">
          Plateforme de business games pédagogiques pour former les décideurs de demain
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-white text-purple-700 rounded-lg font-medium border border-purple-200 hover:bg-purple-50 transition-colors"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}