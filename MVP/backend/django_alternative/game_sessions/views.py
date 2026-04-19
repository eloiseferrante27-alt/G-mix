from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from gmix.permissions import IsStaffProfile
from .models import GameSession, Team, TeamMember, Turn
from .serializers import (
    GameSessionSerializer, GameSessionWriteSerializer,
    TeamSerializer, TurnSerializer,
)


class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.profile.organization
        qs = GameSession.objects.filter(organization=org).select_related('scenario', 'formateur')
        return Response(GameSessionSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.profile.role not in ('admin', 'organisme', 'formateur'):
            return Response({'error': 'Forbidden'}, status=403)
        profile = request.user.profile
        s = GameSessionWriteSerializer(data={
            **request.data,
            'formateur': request.data.get('formateur') or profile.pk,
            'organization': str(profile.organization.pk) if profile.organization else None,
        })
        s.is_valid(raise_exception=True)
        session = s.save()
        return Response(GameSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class SessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return GameSession.objects.select_related('scenario').prefetch_related('teams__members').get(pk=pk)
        except GameSession.DoesNotExist:
            return None

    def get(self, request, pk):
        session = self._get(pk)
        if not session:
            return Response({'error': 'Not found'}, status=404)
        return Response(GameSessionSerializer(session).data)

    def patch(self, request, pk):
        session = self._get(pk)
        if not session:
            return Response({'error': 'Not found'}, status=404)
        profile = request.user.profile
        if session.formateur != profile and profile.role not in ('admin', 'organisme'):
            return Response({'error': 'Forbidden'}, status=403)
        s = GameSessionWriteSerializer(session, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(GameSessionSerializer(session).data)


class SessionStartView(APIView):
    permission_classes = [IsStaffProfile]

    def post(self, request, pk):
        try:
            session = GameSession.objects.get(pk=pk)
        except GameSession.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        session.status = 'active'
        session.started_at = timezone.now()
        session.current_turn = 1
        session.save()

        Turn.objects.get_or_create(
            session=session,
            turn_number=1,
            defaults={'status': 'open', 'started_at': timezone.now()},
        )
        return Response(GameSessionSerializer(session).data)


class SessionTeamsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        teams = Team.objects.filter(session_id=pk).prefetch_related('members__user__user')
        return Response(TeamSerializer(teams, many=True).data)

    def post(self, request, pk):
        if request.user.profile.role not in ('admin', 'organisme', 'formateur'):
            return Response({'error': 'Forbidden'}, status=403)
        try:
            session = GameSession.objects.get(pk=pk)
        except GameSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)
        team = Team.objects.create(
            session=session,
            name=request.data.get('name', 'Équipe'),
            color=request.data.get('color', '#3B82F6'),
        )
        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)


class SessionTurnsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        turns = Turn.objects.filter(session_id=pk).order_by('turn_number')
        return Response(TurnSerializer(turns, many=True).data)

    def post(self, request, pk):
        if request.user.profile.role not in ('admin', 'organisme', 'formateur'):
            return Response({'error': 'Forbidden'}, status=403)
        try:
            session = GameSession.objects.get(pk=pk)
        except GameSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)
        s = TurnSerializer(data={**request.data, 'session_id': str(session.pk)})
        s.is_valid(raise_exception=True)
        turn = s.save(session=session)
        return Response(TurnSerializer(turn).data, status=status.HTTP_201_CREATED)
