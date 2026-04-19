import { GmixLogo } from '@/components/ui/gmix-logo';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GmixLogo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">G-MIX</h1>
          <p className="text-slate-600 mt-2">Connectez-vous à votre compte</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}