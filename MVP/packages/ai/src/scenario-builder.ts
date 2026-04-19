import Anthropic from '@anthropic-ai/sdk'
import { TOOLS_CATALOG, getToolsByIds } from '@gmix/shared'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ScenarioBuildRequest {
  industry: string
  difficulty: string
  total_turns: number
  game_mode: string
  selected_tools: string[]
  custom_prompt?: string | null
  language?: string
}

export async function buildScenario(req: ScenarioBuildRequest): Promise<Record<string, unknown>> {
  const { industry, difficulty, total_turns, game_mode, selected_tools, custom_prompt, language = 'fr' } = req

  const selectedToolObjects = getToolsByIds(
    selected_tools.length > 0 ? selected_tools : TOOLS_CATALOG.map((t) => t.id).slice(0, 3)
  )

  const toolsContext = selectedToolObjects
    .map((tool) => {
      const params = tool.parameters
        .map((p) => `    - ${p.label} (${p.key}): ${p.description}. Plage: ${p.min ?? 'N/A'}–${p.max ?? 'N/A'} ${p.unit}`)
        .join('\n')
      const kpis = tool.kpis.map((k) => `    - ${k.label} (${k.key})`).join('\n')
      return `  OUTIL: ${tool.name} [${tool.id}]
  Contexte IA: ${tool.ai_context}
  Paramètres:
${params}
  KPIs:
${kpis}`
    })
    .join('\n\n')

  const systemPrompt = `Tu es un expert en business games, simulations de gestion d'entreprise et pédagogie expérientielle.
Tu génères des scénarios de business game réalistes, pédagogiques et engageants, adaptés aux outils sélectionnés.
IMPORTANT: Tu réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte autour, sans \`\`\`json.`

  const parametersTemplate = selectedToolObjects
    .flatMap((t) =>
      t.parameters.map(
        (p) =>
          `{"key":"${p.key}","label":"${p.label}","type":"${p.type}","min":${p.min ?? 0},"max":${p.max ?? 100},"step":${p.step ?? 1},"default":${p.default},"unit":"${p.unit}","description":"${p.description}","tool_id":"${t.id}"${p.options ? `,"options":${JSON.stringify(p.options)}` : ''}}`
      )
    )
    .join(',')

  const kpisTemplate = selectedToolObjects
    .flatMap((t) => t.kpis)
    .map((k) => `{"key":"${k.key}","label":"${k.label}","unit":"${k.unit}","higher_is_better":${k.higher_is_better}}`)
    .join(',')

  const basePrompt = `Génère un scénario de business game avec ces paramètres:
- Industrie: ${industry}
- Difficulté: ${difficulty}
- Nombre de tours: ${total_turns} trimestres
- Mode: ${game_mode}
- Langue de sortie: ${language}

OUTILS SÉLECTIONNÉS (construis le scénario autour de ces outils):
${toolsContext}

CONTRAINTES:
1. Les "parameters" doivent correspondre EXACTEMENT aux outils sélectionnés, adaptés à l'industrie "${industry}"
2. Adapte min/max/default au réalisme de l'industrie
3. Les "kpis" doivent inclure les KPIs de tous les outils
4. Les événements doivent être cohérents avec l'industrie et la difficulté
5. Le contexte narratif doit être immersif et spécifique

JSON attendu (sans texte autour):
{
  "name": "Nom accrocheur du scénario",
  "description": "Description courte (2-3 phrases)",
  "industry": "${industry}",
  "difficulty": "${difficulty}",
  "game_mode": "${game_mode}",
  "context": "Contexte narratif immersif de 6-10 phrases, spécifique à l'industrie ${industry}",
  "learning_objectives": ["objectif 1", "objectif 2", "objectif 3", "objectif 4"],
  "tags": ["tag1", "tag2", "tag3"],
  "total_turns": ${total_turns},
  "config": {
    "total_turns": ${total_turns},
    "max_teams": 6,
    "min_teams": 2,
    "context": "Résumé court pour les joueurs (2-3 phrases)",
    "kpis": [${kpisTemplate}],
    "parameters": [${parametersTemplate}],
    "events": [
      {"turn": 2, "title": "Titre événement", "description": "Événement impactant pour ${industry}", "impact": "Impact sur KPIs et décisions"},
      {"turn": ${Math.ceil(total_turns / 2)}, "title": "Événement mi-parcours", "description": "Défi ou opportunité significatif", "impact": "Impact stratégique"},
      {"turn": ${total_turns - 1}, "title": "Événement final", "description": "Défi de fin de simulation", "impact": "Impact sur le classement"}
    ]
  },
  "learning_resources": [
    {"title": "Concept clé", "content": "Explication liée aux outils sélectionnés", "type": "concept", "turn_number": 1},
    {"title": "Conseil stratégique", "content": "Conseil pratique pour l'industrie ${industry}", "type": "tip", "turn_number": 2},
    {"title": "Point d'attention", "content": "Risque à surveiller dans ce scénario", "type": "warning", "turn_number": ${Math.ceil(total_turns / 2)}}
  ]
}`

  const finalPrompt = custom_prompt
    ? `${basePrompt}\n\nCONTEXTE ADDITIONNEL:\n${custom_prompt}`
    : basePrompt

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{ role: 'user', content: finalPrompt }],
  })

  const text = (message.content[0] as { type: string; text: string }).text
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  return JSON.parse(cleaned)
}
