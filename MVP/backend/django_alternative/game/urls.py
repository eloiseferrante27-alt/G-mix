from django.urls import path
from .views import SubmitDecisionView, CalculateResultsView

urlpatterns = [
    path('game/submit-decision/', SubmitDecisionView.as_view()),
    path('game/calculate-results/', CalculateResultsView.as_view()),
]
