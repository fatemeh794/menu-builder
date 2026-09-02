from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import BasePermission

OWNER_MANAGER_ROLES = ("OWNER", "MANAGER")


def get_membership_or_404(user, restaurant_slug):
    """Resolve the caller's membership for the restaurant in the URL.

    Lives here (not imported at module scope) to avoid a circular import
    between apps.core and apps.restaurants at app-loading time.
    """
    from apps.restaurants.models import Restaurant, RestaurantMembership

    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication required.")

    try:
        restaurant = Restaurant.objects.get(slug=restaurant_slug)
    except Restaurant.DoesNotExist as exc:
        raise NotFound("Restaurant not found.") from exc

    membership = (
        RestaurantMembership.objects.select_related("restaurant")
        .filter(user=user, restaurant=restaurant)
        .first()
    )
    if membership is None:
        raise PermissionDenied("You are not a member of this restaurant.")
    return membership


class IsRestaurantMember(BasePermission):
    """Grants access only to staff who belong to the restaurant named by
    the `restaurant_slug` URL kwarg. Attaches `request.membership` /
    `request.restaurant` for downstream queryset filtering."""

    def has_permission(self, request, view):
        restaurant_slug = view.kwargs.get("restaurant_slug")
        if not restaurant_slug:
            return False
        membership = get_membership_or_404(request.user, restaurant_slug)
        request.membership = membership
        request.restaurant = membership.restaurant
        return True


class IsRestaurantOwnerOrManager(IsRestaurantMember):
    """Same as IsRestaurantMember but additionally requires an
    OWNER/MANAGER role, for staff-management and settings endpoints."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.membership.role in OWNER_MANAGER_ROLES
