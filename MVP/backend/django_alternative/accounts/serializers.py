from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile


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
    role = serializers.ChoiceField(choices=['admin', 'formateur', 'joueur'], default='joueur')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        Profile.objects.create(user=user, role=validated_data.get('role', 'joueur'))
        return user
