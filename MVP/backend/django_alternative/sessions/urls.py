from django.urls import path
from .views import (
    SessionListView, SessionDetailView,
    SessionStartView, SessionTeamsView, SessionTurnsView,
)

urlpatterns = [
    path('sessions/', SessionListView.as_view()),
    path('sessions/<uuid:pk>/', SessionDetailView.as_view()),
    path('sessions/<uuid:pk>/start/', SessionStartView.as_view()),
    path('sessions/<uuid:pk>/teams/', SessionTeamsView.as_view()),
    path('sessions/<uuid:pk>/turns/', SessionTurnsView.as_view()),
]
