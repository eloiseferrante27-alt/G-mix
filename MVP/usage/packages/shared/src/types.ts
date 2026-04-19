export type Role = 'admin' | 'formateur' | 'joueur'
export type SessionStatus = 'draft' | 'active' | 'completed' | 'archived'
export type TurnStatus = 'pending' | 'open' | 'closed'

export interface Organization {
  id: string
  name: string
  plan: 'free' | 'pro'
  created_at: string
}

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: Role
  organization_id: string
  created_at: string
}

export interface Scenario {
  id: string
  name: string
  description: string
  config: ScenarioConfig
  created_by: string
  organization_id: string
  created_at: string
}

export interface ScenarioConfig {
  total_turns: number
  max_teams: number
  min_teams: number
  context?: string
  parameters: ScenarioParameter[]
  kpis?: ScenarioKPI[]
  events?: ScenarioEvent[]
  selected_tools?: string[]
  learning_objectives?: string[]
  learning_resources?: LearningResource[]
  tags?: string[]
  industry?: string
  difficulty?: string
  game_mode?: string
}

export interface ScenarioParameter {
  key: string
  label: string
  type: 'number' | 'select'
  min?: number
  max?: number
  step?: number
  default: number
  unit?: string
  description?: string
  tool_id?: string
  options?: { value: number; label: string }[]
}

export interface ScenarioKPI {
  key: string
  label: string
  unit: string
  higher_is_better: boolean
}

export interface ScenarioEvent {
  turn: number
  title: string
  description: string
  impact: string
}

export interface LearningResource {
  title: string
  content: string
  type: 'concept' | 'tip' | 'warning' | 'exercise'
  turn_number?: number
}

export interface GameSession {
  id: string
  scenario_id: string
  formateur_id: string
  organization_id: string
  name: string
  status: SessionStatus
  current_turn: number
  total_turns: number
  config: Record<string, unknown>
  created_at: string
  started_at: string | null
  ended_at: string | null
  scenario?: Scenario
  teams?: Team[]
}

export interface Team {
  id: string
  session_id: string
  name: string
  color: string
  created_at: string
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface Turn {
  id: string
  session_id: string
  turn_number: number
  status: TurnStatus
  deadline: string | null
  started_at: string | null
  ended_at: string | null
}

export interface Decision {
  id: string
  turn_id: string
  team_id: string
  user_id: string
  data: DecisionData
  submitted_at: string
}

export interface DecisionData {
  production_volume: number
  selling_price: number
  marketing_budget: number
  rd_budget: number
  inventory_target: number
  [key: string]: number
}

export interface TurnResult {
  id: string
  turn_id: string
  team_id: string
  kpis: KPIData
  score: number
  calculated_at: string
  team?: Team
  turn?: Turn
}

export interface KPIData {
  market_demand: number
  actual_sales: number
  revenue: number
  cogs: number
  gross_profit: number
  marketing_cost: number
  rd_cost: number
  operating_profit: number
  inventory: number
  inventory_cost: number
  net_profit: number
  market_share: number
  customer_satisfaction: number
  score: number
  [key: string]: number
}

export interface SessionPayload {
  userId: string
  email: string
  role: Role
  organizationId: string
  firstName: string
  lastName: string
  expiresAt: Date
}
