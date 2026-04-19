export interface PlanConfig {
  name: string;
  badge: string;
  color: string;
  maxScenarios: number;
  maxSessions: number;
  maxFormateurs: number;
  aiGeneration: boolean;
}

const plans: Record<string, PlanConfig> = {
  free: {
    name: 'Gratuit',
    badge: 'Gratuit',
    color: 'bg-slate-100 text-slate-700',
    maxScenarios: 3,
    maxSessions: 5,
    maxFormateurs: 1,
    aiGeneration: false,
  },
  pro: {
    name: 'Pro',
    badge: 'Pro',
    color: 'bg-purple-100 text-purple-700',
    maxScenarios: 20,
    maxSessions: 50,
    maxFormateurs: 5,
    aiGeneration: true,
  },
  enterprise: {
    name: 'Entreprise',
    badge: 'Entreprise',
    color: 'bg-blue-100 text-blue-700',
    maxScenarios: -1, // unlimited
    maxSessions: -1,
    maxFormateurs: -1,
    aiGeneration: true,
  },
};

export function getPlanConfig(plan: string): PlanConfig | null {
  return plans[plan] ?? null;
}

export function getPlanName(plan: string): string {
  return plans[plan]?.name ?? 'Gratuit';
}