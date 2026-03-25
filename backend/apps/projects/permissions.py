from rest_framework.permissions import BasePermission


class IsProjectOwner(BasePermission):
    """Only allow access to the owner of the project."""

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
