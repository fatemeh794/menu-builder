import requests
from django.conf import settings

from apps.payments.gateways.base import PaymentGateway, PaymentGatewayError

REQUEST_TIMEOUT_SECONDS = 10


class ZarinpalPaymentGateway(PaymentGateway):
    """Zarinpal REST API v4 (https://www.zarinpal.com/docs/paymentGateway/).
    Amounts are passed with currency="IRT" so the Toman amounts stored on
    Payment/Order don't need a x10 Rial conversion anywhere else in the
    codebase.
    """

    def __init__(self):
        self.merchant_id = settings.ZARINPAL_MERCHANT_ID
        self.callback_url = settings.ZARINPAL_CALLBACK_URL
        host = "sandbox.zarinpal.com" if settings.ZARINPAL_SANDBOX else "payment.zarinpal.com"
        self.request_url = f"https://{host}/pg/v4/payment/request.json"
        self.verify_url = f"https://{host}/pg/v4/payment/verify.json"
        self.start_pay_url = f"https://{host}/pg/StartPay/{{authority}}"

    def create_payment(self, payment) -> str:
        order = payment.order
        response = self._post(
            self.request_url,
            {
                "merchant_id": self.merchant_id,
                "amount": payment.amount,
                "currency": "IRT",
                "callback_url": self.callback_url,
                "description": f"Order {order.id} - {order.restaurant.name}",
                "metadata": {"mobile": order.customer_phone},
            },
        )
        data = response.get("data") or {}
        if data.get("code") != 100:
            raise PaymentGatewayError(self._error_message(response))

        payment.authority = data["authority"]
        payment.save(update_fields=["authority"])
        return self.start_pay_url.format(authority=data["authority"])

    def verify_payment(self, authority: str, status: str) -> tuple[bool, str, str]:
        if status != "OK":
            return False, "", "Payment was cancelled by the customer."

        from apps.payments.models import Payment

        payment = Payment.objects.select_related("order").get(authority=authority)
        response = self._post(
            self.verify_url,
            {
                "merchant_id": self.merchant_id,
                "amount": payment.amount,
                "currency": "IRT",
                "authority": authority,
            },
        )
        data = response.get("data") or {}
        code = data.get("code")
        if code in (100, 101):
            return True, str(data.get("ref_id", "")), "Payment verified."
        return False, "", self._error_message(response)

    def _post(self, url, payload):
        try:
            response = requests.post(url, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            raise PaymentGatewayError(f"Could not reach Zarinpal: {exc}") from exc

    @staticmethod
    def _error_message(response):
        errors = response.get("errors") or {}
        if isinstance(errors, dict):
            return errors.get("message", "Zarinpal rejected the payment request.")
        return "Zarinpal rejected the payment request."
