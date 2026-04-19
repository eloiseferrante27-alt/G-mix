import uuid
from django.db import models


class Scenario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(default='')
    config = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        'accounts.Profile',
        null=True, on_delete=models.SET_NULL,
        related_name='created_scenarios',
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='scenarios',
    )
    is_template = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'scenarios'
        ordering = ['-created_at']

    def __str__(self):
        return self.name
