from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from gmix.permissions import IsAdminOrFormateur
from game_sessions.models import GameSession, Turn
from .models import Decision, TurnResult
from .serializers import DecisionSerializer, TurnResultSerializer
from .engine import calculate_round


class SubmitDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        turn_id = request.data.get('turn_id')
        team_id = request.data.get('team_id')
        decision_data = request.data.get('data', {})

        try:
            turn = Turn.objects.get(pk=turn_id, status='open')
        except Turn.DoesNotExist:
            return Response({'error': "Ce tour n'est pas ouvert"}, status=400)

        from game_sessions.models import Team, TeamMember
        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            return Response({'error': 'Équipe introuvable'}, status=400)

        is_member = TeamMember.objects.filter(team=team, user=profile).exists()
        if not is_member and profile.role not in ('admin', 'formateur'):
            return Response({'error': "Vous n'êtes pas membre de cette équipe"}, status=403)

        decision, _ = Decision.objects.update_or_create(
            turn=turn, team=team,
            defaults={'user': profile, 'data': decision_data},
        )
        return Response(DecisionSerializer(decision).data, status=201)


class CalculateResultsView(APIView):
    permission_classes = [IsAdminOrFormateur]

    def post(self, request):
        turn_id = request.data.get('turn_id')
        session_id = request.data.get('session_id')

        try:
            turn = Turn.objects.prefetch_related('decisions__team').get(pk=turn_id)
            session = GameSession.objects.get(pk=session_id)
        except (Turn.DoesNotExist, GameSession.DoesNotExist):
            return Response({'error': 'Tour ou session introuvable'}, status=404)

        decisions_qs = list(turn.decisions.select_related('team').all())
        if not decisions_qs:
            return Response({'error': 'Aucune décision soumise'}, status=400)

        # Gather previous inventory and cumulative R&D per team
        prev_turn = (
            Turn.objects.filter(session=session, status='closed')
            .order_by('-turn_number')
            .first()
        )
        prev_inventory: dict[str, int] = {}
        cumulative_rd: dict[str, float] = {}

        if prev_turn:
            for res in TurnResult.objects.filter(turn=prev_turn):
                tid = str(res.team_id)
                prev_inventory[tid] = res.kpis.get('inventory', 0)
                cumulative_rd[tid] = res.kpis.get('rd_cost', 0)

        team_decisions = [
            {
                'team_id': str(d.team_id),
                'data': d.data,
                'previous_inventory': prev_inventory.get(str(d.team_id), 0),
                'cumulative_rd_spend': cumulative_rd.get(str(d.team_id), 0),
            }
            for d in decisions_qs
        ]

        results = calculate_round(team_decisions)

        # Persist results
        saved = []
        for r in results:
            from game_sessions.models import Team
            team = Team.objects.get(pk=r['team_id'])
            obj, _ = TurnResult.objects.update_or_create(
                turn=turn, team=team,
                defaults={'kpis': r['kpis'], 'score': r['score']},
            )
            saved.append(obj)

        # Close turn, advance session
        turn.status = 'closed'
        turn.ended_at = timezone.now()
        turn.save()

        session.current_turn = turn.turn_number
        if turn.turn_number >= session.total_turns:
            session.status = 'completed'
            session.ended_at = timezone.now()
        else:
            Turn.objects.get_or_create(
                session=session,
                turn_number=turn.turn_number + 1,
                defaults={'status': 'open', 'started_at': timezone.now()},
            )
        session.save()

        return Response(TurnResultSerializer(saved, many=True).data)
