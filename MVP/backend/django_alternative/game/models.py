import uuid
from django.db import models


class Decision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    turn = models.ForeignKey('sessions.Turn', on_delete=models.CASCADE, related_name='decisions')
    team = models.ForeignKey('sessions.Team', on_delete=models.CASCADE, related_name='decisions')
    user = models.ForeignKey('accounts.Profile', on_delete=models.CASCADE, related_name='decisions')
    data = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'decisions'
        unique_together = [('turn', 'team')]

    def __str__(self):
        return f'Décision — Tour {self.turn.turn_number} / {self.team.name}'


class TurnResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    turn = models.ForeignKey('sessions.Turn', on_delete=models.CASCADE, related_name='results')
    team = models.ForeignKey('sessions.Team', on_delete=models.CASCADE, related_name='results')
    kpis = models.JSONField(default=dict)
    score = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'turn_results'
        unique_together = [('turn', 'team')]

    def __str__(self):
        return f'Résultat — Tour {self.turn.turn_number} / {self.team.name} — score {self.score}'
