export interface PlanConfig {
  name: string;
  badge: string;
  color: string;
  price: number | null;
  maxJeux: number;
  maxJoueurs: number;
  maxFormateurs: number;
  maxSessions: number;
  aiGeneration: boolean;
  // legacy aliases used in organisme dashboard
  maxScenarios: number;
}

const plans: Record<string, PlanConfig> = {
  demo: {
    name: 'Démo',
    badge: 'Démo',
    color: 'bg-slate-100 text-slate-700',
    price: 0,
    maxJeux: 1,
    maxJoueurs: 1,
    maxFormateurs: 1,
    maxSessions: 1,
    aiGeneration: false,
    maxScenarios: 1,
  },
  plan_199: {
    name: 'Starter',
    badge: '199 €/mois',
    color: 'bg-purple-100 text-purple-700',
    price: 199,
    maxJeux: 10,
    maxJoueurs: 200,
    maxFormateurs: 5,
    maxSessions: 20,
    aiGeneration: true,
    maxScenarios: 10,
  },
  plan_299: {
    name: 'Pro',
    badge: '299 €/mois',
    color: 'bg-blue-100 text-blue-700',
    price: 299,
    maxJeux: 50,
    maxJoueurs: 400,
    maxFormateurs: 15,
    maxSessions: 100,
    aiGeneration: true,
    maxScenarios: 50,
  },
  plan_499: {
    name: 'Enterprise',
    badge: '499 €/mois',
    color: 'bg-amber-100 text-amber-700',
    price: 499,
    maxJeux: 200,
    maxJoueurs: 1000,
    maxFormateurs: -1,
    maxSessions: -1,
    aiGeneration: true,
    maxScenarios: 200,
  },
  // legacy keys kept for backwards compat
  free: {
    name: 'Démo',
    badge: 'Démo',
    color: 'bg-slate-100 text-slate-700',
    price: 0,
    maxJeux: 1,
    maxJoueurs: 1,
    maxFormateurs: 1,
    maxSessions: 1,
    aiGeneration: false,
    maxScenarios: 1,
  },
  pro: {
    name: 'Pro',
    badge: '299 €/mois',
    color: 'bg-blue-100 text-blue-700',
    price: 299,
    maxJeux: 50,
    maxJoueurs: 400,
    maxFormateurs: 15,
    maxSessions: 100,
    aiGeneration: true,
    maxScenarios: 50,
  },
  enterprise: {
    name: 'Enterprise',
    badge: '499 €/mois',
    color: 'bg-amber-100 text-amber-700',
    price: 499,
    maxJeux: 200,
    maxJoueurs: 1000,
    maxFormateurs: -1,
    maxSessions: -1,
    aiGeneration: true,
    maxScenarios: 200,
  },
};

export function getPlanConfig(plan: string): PlanConfig | null {
  return plans[plan] ?? plans['demo'];
}

export function getPlanName(plan: string): string {
  return plans[plan]?.name ?? 'Démo';
}

export function getPlanLimits(plan: string): {
  max_formateurs: number;
  max_sessions: number;
  max_scenarios: number;
  max_joueurs: number;
} {
  const cfg = plans[plan] ?? plans['demo'];
  return {
    max_formateurs: cfg.maxFormateurs,
    max_sessions: cfg.maxSessions,
    max_scenarios: cfg.maxScenarios,
    max_joueurs: cfg.maxJoueurs,
  };
}

// Tier order: higher = more features. Used to enforce upgrade-only rules.
export const PLAN_TIER: Record<string, number> = {
  demo: 0, free: 0,
  plan_199: 1,
  plan_299: 2, pro: 2,
  plan_499: 3, enterprise: 3,
};

export function getPlanTier(plan: string): number {
  return PLAN_TIER[plan] ?? 0;
}

// Returns true if the custom limit is valid (>= plan default, or -1 = unlimited which is always valid).
// If planDefault is -1 (unlimited), only -1 is valid for custom.
export function isLimitValid(custom: number, planDefault: number): boolean {
  if (custom === -1) return true;
  if (planDefault === -1) return false; // can't restrict an unlimited-plan limit
  return custom >= planDefault;
}
