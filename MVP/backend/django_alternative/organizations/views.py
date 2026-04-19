from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.models import Profile
from accounts.serializers import ProfileSerializer
from gmix.permissions import IsAdmin, IsAdminOrOrganisme
from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationListView(APIView):
    permission_classes = [IsAdminOrOrganisme]

    def get(self, request):
        profile = request.user.profile
        if profile.role == 'admin':
            orgs = Organization.objects.prefetch_related('members', 'scenarios', 'game_sessions').all()
        else:
            orgs = Organization.objects.prefetch_related('members', 'scenarios', 'game_sessions').filter(pk=profile.organization_id)
        data = []
        for org in orgs:
            d = OrganizationSerializer(org).data
            d['member_count'] = org.members.count()
            d['scenario_count'] = org.scenarios.count()
            d['session_count'] = org.game_sessions.count()
            data.append(d)
        return Response(data)

    def post(self, request):
        if request.user.profile.role != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        s = OrganizationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        org = s.save()
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)


class OrganizationDetailView(APIView):
    permission_classes = [IsAdminOrOrganisme]

    def _get_org(self, pk):
        try:
            return Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return None

    def get(self, request, pk):
        org = self._get_org(pk)
        if not org:
            return Response({'error': 'Not found'}, status=404)
        profile = request.user.profile
        if profile.role != 'admin' and profile.organization_id != org.pk:
            return Response({'error': 'Forbidden'}, status=403)
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
        profile = request.user.profile
        if profile.role != 'admin' and profile.organization_id != org.pk:
            return Response({'error': 'Forbidden'}, status=403)
        s = OrganizationSerializer(org, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(OrganizationSerializer(org).data)

    def delete(self, request, pk):
        org = self._get_org(pk)
        if not org:
            return Response({'error': 'Not found'}, status=404)
        if request.user.profile.role != 'admin':
            return Response({'error': 'Forbidden'}, status=403)
        org.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgMembersView(APIView):
    permission_classes = [IsAdminOrOrganisme]

    def post(self, request, pk):
        user_id = request.data.get('user_id')
        try:
            org = Organization.objects.get(pk=pk)
            profile = Profile.objects.get(pk=user_id)
        except (Organization.DoesNotExist, Profile.DoesNotExist):
            return Response({'error': 'Not found'}, status=404)
        actor = request.user.profile
        if actor.role != 'admin' and actor.organization_id != org.pk:
            return Response({'error': 'Forbidden'}, status=403)
        profile.organization = org
        profile.save()
        return Response(ProfileSerializer(profile).data)

    def delete(self, request, pk):
        user_id = request.data.get('user_id')
        try:
            profile = Profile.objects.get(pk=user_id, organization_id=pk)
        except Profile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        actor = request.user.profile
        if actor.role != 'admin' and str(actor.organization_id) != str(pk):
            return Response({'error': 'Forbidden'}, status=403)
        profile.organization = None
        profile.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
