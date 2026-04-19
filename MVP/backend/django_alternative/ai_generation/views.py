import json
import math
import anthropic
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from gmix.permissions import IsAdminOrFormateur
from .tools_catalog import TOOLS_CATALOG, get_tools_by_ids


class GenerateScenarioView(APIView):
    permission_classes = [IsAdminOrFormateur]

    def post(self, request):
        profile = request.user.profile

        if profile.role == 'formateur':
            org = profile.organization
            if not org or not org.ai_generation_enabled:
                return Response(
                    {'error': 'La génération IA nécessite un abonnement Pro ou Entreprise.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        selected_ids = request.data.get('selected_tools', [])
        if not selected_ids:
            return Response({'error': 'Sélectionnez au moins un outil'}, status=400)

        try:
            scenario = _build_scenario(
                industry=request.data.get('industry', 'manufacturing'),
                difficulty=request.data.get('difficulty', 'medium'),
                total_turns=int(request.data.get('total_turns', 6)),
                game_mode=request.data.get('game_mode', 'team'),
                selected_tools=selected_ids,
                custom_prompt=request.data.get('custom_prompt'),
                language=request.data.get('language', 'fr'),
            )
            return Response({'scenario': scenario})
        except Exception as exc:
            return Response({'error': str(exc)}, status=500)


def _build_scenario(*, industry, difficulty, total_turns, game_mode,
                    selected_tools, custom_prompt=None, language='fr'):
    tools = get_tools_by_ids(selected_tools) or TOOLS_CATALOG[:3]

    tools_context = '\n\n'.join(
        "  OUTIL: {name} [{id}]\n"
        "  Contexte IA: {ai_context}\n"
        "  Paramètres:\n{params}\n"
        "  KPIs:\n{kpis}".format(
            name=t['name'], id=t['id'], ai_context=t['ai_context'],
            params='\n'.join(
                f"    - {p['label']} ({p['key']}): {p['description']}. "
                f"Plage: {p.get('min', 'N/A')}–{p.get('max', 'N/A')} {p['unit']}"
                for p in t['parameters']
            ),
            kpis='\n'.join(f"    - {k['label']} ({k['key']})" for k in t['kpis']),
        )
        for t in tools
    )

    params_tpl = ','.join(
        json.dumps({
            'key': p['key'], 'label': p['label'], 'type': p['type'],
            'min': p.get('min', 0), 'max': p.get('max', 100),
            'step': p.get('step', 1), 'default': p['default'],
            'unit': p['unit'], 'description': p['description'], 'tool_id': t['id'],
            **({'options': p['options']} if 'options' in p else {}),
        }, ensure_ascii=False)
        for t in tools for p in t['parameters']
    )

    kpis_tpl = ','.join(
        json.dumps({'key': k['key'], 'label': k['label'],
                    'unit': k['unit'], 'higher_is_better': k['higher_is_better']},
                   ensure_ascii=False)
        for t in tools for k in t['kpis']
    )

    mid = math.ceil(total_turns / 2)

    system_prompt = (
        "Tu es un expert en business games et pédagogie expérientielle. "
        "Tu génères des scénarios de business game réalistes et engageants. "
        "IMPORTANT: Tu réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte autour."
    )

    prompt = f"""Génère un scénario de business game avec ces paramètres:
- Industrie: {industry}
- Difficulté: {difficulty}
- Nombre de tours: {total_turns} trimestres
- Mode: {game_mode}
- Langue de sortie: {language}

OUTILS SÉLECTIONNÉS:
{tools_context}

JSON attendu (sans texte autour):
{{
  "name": "Nom accrocheur",
  "description": "Description courte (2-3 phrases)",
  "industry": "{industry}", "difficulty": "{difficulty}", "game_mode": "{game_mode}",
  "context": "Contexte narratif immersif 6-10 phrases, spécifique à {industry}",
  "learning_objectives": ["obj1","obj2","obj3","obj4"],
  "tags": ["tag1","tag2","tag3"],
  "total_turns": {total_turns},
  "config": {{
    "total_turns": {total_turns}, "max_teams": 6, "min_teams": 2,
    "context": "Résumé court pour les joueurs",
    "kpis": [{kpis_tpl}],
    "parameters": [{params_tpl}],
    "events": [
      {{"turn": 2, "title": "Événement initial", "description": "Impact pour {industry}", "impact": "Impact KPIs"}},
      {{"turn": {mid}, "title": "Mi-parcours", "description": "Défi significatif", "impact": "Impact stratégique"}},
      {{"turn": {total_turns - 1}, "title": "Événement final", "description": "Défi de fin", "impact": "Impact classement"}}
    ]
  }},
  "learning_resources": [
    {{"title": "Concept clé", "content": "Explication", "type": "concept", "turn_number": 1}},
    {{"title": "Conseil", "content": "Conseil pratique pour {industry}", "type": "tip", "turn_number": 2}},
    {{"title": "Attention", "content": "Risque à surveiller", "type": "warning", "turn_number": {mid}}}
  ]
}}"""

    if custom_prompt:
        prompt += f"\n\nCONTEXTE ADDITIONNEL:\n{custom_prompt}"

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=6000,
        system=system_prompt,
        messages=[{'role': 'user', 'content': prompt}],
    )

    text = message.content[0].text.strip()
    cleaned = text.lstrip('```json').lstrip('```').rstrip('```').strip()
    return json.loads(cleaned)
