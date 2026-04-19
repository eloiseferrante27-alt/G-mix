from django.urls import path
from .views import GenerateScenarioView

urlpatterns = [
    path('ai/generate-scenario/', GenerateScenarioView.as_view()),
]
