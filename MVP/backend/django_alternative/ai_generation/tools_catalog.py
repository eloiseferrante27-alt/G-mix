TOOLS_CATALOG = [
    {
        "id": "pricing", "name": "Stratégie Pricing", "category": "strategy",
        "ai_context": "Players control selling price and pricing strategy (penetration/value/premium). Directly affects demand elasticity, margin, and competitive positioning.",
        "parameters": [
            {"key": "selling_price", "label": "Prix de vente unitaire", "type": "number", "min": 10, "max": 1000, "step": 5, "default": 100, "unit": "€", "description": "Prix proposé aux clients par unité"},
            {"key": "pricing_strategy", "label": "Stratégie tarifaire", "type": "select", "default": 1, "unit": "", "description": "Approche de positionnement prix", "options": [{"value": 0, "label": "Pénétration marché"}, {"value": 1, "label": "Valeur perçue"}, {"value": 2, "label": "Premium"}]},
        ],
        "kpis": [
            {"key": "margin_rate", "label": "Taux de marge brute", "unit": "%", "higher_is_better": True},
            {"key": "price_competitiveness", "label": "Compétitivité prix", "unit": "/100", "higher_is_better": True},
        ],
    },
    {
        "id": "marketing_mix", "name": "Marketing Mix", "category": "marketing",
        "ai_context": "Controls advertising spend and promotional discounts. Increases demand and brand visibility but reduces margins when discounting.",
        "parameters": [
            {"key": "advertising_budget", "label": "Budget publicitaire", "type": "number", "min": 0, "max": 100000, "step": 2500, "default": 10000, "unit": "€", "description": "Investissement en publicité (TV, digital, print)"},
            {"key": "promotion_discount", "label": "Remise promotionnelle", "type": "number", "min": 0, "max": 40, "step": 5, "default": 0, "unit": "%", "description": "Réduction temporaire sur le prix catalogue"},
        ],
        "kpis": [
            {"key": "brand_awareness", "label": "Notoriété de marque", "unit": "/100", "higher_is_better": True},
            {"key": "customer_acquisition", "label": "Nouveaux clients", "unit": "clients", "higher_is_better": True},
        ],
    },
    {
        "id": "supply_chain", "name": "Chaîne d'approvisionnement", "category": "operations",
        "ai_context": "Manages production volume and supplier relationships. Affects inventory, delivery reliability, COGS, and customer satisfaction.",
        "parameters": [
            {"key": "production_volume", "label": "Volume de production", "type": "number", "min": 100, "max": 10000, "step": 100, "default": 1000, "unit": "unités", "description": "Nombre d'unités à produire ce trimestre"},
            {"key": "supplier_tier", "label": "Qualité fournisseur", "type": "select", "default": 1, "unit": "", "description": "Niveau de partenariat fournisseur", "options": [{"value": 0, "label": "Bas coût (risque élevé)"}, {"value": 1, "label": "Standard"}, {"value": 2, "label": "Premium (fiable)"}]},
        ],
        "kpis": [
            {"key": "inventory_level", "label": "Niveau de stock", "unit": "unités", "higher_is_better": False},
            {"key": "supply_reliability", "label": "Fiabilité livraison", "unit": "%", "higher_is_better": True},
            {"key": "service_rate", "label": "Taux de service", "unit": "%", "higher_is_better": True},
        ],
    },
    {
        "id": "finance", "name": "Finance & Trésorerie", "category": "finance",
        "ai_context": "Controls borrowing and capital investment. Enables growth but increases financial risk through debt and interest costs.",
        "parameters": [
            {"key": "loan_amount", "label": "Emprunt bancaire", "type": "number", "min": 0, "max": 500000, "step": 10000, "default": 0, "unit": "€", "description": "Capital emprunté (taux d'intérêt appliqué)"},
            {"key": "capex_investment", "label": "Investissement CAPEX", "type": "number", "min": 0, "max": 200000, "step": 5000, "default": 0, "unit": "€", "description": "Investissements en équipements et infrastructure"},
        ],
        "kpis": [
            {"key": "cash_flow", "label": "Cash flow net", "unit": "€", "higher_is_better": True},
            {"key": "debt_ratio", "label": "Ratio d'endettement", "unit": "%", "higher_is_better": False},
            {"key": "roi", "label": "Retour sur investissement", "unit": "%", "higher_is_better": True},
        ],
    },
    {
        "id": "hr", "name": "RH & Capital Humain", "category": "hr",
        "ai_context": "Manages workforce through recruitment, training, and salary competitiveness. Impacts satisfaction, productivity, and turnover.",
        "parameters": [
            {"key": "hiring_budget", "label": "Budget recrutement", "type": "number", "min": 0, "max": 100000, "step": 2500, "default": 10000, "unit": "€", "description": "Investissement en recrutement et onboarding"},
            {"key": "training_budget", "label": "Budget formation", "type": "number", "min": 0, "max": 50000, "step": 1000, "default": 5000, "unit": "€", "description": "Budget développement des compétences"},
            {"key": "salary_index", "label": "Niveau salarial", "type": "number", "min": 80, "max": 150, "step": 5, "default": 100, "unit": "% marché", "description": "Rémunération vs. le marché (100% = médiane)"},
        ],
        "kpis": [
            {"key": "employee_satisfaction", "label": "Satisfaction employés", "unit": "/100", "higher_is_better": True},
            {"key": "productivity_index", "label": "Productivité", "unit": "%", "higher_is_better": True},
            {"key": "turnover_rate", "label": "Taux de turnover", "unit": "%", "higher_is_better": False},
        ],
    },
    {
        "id": "innovation", "name": "Innovation & R&D", "category": "innovation",
        "ai_context": "Drives R&D investment and focus. Cumulative R&D builds competitive advantages in quality, cost efficiency, or new market opportunities.",
        "parameters": [
            {"key": "rd_budget", "label": "Budget R&D", "type": "number", "min": 0, "max": 150000, "step": 5000, "default": 10000, "unit": "€", "description": "Investissement en recherche et développement"},
            {"key": "innovation_focus", "label": "Focus d'innovation", "type": "select", "default": 0, "unit": "", "description": "Orientation de la R&D", "options": [{"value": 0, "label": "Produit"}, {"value": 1, "label": "Procédé"}, {"value": 2, "label": "Business model"}]},
        ],
        "kpis": [
            {"key": "innovation_index", "label": "Index d'innovation", "unit": "/100", "higher_is_better": True},
            {"key": "product_quality", "label": "Qualité produit", "unit": "/100", "higher_is_better": True},
            {"key": "rd_efficiency", "label": "Efficacité R&D", "unit": "%", "higher_is_better": True},
        ],
    },
    {
        "id": "crm", "name": "CRM & Relation Client", "category": "marketing",
        "ai_context": "Manages customer loyalty and support. Improves retention, NPS, and lifetime value.",
        "parameters": [
            {"key": "loyalty_program", "label": "Programme de fidélité", "type": "number", "min": 0, "max": 50000, "step": 1000, "default": 0, "unit": "€", "description": "Investissement en programme fidélité"},
            {"key": "support_budget", "label": "Service après-vente", "type": "number", "min": 0, "max": 30000, "step": 1000, "default": 5000, "unit": "€", "description": "Budget support client et SAV"},
        ],
        "kpis": [
            {"key": "customer_satisfaction", "label": "Satisfaction client (CSAT)", "unit": "/100", "higher_is_better": True},
            {"key": "retention_rate", "label": "Taux de rétention", "unit": "%", "higher_is_better": True},
            {"key": "nps", "label": "Net Promoter Score", "unit": "/100", "higher_is_better": True},
        ],
    },
    {
        "id": "sustainability", "name": "Développement Durable", "category": "sustainability",
        "ai_context": "Manages environmental and social responsibility. ESG scores affect brand image, B2B contracts, and regulatory compliance.",
        "parameters": [
            {"key": "green_investment", "label": "Investissement éco-responsable", "type": "number", "min": 0, "max": 100000, "step": 2500, "default": 0, "unit": "€", "description": "Énergie verte, packaging durable, recyclage"},
            {"key": "carbon_reduction_plan", "label": "Plan de réduction CO₂", "type": "select", "default": 0, "unit": "", "description": "Ambition de décarbonation", "options": [{"value": 0, "label": "Aucun engagement"}, {"value": 1, "label": "Modéré (-10%/an)"}, {"value": 2, "label": "Ambitieux (-30%/an)"}]},
        ],
        "kpis": [
            {"key": "esg_score", "label": "Score ESG", "unit": "/100", "higher_is_better": True},
            {"key": "carbon_footprint", "label": "Empreinte carbone", "unit": "tCO₂", "higher_is_better": False},
            {"key": "green_brand_index", "label": "Image verte", "unit": "/100", "higher_is_better": True},
        ],
    },
    {
        "id": "digital", "name": "Transformation Digitale", "category": "digital",
        "ai_context": "Manages online presence, digital marketing ROI, and IT modernization. Opens new revenue channels and improves operational efficiency.",
        "parameters": [
            {"key": "digital_marketing_budget", "label": "Marketing digital", "type": "number", "min": 0, "max": 80000, "step": 2000, "default": 5000, "unit": "€", "description": "SEO, SEA, réseaux sociaux, emailings"},
            {"key": "it_modernisation", "label": "Modernisation IT", "type": "number", "min": 0, "max": 150000, "step": 5000, "default": 0, "unit": "€", "description": "ERP, e-commerce, data analytics, automatisation"},
        ],
        "kpis": [
            {"key": "digital_revenue_share", "label": "Part du CA digital", "unit": "%", "higher_is_better": True},
            {"key": "digital_maturity", "label": "Maturité digitale", "unit": "/100", "higher_is_better": True},
            {"key": "conversion_rate", "label": "Taux de conversion", "unit": "%", "higher_is_better": True},
        ],
    },
    {
        "id": "risk_management", "name": "Gestion des Risques", "category": "strategy",
        "ai_context": "Helps teams anticipate and buffer against scenario events. Well-insured and reserved teams absorb shocks better but reduce short-term profitability.",
        "parameters": [
            {"key": "insurance_budget", "label": "Budget assurances", "type": "number", "min": 0, "max": 30000, "step": 1000, "default": 2000, "unit": "€", "description": "Couverture assurantielle multi-risques"},
            {"key": "crisis_reserve", "label": "Provision de crise", "type": "number", "min": 0, "max": 300000, "step": 10000, "default": 0, "unit": "€", "description": "Trésorerie de précaution (immobilisée)"},
        ],
        "kpis": [
            {"key": "risk_exposure", "label": "Exposition aux risques", "unit": "/100", "higher_is_better": False},
            {"key": "resilience_index", "label": "Indice de résilience", "unit": "/100", "higher_is_better": True},
        ],
    },
]

TOOLS_BY_ID = {t["id"]: t for t in TOOLS_CATALOG}


def get_tools_by_ids(ids: list[str]) -> list[dict]:
    return [TOOLS_BY_ID[i] for i in ids if i in TOOLS_BY_ID]
