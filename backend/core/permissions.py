from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allows access only to admin/staff users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsDeliveryRole(BasePermission):
    """Allows access only to delivery agents."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "is_delivery_agent", False)
        )


class IsAdminOrDeliveryRole(BasePermission):
    """Allows access to admin/staff or delivery agents."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or getattr(request.user, "is_delivery_agent", False))
        )
