from apps.payments.gateways.base import PaymentGateway, PaymentGatewayError
from apps.payments.gateways.zarinpal import ZarinpalPaymentGateway

__all__ = ["PaymentGateway", "PaymentGatewayError", "ZarinpalPaymentGateway", "get_gateway"]


def get_gateway(name: str) -> PaymentGateway:
    """Small registry so call sites depend on a gateway name (stored on
    Payment.gateway), not a concrete class - adding a second provider
    later means adding one entry here, not touching any call site."""
    registry = {"ZARINPAL": ZarinpalPaymentGateway}
    try:
        return registry[name]()
    except KeyError as exc:
        raise ValueError(f"Unknown payment gateway: {name}") from exc
