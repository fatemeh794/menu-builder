from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.payments.serializers import PaymentRedirectSerializer
from apps.payments.services import (
    PaymentServiceError,
    handle_gateway_callback,
    start_payment_for_order,
)


class PaymentCreateView(APIView):
    """POST /api/v1/payments/{secure_order_token}/create/ - guest starts
    paying for their own order, identified only by its unguessable
    tracking token."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=None,
        responses={
            201: PaymentRedirectSerializer,
            400: OpenApiResponse(description="Order already paid, or has no payable amount"),
        },
    )
    def post(self, request, token):
        order = get_object_or_404(Order, secure_order_token=token)
        try:
            redirect_url = start_payment_for_order(order)
        except PaymentServiceError as exc:
            return Response({"detail": exc.message}, status=exc.status_code)
        return Response({"redirect_url": redirect_url}, status=status.HTTP_201_CREATED)


class PaymentCallbackView(APIView):
    """GET /api/v1/payments/callback/ - Zarinpal redirects the customer's
    browser here with ?Authority=...&Status=OK|NOK."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        responses={302: OpenApiResponse(description="Redirects to the frontend result page")},
        description="Not meant to be called directly - Zarinpal redirects the customer's "
        "browser here after payment.",
    )
    def get(self, request):
        authority = request.query_params.get("Authority", "")
        gateway_status = request.query_params.get("Status", "")

        try:
            payment = handle_gateway_callback(authority, gateway_status)
        except PaymentServiceError:
            return redirect(f"{settings.FRONTEND_BASE_URL}/payment/error")

        outcome = "success" if payment.status == payment.Status.SUCCESS else "failed"
        token = payment.order.secure_order_token
        return redirect(f"{settings.FRONTEND_BASE_URL}/orders/{token}/result?status={outcome}")
