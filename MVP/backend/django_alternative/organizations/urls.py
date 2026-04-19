from django.urls import path
from .views import OrganizationListView, OrganizationDetailView, OrgMembersView

urlpatterns = [
    path('admin/organisations/', OrganizationListView.as_view()),
    path('admin/organisations/<uuid:pk>/', OrganizationDetailView.as_view()),
    path('admin/organisations/<uuid:pk>/members/', OrgMembersView.as_view()),
]
