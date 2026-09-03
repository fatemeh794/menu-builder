from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.mixins import TenantScopedViewSet
from apps.orders.models import Order
from apps.orders.serializers import (
    OrderCreateSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
    OrderTrackSerializer,
)
from apps.orders.services import OrderValidationError, create_guest_order
from apps.restaurants.models import Restaurant
from apps.tables.models import Table


class OrderCreateView(APIView):
    """POST /api/v1/orders/ - guest checkout, no auth required."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(request=OrderCreateSerializer, responses=OrderTrackSerializer)
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = get_object_or_404(Restaurant, slug=data["restaurant_slug"], is_active=True)
        table = get_object_or_404(
            Table, restaurant=restaurant, secure_token=data["table_token"], is_active=True
        )

        try:
            order = create_guest_order(
                restaurant=restaurant,
                table=table,
                customer_name=data["customer_name"],
                customer_phone=data["customer_phone"],
                note=data["note"],
                items_data=data["items"],
            )
        except OrderValidationError as exc:
            raise ValidationError(exc.errors) from exc

        return Response(OrderTrackSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderTrackView(generics.RetrieveAPIView):
    """GET /api/v1/orders/track/{secure_order_token}/"""

    queryset = Order.objects.select_related("restaurant", "table").prefetch_related(
        "items__options"
    )
    serializer_class = OrderTrackSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "secure_order_token"
    lookup_url_kwarg = "token"


class OrderViewSet(TenantScopedViewSet, viewsets.ModelViewSet):
    """/api/v1/dashboard/{restaurant_slug}/orders/ - staff can view and
    move orders through their status lifecycle, not create/delete them."""

    http_method_names = ["get", "patch", "head", "options"]
    queryset = Order.objects.select_related("table").prefetch_related("items__options")

    def get_serializer_class(self):
        if self.action == "partial_update":
            return OrderStatusUpdateSerializer
        if self.action == "retrieve":
            return OrderTrackSerializer
        return OrderListSerializer
