from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from .serializers import ProfileSerializer, RegisterSerializer
from gmix.permissions import IsStaffProfile


def _tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(
            {'user': ProfileSerializer(user.profile).data, **_tokens(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'error': 'Identifiants invalides'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'user': ProfileSerializer(user.profile).data, **_tokens(user)})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ProfileSerializer(request.user.profile).data)


class ProfileListView(APIView):
    permission_classes = [IsStaffProfile]

    def get(self, request):
        role = request.user.profile.role
        if role == 'admin':
            qs = Profile.objects.select_related('user', 'organization').all()
        else:
            org = request.user.profile.organization
            qs = Profile.objects.select_related('user', 'organization').filter(organization=org)
        return Response(ProfileSerializer(qs, many=True).data)
