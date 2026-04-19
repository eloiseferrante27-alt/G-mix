from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from gmix.permissions import IsAdminOrFormateur
from .models import Scenario
from .serializers import ScenarioSerializer, ScenarioWriteSerializer


class ScenarioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        qs = (
            Scenario.objects.filter(organization=profile.organization)
            | Scenario.objects.filter(is_template=True)
        ).distinct()
        return Response(ScenarioSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.profile.role not in ('admin', 'formateur'):
            return Response({'error': 'Forbidden'}, status=403)

        profile = request.user.profile
        s = ScenarioWriteSerializer(data={
            **request.data,
            'created_by': profile.pk,
            'organization': str(profile.organization.pk) if profile.organization else None,
        })
        s.is_valid(raise_exception=True)
        scenario = s.save()
        return Response(ScenarioSerializer(scenario).data, status=status.HTTP_201_CREATED)


class ScenarioDetailView(APIView):
    permission_classes = [IsAdminOrFormateur]

    def _get(self, pk, profile):
        try:
            scenario = Scenario.objects.get(pk=pk)
        except Scenario.DoesNotExist:
            return None
        if not scenario.is_template and scenario.organization != profile.organization:
            if profile.role != 'admin':
                return None
        return scenario

    def get(self, request, pk):
        obj = self._get(pk, request.user.profile)
        if not obj:
            return Response({'error': 'Not found'}, status=404)
        return Response(ScenarioSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk, request.user.profile)
        if not obj:
            return Response({'error': 'Not found'}, status=404)
        s = ScenarioWriteSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(ScenarioSerializer(obj).data)

    def delete(self, request, pk):
        obj = self._get(pk, request.user.profile)
        if not obj:
            return Response({'error': 'Not found'}, status=404)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
