from django.contrib import admin
from .models import GameSession, Team, TeamMember, Turn
admin.site.register(GameSession)
admin.site.register(Team)
admin.site.register(TeamMember)
admin.site.register(Turn)
