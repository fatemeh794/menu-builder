from rest_framework import generics, permissions, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.core.mixins import TenantScopedViewSet
from apps.core.permissions import IsRestaurantOwnerOrManager
from apps.restaurants.models import Restaurant, RestaurantMembership
from apps.restaurants.serializers import (
    MyMembershipSerializer,
    RestaurantMembershipSerializer,
    RestaurantPublicSerializer,
    RestaurantSettingsSerializer,
    StaffCreateSerializer,
)


class RestaurantPublicDetailView(generics.RetrieveAPIView):
    """GET /api/v1/menu/{slug}/ - restaurant identity + theme for the
    customer-facing menu. No auth, no operational data."""

    queryset = Restaurant.objects.filter(is_active=True)
    serializer_class = RestaurantPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    lookup_url_kwarg = "restaurant_slug"


class MyRestaurantsListView(generics.ListAPIView):
    """GET /api/v1/dashboard/restaurants/ - restaurants the logged-in
    staff user belongs to, with their role on each."""

    serializer_class = MyMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RestaurantMembership.objects.filter(user=self.request.user).select_related(
            "restaurant"
        )


class RestaurantSettingsView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/dashboard/{restaurant_slug}/settings/"""

    serializer_class = RestaurantSettingsSerializer
    permission_classes = [IsRestaurantOwnerOrManager]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.restaurant


class StaffViewSet(TenantScopedViewSet, viewsets.ModelViewSet):
    """/api/v1/dashboard/{restaurant_slug}/staff/"""

    queryset = RestaurantMembership.objects.select_related("user", "restaurant")
    permission_classes = [IsRestaurantOwnerOrManager]

    def get_serializer_class(self):
        if self.action == "create":
            return StaffCreateSerializer
        return RestaurantMembershipSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["restaurant"] = self.request.restaurant
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()
        output = RestaurantMembershipSerializer(membership)
        return Response(output.data, status=status.HTTP_201_CREATED)
