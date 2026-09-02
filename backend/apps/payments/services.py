from django.db import transaction

from apps.orders.models import Order
from apps.orders.services import recompute_order_total
from apps.payments.gateways import PaymentGatewayError, get_gateway
from apps.payments.models import Payment


class PaymentServiceError(Exception):
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def start_payment_for_order(order: Order) -> str:
    """Create a Payment row priced straight from the DB and hand back the
    URL to redirect the customer to. Never trusts a client-supplied
    amount - that's the whole point of recomputing here."""
    if order.is_paid:
        raise PaymentServiceError("This order has already been paid for.")

    amount = recompute_order_total(order)
    if amount <= 0:
        raise PaymentServiceError("Order has no payable amount.")

    payment = Payment.objects.create(order=order, amount=amount, gateway=Payment.Gateway.ZARINPAL)
    gateway = get_gateway(payment.gateway)
    try:
        redirect_url = gateway.create_payment(payment)
    except PaymentGatewayError as exc:
        payment.status = Payment.Status.FAILED
        payment.failure_reason = str(exc)
        payment.save(update_fields=["status", "failure_reason"])
        raise PaymentServiceError(f"Could not start payment: {exc}") from exc

    return redirect_url


@transaction.atomic
def handle_gateway_callback(authority: str, gateway_status: str) -> Payment:
    """Verify a callback and settle the Payment + Order together.
    Idempotent: calling it twice for an already-settled payment just
    returns the existing state instead of re-charging or re-verifying."""
    try:
        payment = (
            Payment.objects.select_for_update().select_related("order").get(authority=authority)
        )
    except Payment.DoesNotExist as exc:
        raise PaymentServiceError("Unknown payment authority.", status_code=404) from exc

    if payment.status == Payment.Status.SUCCESS:
        return payment

    gateway = get_gateway(payment.gateway)
    try:
        success, ref_id, message = gateway.verify_payment(authority, gateway_status)
    except PaymentGatewayError as exc:
        success, ref_id, message = False, "", str(exc)

    if success:
        payment.status = Payment.Status.SUCCESS
        payment.ref_id = ref_id
        payment.save(update_fields=["status", "ref_id"])

        order = payment.order
        if order.status == Order.Status.PENDING:
            order.status = Order.Status.CONFIRMED
            order.save(update_fields=["status"])
    else:
        payment.status = Payment.Status.FAILED
        payment.failure_reason = message
        payment.save(update_fields=["status", "failure_reason"])

    return payment
