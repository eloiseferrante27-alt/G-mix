"""
Supply-chain business game engine.
Pure Python — no Django imports. All DB interaction is in views.py.
"""

BASE_DEMAND = 1000
REFERENCE_PRICE = 80
UNIT_COST = 25
HOLDING_COST = 2
ELASTICITY = 1.5
MAX_MARKETING_BONUS = 0.5
MAX_MARKETING_SPEND = 50_000


def _demand(data: dict) -> float:
    price = data.get('selling_price', REFERENCE_PRICE) or REFERENCE_PRICE
    price_factor = min(3.0, max(0.2, (REFERENCE_PRICE / price) ** ELASTICITY))
    marketing = data.get('marketing_budget', data.get('advertising_budget', 0)) or 0
    marketing_factor = 1 + (min(marketing, MAX_MARKETING_SPEND) / MAX_MARKETING_SPEND) * MAX_MARKETING_BONUS
    return BASE_DEMAND * price_factor * marketing_factor


def calculate_round(team_decisions: list[dict]) -> list[dict]:
    """
    Each element of team_decisions:
        team_id, data (decision dict), previous_inventory, cumulative_rd_spend

    Returns list of:
        team_id, kpis (dict), score (float)
    """
    demands = [_demand(d['data']) for d in team_decisions]
    total_demand = sum(demands)

    results = []
    for decision, market_demand in zip(team_decisions, demands):
        data = decision['data']
        prev_inv = decision.get('previous_inventory', 0) or 0
        cumulative_rd = decision.get('cumulative_rd_spend', 0) or 0

        production = data.get('production_volume', 0) or 0
        selling_price = data.get('selling_price', REFERENCE_PRICE) or REFERENCE_PRICE
        marketing_cost = data.get('marketing_budget', data.get('advertising_budget', 0)) or 0
        rd_cost = data.get('rd_budget', 0) or 0

        available = prev_inv + production
        actual_sales = min(market_demand, available)
        revenue = actual_sales * selling_price
        cogs = production * UNIT_COST
        gross_profit = revenue - cogs
        operating_profit = gross_profit - marketing_cost - rd_cost
        end_inventory = max(0, available - actual_sales)
        inventory_cost = end_inventory * HOLDING_COST
        net_profit = operating_profit - inventory_cost

        market_share = actual_sales / total_demand if total_demand > 0 else 0
        delivery_rate = min(1.0, actual_sales / market_demand) if market_demand > 0 else 1.0
        quality_bonus = min(0.3, (cumulative_rd / 100_000) * 0.3)
        customer_satisfaction = (
            delivery_rate * 0.5
            + (1 - selling_price / 200) * 0.3
            + quality_bonus * 0.2
        )

        score = round(net_profit / 1000 + market_share * 50 + customer_satisfaction * 10, 1)

        results.append({
            'team_id': decision['team_id'],
            'kpis': {
                'market_demand': round(market_demand),
                'actual_sales': round(actual_sales),
                'revenue': round(revenue),
                'cogs': round(cogs),
                'gross_profit': round(gross_profit),
                'marketing_cost': round(marketing_cost),
                'rd_cost': round(rd_cost),
                'operating_profit': round(operating_profit),
                'inventory': round(end_inventory),
                'inventory_cost': round(inventory_cost),
                'net_profit': round(net_profit),
                'market_share': round(market_share, 3),
                'customer_satisfaction': round(customer_satisfaction, 2),
                'score': score,
            },
            'score': score,
        })

    return results
