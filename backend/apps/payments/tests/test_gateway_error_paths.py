import pytest
import responses
from requests.exceptions import ConnectionError as RequestsConnectionError

from apps.orders.models import Order, OrderItem
from apps.payments.gateways import get_gateway
from apps.payments.gateways.zarinpal import ZarinpalPaymentGateway
from apps.payments.models import Payment
from apps.payments.services import PaymentServiceError, start_payment_for_order

REQUEST_URL = "https://sandbox.zarinpal.com/pg/v4/payment/request.json"


@pytest.fixture
def order(db, make_restaurant):
    restaurant = make_restaurant()
    order = Order.objects.create(restaurant=restaurant, customer_name="Ali", customer_phone="0912")
    OrderItem.objects.create(
        order=order, menu_item_name="Item", unit_price=50000, quantity=1, line_total=50000
    )
    return order


@pytest.mark.django_db
class TestGatewayErrorPaths:
    def test_unknown_gateway_name_raises(self):
        with pytest.raises(ValueError):
            get_gateway("SOME_OTHER_PROVIDER")

    @responses.activate
    def test_rejected_request_marks_payment_failed_and_raises_service_error(self, order):
        responses.add(
            responses.POST,
            REQUEST_URL,
            json={"data": {"code": 101}, "errors": {"message": "Invalid merchant ID"}},
            status=200,
        )

        with pytest.raises(PaymentServiceError):
            start_payment_for_order(order)

        payment = Payment.objects.get(order=order)
        assert payment.status == Payment.Status.FAILED
        assert "Invalid merchant ID" in payment.failure_reason

    @responses.activate
    def test_network_failure_marks_payment_failed(self, order):
        responses.add(responses.POST, REQUEST_URL, body=RequestsConnectionError("boom"))

        with pytest.raises(PaymentServiceError):
            start_payment_for_order(order)

        payment = Payment.objects.get(order=order)
        assert payment.status == Payment.Status.FAILED

    def test_order_with_no_items_cannot_be_paid(self, db, make_restaurant):
        empty_order = Order.objects.create(
            restaurant=make_restaurant(), customer_name="Ali", customer_phone="0912"
        )
        with pytest.raises(PaymentServiceError):
            start_payment_for_order(empty_order)

    def test_zarinpal_error_message_falls_back_when_errors_shape_is_unexpected(self):
        message = ZarinpalPaymentGateway._error_message({"errors": []})
        assert message == "Zarinpal rejected the payment request."
