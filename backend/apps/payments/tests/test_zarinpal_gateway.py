import pytest
import responses
from django.conf import settings

from apps.orders.models import Order, OrderItem
from apps.payments.gateways.zarinpal import ZarinpalPaymentGateway
from apps.payments.models import Payment
from apps.payments.services import (
    PaymentServiceError,
    handle_gateway_callback,
    start_payment_for_order,
)

REQUEST_URL = "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
VERIFY_URL = "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"


@pytest.fixture
def order(db, make_restaurant):
    restaurant = make_restaurant()
    order = Order.objects.create(
        restaurant=restaurant,
        customer_name="Ali",
        customer_phone="09120000000",
        total_amount=150000,
    )
    OrderItem.objects.create(
        order=order,
        menu_item_name="Classic Burger",
        unit_price=150000,
        quantity=1,
        line_total=150000,
    )
    return order


@pytest.fixture(autouse=True)
def _force_sandbox(settings):
    settings.ZARINPAL_SANDBOX = True
    settings.ZARINPAL_MERCHANT_ID = "00000000-0000-0000-0000-000000000000"


@pytest.mark.django_db
class TestZarinpalGatewayUnit:
    @responses.activate
    def test_create_payment_returns_start_pay_url_and_stores_authority(self, order):
        responses.add(
            responses.POST,
            REQUEST_URL,
            json={"data": {"code": 100, "authority": "A00000000000000000000000000123456"}},
            status=200,
        )
        payment = Payment.objects.create(order=order, amount=order.total_amount)

        url = ZarinpalPaymentGateway().create_payment(payment)

        assert url.endswith("A00000000000000000000000000123456")
        payment.refresh_from_db()
        assert payment.authority == "A00000000000000000000000000123456"

    @responses.activate
    def test_verify_payment_success(self, order):
        responses.add(
            responses.POST,
            VERIFY_URL,
            json={"data": {"code": 100, "ref_id": 987654321}},
            status=200,
        )
        Payment.objects.create(order=order, amount=order.total_amount, authority="A123")

        success, ref_id, _ = ZarinpalPaymentGateway().verify_payment("A123", "OK")

        assert success is True
        assert ref_id == "987654321"

    def test_verify_payment_short_circuits_when_customer_cancelled(self, order):
        # Status=NOK means Zarinpal itself never authorized the payment -
        # verifying would be pointless, so no HTTP call should happen.
        gateway = ZarinpalPaymentGateway()
        success, ref_id, message = gateway.verify_payment("A123", "NOK")
        assert success is False
        assert "cancelled" in message.lower()


@pytest.mark.django_db
class TestPaymentServiceFlow:
    @responses.activate
    def test_start_payment_recomputes_amount_from_order_not_client(self, order):
        responses.add(
            responses.POST,
            REQUEST_URL,
            json={"data": {"code": 100, "authority": "A1"}},
            status=200,
        )
        order.total_amount = 999999999  # stale/tampered value on the row itself
        order.save(update_fields=["total_amount"])

        start_payment_for_order(order)

        payment = Payment.objects.get(order=order)
        # Recomputed from the real OrderItem (150000), not the tampered column.
        assert payment.amount == 150000
        assert b'"amount": 150000' in responses.calls[0].request.body

    def test_cannot_pay_for_an_already_paid_order(self, order):
        Payment.objects.create(order=order, amount=order.total_amount, status="SUCCESS")
        with pytest.raises(PaymentServiceError):
            start_payment_for_order(order)

    @responses.activate
    def test_successful_callback_marks_payment_and_confirms_order(self, order):
        responses.add(
            responses.POST,
            VERIFY_URL,
            json={"data": {"code": 100, "ref_id": 555}},
            status=200,
        )
        Payment.objects.create(order=order, amount=order.total_amount, authority="A9")

        result = handle_gateway_callback("A9", "OK")

        assert result.status == Payment.Status.SUCCESS
        order.refresh_from_db()
        assert order.status == Order.Status.CONFIRMED
        assert order.is_paid is True

    def test_callback_for_unknown_authority_is_rejected(self, order):
        with pytest.raises(PaymentServiceError):
            handle_gateway_callback("does-not-exist", "OK")

    @responses.activate
    def test_callback_is_idempotent_for_an_already_successful_payment(self, order):
        payment = Payment.objects.create(
            order=order, amount=order.total_amount, authority="A9", status=Payment.Status.SUCCESS
        )
        result = handle_gateway_callback("A9", "OK")
        assert result.id == payment.id
        assert len(responses.calls) == 0  # never re-verified with Zarinpal


@pytest.mark.django_db
class TestPaymentApiViews:
    @responses.activate
    def test_create_payment_endpoint_returns_redirect_url(self, api_client, order):
        responses.add(
            responses.POST,
            REQUEST_URL,
            json={"data": {"code": 100, "authority": "A1"}},
            status=200,
        )
        response = api_client.post(f"/api/v1/payments/{order.secure_order_token}/create/")
        assert response.status_code == 201
        assert "redirect_url" in response.data

    @responses.activate
    def test_callback_endpoint_redirects_to_frontend_result_page(self, api_client, order):
        responses.add(
            responses.POST,
            VERIFY_URL,
            json={"data": {"code": 100, "ref_id": 1}},
            status=200,
        )
        Payment.objects.create(order=order, amount=order.total_amount, authority="A9")

        response = api_client.get("/api/v1/payments/callback/", {"Authority": "A9", "Status": "OK"})

        assert response.status_code == 302
        assert response.url == (
            f"{settings.FRONTEND_BASE_URL}/orders/{order.secure_order_token}/result?status=success"
        )
