import type { DecisionData, KPIData } from '@gmix/shared'

const BASE_DEMAND = 1000
const REFERENCE_PRICE = 80
const UNIT_COST = 25
const HOLDING_COST = 2
const ELASTICITY = 1.5
const MAX_MARKETING_BONUS = 0.5
const MAX_MARKETING_SPEND = 50000

export interface TeamDecision {
  teamId: string
  data: DecisionData
  previousInventory: number
  cumulativeRdSpend: number
}

export interface TeamResult {
  teamId: string
  kpis: KPIData
  score: number
}

export function calculateRound(decisions: TeamDecision[]): TeamResult[] {
  const demands = decisions.map((d) => calculateDemand(d))
  const totalDemand = demands.reduce((sum, d) => sum + d, 0)

  return decisions.map((d, i) => {
    const marketDemand = demands[i]
    const availableStock = d.previousInventory + d.data.production_volume
    const actualSales = Math.min(marketDemand, availableStock)

    const revenue = actualSales * d.data.selling_price
    const cogs = d.data.production_volume * UNIT_COST
    const grossProfit = revenue - cogs
    const marketingCost = d.data.marketing_budget ?? d.data.advertising_budget ?? 0
    const rdCost = d.data.rd_budget ?? 0
    const operatingProfit = grossProfit - marketingCost - rdCost

    const endInventory = Math.max(0, availableStock - actualSales)
    const inventoryCost = endInventory * HOLDING_COST
    const netProfit = operatingProfit - inventoryCost

    const marketShare = totalDemand > 0 ? actualSales / totalDemand : 0
    const deliveryRate = marketDemand > 0 ? Math.min(1, actualSales / marketDemand) : 1
    const qualityBonus = Math.min(0.3, (d.cumulativeRdSpend / 100000) * 0.3)
    const customerSatisfaction =
      deliveryRate * 0.5 + (1 - d.data.selling_price / 200) * 0.3 + qualityBonus * 0.2

    const score = netProfit / 1000 + marketShare * 50 + customerSatisfaction * 10

    const kpis: KPIData = {
      market_demand: Math.round(marketDemand),
      actual_sales: Math.round(actualSales),
      revenue: Math.round(revenue),
      cogs: Math.round(cogs),
      gross_profit: Math.round(grossProfit),
      marketing_cost: Math.round(marketingCost),
      rd_cost: Math.round(rdCost),
      operating_profit: Math.round(operatingProfit),
      inventory: Math.round(endInventory),
      inventory_cost: Math.round(inventoryCost),
      net_profit: Math.round(netProfit),
      market_share: Math.round(marketShare * 1000) / 1000,
      customer_satisfaction: Math.round(customerSatisfaction * 100) / 100,
      score: Math.round(score * 10) / 10,
    }

    return { teamId: d.teamId, kpis, score: Math.round(score * 10) / 10 }
  })
}

function calculateDemand(d: TeamDecision): number {
  const priceFactor = Math.pow(REFERENCE_PRICE / d.data.selling_price, ELASTICITY)
  const clampedPriceFactor = Math.min(3.0, Math.max(0.2, priceFactor))
  const marketingSpend = d.data.marketing_budget ?? d.data.advertising_budget ?? 0
  const marketingFactor =
    1 + (Math.min(marketingSpend, MAX_MARKETING_SPEND) / MAX_MARKETING_SPEND) * MAX_MARKETING_BONUS
  return BASE_DEMAND * clampedPriceFactor * marketingFactor
}
