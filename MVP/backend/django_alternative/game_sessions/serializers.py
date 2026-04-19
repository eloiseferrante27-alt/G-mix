from rest_framework import serializers
from accounts.serializers import ProfileSerializer
from scenarios.serializers import ScenarioSerializer
from .models import GameSession, Team, TeamMember, Turn


class TeamMemberSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(source='user', read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'team_id', 'user_id', 'joined_at', 'profile']


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'session_id', 'name', 'color', 'created_at', 'members']
        read_only_fields = ['id', 'created_at']


class TurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turn
        fields = ['id', 'session_id', 'turn_number', 'status', 'deadline', 'started_at', 'ended_at']
        read_only_fields = ['id']


class GameSessionSerializer(serializers.ModelSerializer):
    scenario = ScenarioSerializer(read_only=True)
    teams = TeamSerializer(many=True, read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    formateur_id = serializers.UUIDField(source='formateur.id', read_only=True, allow_null=True)
    scenario_id = serializers.UUIDField(source='scenario.id', read_only=True, allow_null=True)

    class Meta:
        model = GameSession
        fields = [
            'id', 'name', 'description', 'status', 'current_turn', 'total_turns', 'config',
            'created_at', 'started_at', 'ended_at',
            'scenario', 'scenario_id', 'organization_id', 'formateur_id', 'teams',
        ]
        read_only_fields = ['id', 'created_at']


class GameSessionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameSession
        fields = ['name', 'description', 'scenario', 'organization', 'formateur', 'status', 'total_turns', 'config']
