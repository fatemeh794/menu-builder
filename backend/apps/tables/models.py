import secrets

from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.restaurants.models import Restaurant


def generate_secure_token():
    return secrets.token_urlsafe(24)


class Table(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="tables")
    label = models.CharField(max_length=50, help_text='e.g. "Table 5"')
    secure_token = models.CharField(
        max_length=64, unique=True, default=generate_secure_token, editable=False
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["label"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "label"], name="unique_table_label")
        ]

    def __str__(self):
        return f"{self.label} ({self.restaurant.name})"
