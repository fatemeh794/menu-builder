from apps.core.permissions import IsRestaurantMember


class TenantScopedViewSet:
    """Mixin for staff-facing viewsets nested under
    `dashboard/{restaurant_slug}/...`. Scopes the queryset to
    `request.restaurant` (set by IsRestaurantMember) and auto-assigns the
    restaurant on create, so a view can never leak or write another
    tenant's rows.
    """

    permission_classes = [IsRestaurantMember]
    tenant_field = "restaurant"

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(**{self.tenant_field: self.request.restaurant})

    def perform_create(self, serializer):
        serializer.save(**{self.tenant_field: self.request.restaurant})
