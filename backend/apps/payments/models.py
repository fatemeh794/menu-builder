from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.orders.models import Order


class Payment(UUIDModel, TimeStampedModel):
    class Gateway(models.TextChoices):
        ZARINPAL = "ZARINPAL", "Zarinpal"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    amount = models.PositiveIntegerField(help_text="Amount in Toman, recomputed server-side")
    gateway = models.CharField(max_length=20, choices=Gateway.choices, default=Gateway.ZARINPAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    authority = models.CharField(max_length=100, unique=True, null=True, blank=True)
    ref_id = models.CharField(max_length=100, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} for order {self.order_id} ({self.status})"
