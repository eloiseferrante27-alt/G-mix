from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('organizations.urls')),
    path('api/', include('scenarios.urls')),
    path('api/', include('sessions.urls')),
    path('api/', include('game.urls')),
    path('api/', include('ai_generation.urls')),
]
