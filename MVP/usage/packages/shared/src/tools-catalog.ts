export type ToolCategory =
  | 'marketing'
  | 'finance'
  | 'operations'
  | 'hr'
  | 'innovation'
  | 'strategy'
  | 'sustainability'
  | 'digital'

export interface ToolParameter {
  key: string
  label: string
  type: 'number' | 'select'
  min?: number
  max?: number
  step?: number
  default: number
  unit: string
  description: string
  options?: { value: number; label: string }[]
}

export interface ToolKPI {
  key: string
  label: string
  unit: string
  higher_is_better: boolean
}

export interface GameTool {
  id: string
  name: string
  icon: string
  description: string
  category: ToolCategory
  parameters: ToolParameter[]
  kpis: ToolKPI[]
  /** Injected into the AI system prompt to guide scenario generation */
  ai_context: string
}

export const TOOLS_CATALOG: GameTool[] = [
  {
    id: 'pricing',
    name: 'Stratégie Pricing',
    icon: '🏷️',
    description: 'Fixez votre prix de vente et votre positionnement tarifaire',
    category: 'strategy',
    parameters: [
      {
        key: 'selling_price',
        label: 'Prix de vente unitaire',
        type: 'number',
        min: 10,
        max: 1000,
        step: 5,
        default: 100,
        unit: '€',
        description: 'Prix proposé aux clients par unité',
      },
      {
        key: 'pricing_strategy',
        label: 'Stratégie tarifaire',
        type: 'select',
        default: 1,
        unit: '',
        description: 'Approche de positionnement prix',
        options: [
          { value: 0, label: 'Pénétration marché' },
          { value: 1, label: 'Valeur perçue' },
          { value: 2, label: 'Premium' },
        ],
      },
    ],
    kpis: [
      { key: 'margin_rate', label: 'Taux de marge brute', unit: '%', higher_is_better: true },
      { key: 'price_competitiveness', label: 'Compétitivité prix', unit: '/100', higher_is_better: true },
    ],
    ai_context:
      'Players control selling price and pricing strategy (penetration/value/premium). This directly affects demand elasticity, margin, and competitive positioning.',
  },
  {
    id: 'marketing_mix',
    name: 'Marketing Mix',
    icon: '📢',
    description: 'Gérez la publicité, les promotions et la notoriété de marque',
    category: 'marketing',
    parameters: [
      {
        key: 'advertising_budget',
        label: 'Budget publicitaire',
        type: 'number',
        min: 0,
        max: 100000,
        step: 2500,
        default: 10000,
        unit: '€',
        description: 'Investissement en publicité (TV, digital, print)',
      },
      {
        key: 'promotion_discount',
        label: 'Remise promotionnelle',
        type: 'number',
        min: 0,
        max: 40,
        step: 5,
        default: 0,
        unit: '%',
        description: 'Réduction temporaire sur le prix catalogue',
      },
    ],
    kpis: [
      { key: 'brand_awareness', label: 'Notoriété de marque', unit: '/100', higher_is_better: true },
      { key: 'customer_acquisition', label: 'Nouveaux clients', unit: 'clients', higher_is_better: true },
    ],
    ai_context:
      'Marketing mix tool controls advertising spend and promotional discounts. Increases demand and brand visibility but reduces margins when discounting.',
  },
  {
    id: 'supply_chain',
    name: 'Chaîne d\'approvisionnement',
    icon: '🏭',
    description: 'Planifiez la production, les stocks et choisissez vos fournisseurs',
    category: 'operations',
    parameters: [
      {
        key: 'production_volume',
        label: 'Volume de production',
        type: 'number',
        min: 100,
        max: 10000,
        step: 100,
        default: 1000,
        unit: 'unités',
        description: 'Nombre d\'unités à produire ce trimestre',
      },
      {
        key: 'supplier_tier',
        label: 'Qualité fournisseur',
        type: 'select',
        default: 1,
        unit: '',
        description: 'Niveau de partenariat fournisseur',
        options: [
          { value: 0, label: 'Bas coût (risque élevé)' },
          { value: 1, label: 'Standard' },
          { value: 2, label: 'Premium (fiable)' },
        ],
      },
    ],
    kpis: [
      { key: 'inventory_level', label: 'Niveau de stock', unit: 'unités', higher_is_better: false },
      { key: 'supply_reliability', label: 'Fiabilité livraison', unit: '%', higher_is_better: true },
      { key: 'service_rate', label: 'Taux de service', unit: '%', higher_is_better: true },
    ],
    ai_context:
      'Supply chain tool manages production volume and supplier relationships. Affects inventory levels, delivery reliability, cost of goods sold, and customer satisfaction.',
  },
  {
    id: 'finance',
    name: 'Finance & Trésorerie',
    icon: '💰',
    description: 'Gérez le budget, les emprunts et les investissements capitaux',
    category: 'finance',
    parameters: [
      {
        key: 'loan_amount',
        label: 'Emprunt bancaire',
        type: 'number',
        min: 0,
        max: 500000,
        step: 10000,
        default: 0,
        unit: '€',
        description: 'Capital emprunté (taux d\'intérêt appliqué)',
      },
      {
        key: 'capex_investment',
        label: 'Investissement CAPEX',
        type: 'number',
        min: 0,
        max: 200000,
        step: 5000,
        default: 0,
        unit: '€',
        description: 'Investissements en équipements et infrastructure',
      },
    ],
    kpis: [
      { key: 'cash_flow', label: 'Cash flow net', unit: '€', higher_is_better: true },
      { key: 'debt_ratio', label: 'Ratio d\'endettement', unit: '%', higher_is_better: false },
      { key: 'roi', label: 'Retour sur investissement', unit: '%', higher_is_better: true },
    ],
    ai_context:
      'Finance tool gives players control over borrowing and capital investment. Enables growth but increases financial risk through debt ratios and interest costs.',
  },
  {
    id: 'hr',
    name: 'RH & Capital Humain',
    icon: '👥',
    description: 'Recrutez, formez et fidélisez vos équipes',
    category: 'hr',
    parameters: [
      {
        key: 'hiring_budget',
        label: 'Budget recrutement',
        type: 'number',
        min: 0,
        max: 100000,
        step: 2500,
        default: 10000,
        unit: '€',
        description: 'Investissement en recrutement et onboarding',
      },
      {
        key: 'training_budget',
        label: 'Budget formation',
        type: 'number',
        min: 0,
        max: 50000,
        step: 1000,
        default: 5000,
        unit: '€',
        description: 'Budget développement des compétences',
      },
      {
        key: 'salary_index',
        label: 'Niveau salarial',
        type: 'number',
        min: 80,
        max: 150,
        step: 5,
        default: 100,
        unit: '% marché',
        description: 'Rémunération vs. le marché (100% = médiane)',
      },
    ],
    kpis: [
      { key: 'employee_satisfaction', label: 'Satisfaction employés', unit: '/100', higher_is_better: true },
      { key: 'productivity_index', label: 'Productivité', unit: '%', higher_is_better: true },
      { key: 'turnover_rate', label: 'Taux de turnover', unit: '%', higher_is_better: false },
    ],
    ai_context:
      'HR tool manages workforce through recruitment budgets, training investment, and salary competitiveness. Impacts employee satisfaction, productivity, and turnover — all of which affect operating costs and output quality.',
  },
  {
    id: 'innovation',
    name: 'Innovation & R&D',
    icon: '🔬',
    description: 'Investissez en R&D pour améliorer vos produits et procédés',
    category: 'innovation',
    parameters: [
      {
        key: 'rd_budget',
        label: 'Budget R&D',
        type: 'number',
        min: 0,
        max: 150000,
        step: 5000,
        default: 10000,
        unit: '€',
        description: 'Investissement en recherche et développement',
      },
      {
        key: 'innovation_focus',
        label: 'Focus d\'innovation',
        type: 'select',
        default: 0,
        unit: '',
        description: 'Orientation de la R&D',
        options: [
          { value: 0, label: 'Produit (qualité/fonctionnalités)' },
          { value: 1, label: 'Procédé (efficacité/coûts)' },
          { value: 2, label: 'Business model' },
        ],
      },
    ],
    kpis: [
      { key: 'innovation_index', label: 'Index d\'innovation', unit: '/100', higher_is_better: true },
      { key: 'product_quality', label: 'Qualité produit', unit: '/100', higher_is_better: true },
      { key: 'rd_efficiency', label: 'Efficacité R&D', unit: '%', higher_is_better: true },
    ],
    ai_context:
      'Innovation tool drives R&D investment and focus. Cumulative R&D builds competitive advantages in quality, cost efficiency, or new market opportunities — with delayed but compounding returns.',
  },
  {
    id: 'crm',
    name: 'CRM & Relation Client',
    icon: '🤝',
    description: 'Gérez la fidélisation, le service client et l\'expérience d\'achat',
    category: 'marketing',
    parameters: [
      {
        key: 'loyalty_program',
        label: 'Programme de fidélité',
        type: 'number',
        min: 0,
        max: 50000,
        step: 1000,
        default: 0,
        unit: '€',
        description: 'Investissement en programme fidélité et récompenses',
      },
      {
        key: 'support_budget',
        label: 'Service après-vente',
        type: 'number',
        min: 0,
        max: 30000,
        step: 1000,
        default: 5000,
        unit: '€',
        description: 'Budget support client et SAV',
      },
    ],
    kpis: [
      { key: 'customer_satisfaction', label: 'Satisfaction client (CSAT)', unit: '/100', higher_is_better: true },
      { key: 'retention_rate', label: 'Taux de rétention', unit: '%', higher_is_better: true },
      { key: 'nps', label: 'Net Promoter Score', unit: '/100', higher_is_better: true },
    ],
    ai_context:
      'CRM tool manages customer loyalty and support. Improves retention, NPS, and lifetime value — reducing churn and increasing repeat purchases over time.',
  },
  {
    id: 'sustainability',
    name: 'Développement Durable',
    icon: '🌱',
    description: 'Gérez votre empreinte carbone et votre politique RSE',
    category: 'sustainability',
    parameters: [
      {
        key: 'green_investment',
        label: 'Investissement éco-responsable',
        type: 'number',
        min: 0,
        max: 100000,
        step: 2500,
        default: 0,
        unit: '€',
        description: 'Énergie verte, packaging durable, recyclage',
      },
      {
        key: 'carbon_reduction_plan',
        label: 'Plan de réduction CO₂',
        type: 'select',
        default: 0,
        unit: '',
        description: 'Ambition de décarbonation',
        options: [
          { value: 0, label: 'Aucun engagement' },
          { value: 1, label: 'Modéré (-10% / an)' },
          { value: 2, label: 'Ambitieux (-30% / an)' },
        ],
      },
    ],
    kpis: [
      { key: 'esg_score', label: 'Score ESG', unit: '/100', higher_is_better: true },
      { key: 'carbon_footprint', label: 'Empreinte carbone', unit: 'tCO₂', higher_is_better: false },
      { key: 'green_brand_index', label: 'Image verte', unit: '/100', higher_is_better: true },
    ],
    ai_context:
      'Sustainability tool manages environmental and social responsibility. ESG scores increasingly affect brand image, B2B contracts, and regulatory compliance. Green investment has delayed positive effects on customer perception.',
  },
  {
    id: 'digital',
    name: 'Transformation Digitale',
    icon: '💻',
    description: 'Développez votre e-commerce, le marketing digital et la data',
    category: 'digital',
    parameters: [
      {
        key: 'digital_marketing_budget',
        label: 'Marketing digital',
        type: 'number',
        min: 0,
        max: 80000,
        step: 2000,
        default: 5000,
        unit: '€',
        description: 'SEO, SEA, réseaux sociaux, emailings',
      },
      {
        key: 'it_modernisation',
        label: 'Modernisation IT',
        type: 'number',
        min: 0,
        max: 150000,
        step: 5000,
        default: 0,
        unit: '€',
        description: 'ERP, e-commerce, data analytics, automatisation',
      },
    ],
    kpis: [
      { key: 'digital_revenue_share', label: 'Part du CA digital', unit: '%', higher_is_better: true },
      { key: 'digital_maturity', label: 'Maturité digitale', unit: '/100', higher_is_better: true },
      { key: 'conversion_rate', label: 'Taux de conversion', unit: '%', higher_is_better: true },
    ],
    ai_context:
      'Digital transformation tool manages online presence, digital marketing ROI, and IT modernization. Opens new revenue channels and improves operational efficiency through automation.',
  },
  {
    id: 'risk_management',
    name: 'Gestion des Risques',
    icon: '🛡️',
    description: 'Anticipez les aléas et protégez l\'entreprise contre les crises',
    category: 'strategy',
    parameters: [
      {
        key: 'insurance_budget',
        label: 'Budget assurances',
        type: 'number',
        min: 0,
        max: 30000,
        step: 1000,
        default: 2000,
        unit: '€',
        description: 'Couverture assurantielle multi-risques',
      },
      {
        key: 'crisis_reserve',
        label: 'Provision de crise',
        type: 'number',
        min: 0,
        max: 300000,
        step: 10000,
        default: 0,
        unit: '€',
        description: 'Trésorerie de précaution (immobilisée)',
      },
    ],
    kpis: [
      { key: 'risk_exposure', label: 'Exposition aux risques', unit: '/100', higher_is_better: false },
      { key: 'resilience_index', label: 'Indice de résilience', unit: '/100', higher_is_better: true },
    ],
    ai_context:
      'Risk management tool helps teams anticipate and buffer against scenario events (crises, disruptions). Well-insured and reserved teams absorb shocks better but reduce short-term profitability.',
  },
]

export const TOOL_CATEGORIES: Record<ToolCategory, { label: string; color: string }> = {
  marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  finance: { label: 'Finance', color: 'bg-green-100 text-green-700 border-green-200' },
  operations: { label: 'Opérations', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  hr: { label: 'Ressources Humaines', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  innovation: { label: 'Innovation', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  strategy: { label: 'Stratégie', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  sustainability: { label: 'Durabilité', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  digital: { label: 'Digital', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
}

export function getToolById(id: string): GameTool | undefined {
  return TOOLS_CATALOG.find((t) => t.id === id)
}

export function getToolsByIds(ids: string[]): GameTool[] {
  return ids.map((id) => getToolById(id)).filter(Boolean) as GameTool[]
}
