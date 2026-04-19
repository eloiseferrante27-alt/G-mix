from rest_framework import serializers
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True, default=0)
    scenario_count = serializers.IntegerField(read_only=True, default=0)
    session_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'plan', 'contact_email',
            'max_formateurs', 'max_scenarios', 'max_sessions',
            'ai_generation_enabled', 'subscription_expires_at', 'created_at',
            'member_count', 'scenario_count', 'session_count',
        ]
        read_only_fields = ['id', 'created_at']
