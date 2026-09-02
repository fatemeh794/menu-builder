from abc import ABC, abstractmethod


class PaymentGatewayError(Exception):
    """Raised when a gateway can't be reached or rejects a request for a
    reason the caller should surface to the user as a failed payment."""


class PaymentGateway(ABC):
    """Contract every payment provider implements. Call sites (views,
    services) only ever talk to this interface, never to a concrete
    gateway, so swapping or adding a provider doesn't ripple outward."""

    @abstractmethod
    def create_payment(self, payment) -> str:
        """Start a payment for `payment` (an apps.payments.models.Payment
        instance, not yet authorized). Returns the URL to redirect the
        customer to, and is expected to set `payment.authority`."""
        raise NotImplementedError

    @abstractmethod
    def verify_payment(self, authority: str, status: str) -> tuple[bool, str, str]:
        """Verify a callback for `authority`. Returns
        (success, ref_id, message)."""
        raise NotImplementedError
