import uuid
from django.db import models
from django.db.models import F, Q

SESSION_STATUS = [('draft', 'Draft'), ('active', 'Active'), ('completed', 'Completed'), ('archived', 'Archived')]
TURN_STATUS = [('pending', 'Pending'), ('open', 'Open'), ('closed', 'Closed')]


class GameSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scenario = models.ForeignKey(
        'scenarios.Scenario', null=True, blank=True,
        on_delete=models.RESTRICT, related_name='sessions'
    )
    formateur = models.ForeignKey(
        'accounts.Profile', null=True, blank=True,
        on_delete=models.RESTRICT, related_name='formateur_sessions'
    )
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='game_sessions'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(default='')
    status = models.CharField(max_length=20, choices=SESSION_STATUS, default='draft')
    current_turn = models.IntegerField(default=0)
    total_turns = models.IntegerField(default=6)
    config = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'game_sessions'
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                check=Q(status='draft') | (Q(scenario__isnull=False) & Q(formateur__isnull=False)),
                name='django_game_sessions_required_links_when_not_draft',
            ),
            models.CheckConstraint(
                check=Q(current_turn__gte=0) & Q(current_turn__lte=F('total_turns')),
                name='django_game_sessions_turn_bounds',
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.status})'


class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=20, default='#3B82F6')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'teams'

    def __str__(self):
        return f'{self.session.name} / {self.name}'


class TeamMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(
        'accounts.Profile', on_delete=models.CASCADE, related_name='team_memberships'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'team_members'
        unique_together = [('team', 'user')]


class Turn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='turns')
    turn_number = models.IntegerField()
    status = models.CharField(max_length=20, choices=TURN_STATUS, default='pending')
    deadline = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'turns'
        unique_together = [('session', 'turn_number')]

    def __str__(self):
        return f'{self.session.name} — Tour {self.turn_number} ({self.status})'
