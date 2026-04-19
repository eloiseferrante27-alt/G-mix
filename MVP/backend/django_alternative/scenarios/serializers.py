from rest_framework import serializers
from .models import Scenario


class ScenarioSerializer(serializers.ModelSerializer):
    organization_id = serializers.UUIDField(
        source='organization.id', allow_null=True, read_only=True
    )
    created_by_id = serializers.UUIDField(
        source='created_by.id', allow_null=True, read_only=True
    )

    class Meta:
        model = Scenario
        fields = [
            'id', 'name', 'description', 'config',
            'is_template', 'created_at', 'organization_id', 'created_by_id',
        ]
        read_only_fields = ['id', 'created_at']


class ScenarioWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = ['name', 'description', 'config', 'organization', 'created_by', 'is_template']
