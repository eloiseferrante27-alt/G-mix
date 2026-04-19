from django.urls import path
from .views import ScenarioListView, ScenarioDetailView

urlpatterns = [
    path('scenarios/', ScenarioListView.as_view()),
    path('scenarios/<uuid:pk>/', ScenarioDetailView.as_view()),
]
