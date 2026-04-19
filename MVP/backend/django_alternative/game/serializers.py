from rest_framework import serializers
from sessions.serializers import TeamSerializer, TurnSerializer
from .models import Decision, TurnResult


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = ['id', 'turn_id', 'team_id', 'user_id', 'data', 'submitted_at']
        read_only_fields = ['id', 'submitted_at']


class TurnResultSerializer(serializers.ModelSerializer):
    team = TeamSerializer(read_only=True)
    turn = TurnSerializer(read_only=True)

    class Meta:
        model = TurnResult
        fields = ['id', 'turn_id', 'team_id', 'kpis', 'score', 'calculated_at', 'team', 'turn']
        read_only_fields = ['id', 'calculated_at']
