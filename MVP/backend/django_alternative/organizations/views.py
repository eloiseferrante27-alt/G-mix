from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.models import Profile
from accounts.serializers import ProfileSerializer
from gmix.permissions import IsAdmin
from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        orgs = Organization.objects.prefetch_related('members', 'scenarios', 'game_sessions').all()
        data = []
        for org in orgs:
            d = OrganizationSerializer(org).data
            d['member_count'] = org.members.count()
            d['scenario_count'] = org.scenarios.count()
            d['session_count'] = org.game_sessions.count()
            data.append(d)
        return Response(data)

    def post(self, request):
        s = OrganizationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        org = s.save()
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)


class OrganizationDetailView(APIView):
    permission_classes = [IsAdmin]

    def _get_org(self, pk):
        try:
            return Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return None

    def get(self, request, pk):
        org = self._get_org(pk)
        if not org:
            return Response({'error': 'Not found'}, status=404)
        data = OrganizationSerializer(org).data
        data['member_count'] = org.members.count()
        data['scenario_count'] = org.scenarios.count()
        data['session_count'] = org.game_sessions.count()
        data['members'] = ProfileSerializer(org.members.all(), many=True).data
        return Response(data)

    def patch(self, request, pk):
        org = self._get_org(pk)
        if not org:
            return Response({'error': 'Not found'}, status=404)
        s = OrganizationSerializer(org, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(OrganizationSerializer(org).data)

    def delete(self, request, pk):
        org = self._get_org(pk)
        if not org:
            return Response({'error': 'Not found'}, status=404)
        org.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgMembersView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user_id = request.data.get('user_id')
        try:
            org = Organization.objects.get(pk=pk)
            profile = Profile.objects.get(pk=user_id)
        except (Organization.DoesNotExist, Profile.DoesNotExist):
            return Response({'error': 'Not found'}, status=404)
        profile.organization = org
        profile.save()
        return Response(ProfileSerializer(profile).data)

    def delete(self, request, pk):
        user_id = request.data.get('user_id')
        try:
            profile = Profile.objects.get(pk=user_id, organization_id=pk)
        except Profile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        profile.organization = None
        profile.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
