from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile
from organizations.models import Organization


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    organization_id = serializers.UUIDField(
        source='organization.id', allow_null=True, read_only=True
    )

    class Meta:
        model = Profile
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'organization_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(default='')
    last_name = serializers.CharField(default='')
    role = serializers.ChoiceField(choices=['admin', 'organisme', 'formateur', 'joueur'], default='joueur')
    org_name = serializers.CharField(required=False, allow_blank=True, default='')

    def create(self, validated_data):
        org_name = validated_data.pop('org_name', '').strip()
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        profile = Profile.objects.create(user=user, role=validated_data.get('role', 'joueur'))

        if profile.role == 'organisme' and org_name:
            organization = Organization.objects.create(
                name=org_name,
                contact_email=user.email,
                owner=profile,
            )
            profile.organization = organization
            profile.save(update_fields=['organization'])

        return user
