from rest_framework.permissions import BasePermission

from .serializers import user_role
from .models import WorkerProfile


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and user_role(request.user) == "customer")


class IsWorker(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and user_role(request.user) == "worker")


class IsApprovedActiveWorker(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or user_role(request.user) != "worker":
            return False
        try:
            profile = request.user.worker_profile
        except WorkerProfile.DoesNotExist:
            return False
        return (
            request.user.is_active
            and profile.is_active
            and profile.verification_status == WorkerProfile.VerificationStatus.APPROVED
        )


class IsStaffAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsSuperuserOnly(BasePermission):
    """Require a real Django superuser, not merely a staff account."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
