import io

import qrcode
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action

from apps.core.mixins import TenantScopedViewSet
from apps.tables.models import Table
from apps.tables.serializers import TablePublicSerializer, TableWriteSerializer


class TablePublicDetailView(generics.RetrieveAPIView):
    """GET /api/v1/tables/{restaurant_slug}/{token}/ - what a QR scan hits
    to confirm the table is real before the customer sees the menu."""

    serializer_class = TablePublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        return get_object_or_404(
            Table.objects.select_related("restaurant"),
            restaurant__slug=self.kwargs["restaurant_slug"],
            secure_token=self.kwargs["token"],
            is_active=True,
            restaurant__is_active=True,
        )


class TableViewSet(TenantScopedViewSet, viewsets.ModelViewSet):
    queryset = Table.objects.select_related("restaurant")
    serializer_class = TableWriteSerializer

    @action(detail=True, methods=["get"], url_path="qr-code")
    def qr_code(self, request, *args, **kwargs):
        table = self.get_object()
        customer_url = (
            f"{settings.FRONTEND_BASE_URL}/menu/"
            f"{table.restaurant.slug}/table/{table.secure_token}"
        )
        image = qrcode.make(customer_url)
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return HttpResponse(buffer.getvalue(), content_type="image/png")
