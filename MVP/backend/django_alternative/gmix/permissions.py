from rest_framework.permissions import BasePermission


def _role(request) -> str | None:
    try:
        return request.user.profile.role
    except Exception:
        return None


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == 'admin'


class IsAdminOrFormateur(BasePermission):
    def has_permission(self, request, view):
        return _role(request) in ('admin', 'formateur')


class IsStaffProfile(BasePermission):
    def has_permission(self, request, view):
        return _role(request) in ('admin', 'organisme', 'formateur')


class IsAdminOrOrganisme(BasePermission):
    def has_permission(self, request, view):
        return _role(request) in ('admin', 'organisme')
