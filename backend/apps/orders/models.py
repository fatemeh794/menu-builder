import secrets

from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.menu.models import MenuItem
from apps.restaurants.models import Restaurant
from apps.tables.models import Table


def generate_order_token():
    return secrets.token_urlsafe(32)


class Order(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    TERMINAL_STATUSES = (Status.COMPLETED, Status.CANCELLED)

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="orders")
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, related_name="orders")
    secure_order_token = models.CharField(
        max_length=64, unique=True, default=generate_order_token, editable=False
    )

    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)
    note = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_amount = models.PositiveIntegerField(default=0, help_text="Total in Toman")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.id} - {self.restaurant.name}"

    @property
    def is_paid(self):
        return self.payments.filter(status="SUCCESS").exists()


class OrderItem(UUIDModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.SET_NULL, null=True, related_name="order_items"
    )
    menu_item_name = models.CharField(max_length=150)
    unit_price = models.PositiveIntegerField(help_text="Base price snapshot, in Toman")
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.PositiveIntegerField(help_text="(unit_price + options) * quantity")

    def __str__(self):
        return f"{self.quantity}x {self.menu_item_name}"


class OrderItemOption(models.Model):
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="options")
    option_group_name = models.CharField(max_length=100)
    option_name = models.CharField(max_length=100)
    extra_price = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.option_group_name}: {self.option_name}"
