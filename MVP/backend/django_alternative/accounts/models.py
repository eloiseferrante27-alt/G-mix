import uuid
from django.db import models
from django.contrib.auth.models import User

ROLE_CHOICES = [('admin', 'Admin'), ('formateur', 'Formateur'), ('joueur', 'Joueur')]


class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='joueur')
    organization = models.ForeignKey(
        'organizations.Organization',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profiles'

    @property
    def email(self):
        return self.user.email

    @property
    def first_name(self):
        return self.user.first_name

    @property
    def last_name(self):
        return self.user.last_name

    def __str__(self):
        return f'{self.user.email} ({self.role})'
