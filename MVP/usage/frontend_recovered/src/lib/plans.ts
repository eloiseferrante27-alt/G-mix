export type Plan = 'free' | 'pro' | 'enterprise'

export interface PlanConfig {
  label: string
  max_formateurs: number
  max_scenarios: number
  max_sessions: number
  ai_generation_enabled: boolean
  color: string
  badge: string
}

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  free: {
    label: 'Gratuit',
    max_formateurs: 1,
    max_scenarios: 3,
    max_sessions: 5,
    ai_generation_enabled: false,
    color: 'bg-slate-100 text-slate-600',
    badge: 'Gratuit',
  },
  pro: {
    label: 'Pro',
    max_formateurs: 10,
    max_scenarios: 50,
    max_sessions: 100,
    ai_generation_enabled: true,
    color: 'bg-purple-100 text-purple-700',
    badge: 'Pro',
  },
  enterprise: {
    label: 'Entreprise',
    max_formateurs: 9999,
    max_scenarios: 9999,
    max_sessions: 9999,
    ai_generation_enabled: true,
    color: 'bg-amber-100 text-amber-700',
    badge: 'Entreprise',
  },
}

export function getPlanConfig(plan: string): PlanConfig {
  return PLAN_CONFIGS[plan as Plan] ?? PLAN_CONFIGS.free
}

export function getDefaultLimits(plan: Plan) {
  const cfg = PLAN_CONFIGS[plan]
  return {
    max_formateurs: cfg.max_formateurs,
    max_scenarios: cfg.max_scenarios,
    max_sessions: cfg.max_sessions,
    ai_generation_enabled: cfg.ai_generation_enabled,
  }
}
