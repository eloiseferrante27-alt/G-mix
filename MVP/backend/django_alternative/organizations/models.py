import uuid
from django.db import models

PLAN_CHOICES = [('free', 'Gratuit'), ('pro', 'Pro'), ('enterprise', 'Entreprise')]


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    contact_email = models.EmailField(null=True, blank=True)
    max_formateurs = models.IntegerField(default=1)
    max_scenarios = models.IntegerField(default=3)
    max_sessions = models.IntegerField(default=5)
    ai_generation_enabled = models.BooleanField(default=False)
    subscription_expires_at = models.DateTimeField(null=True, blank=True)
    owner = models.ForeignKey(
        'accounts.Profile',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='owned_organizations',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'organizations'

    def __str__(self):
        return f'{self.name} ({self.plan})'
