from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.core.models import TimeStampedModel, UUIDModel


class Restaurant(UUIDModel, TimeStampedModel):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, blank=True, allow_unicode=True)
    description = models.TextField(blank=True)

    logo = models.ImageField(upload_to="restaurants/logos/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="restaurants/covers/", blank=True, null=True)

    theme_primary_color = models.CharField(max_length=7, default="#E63946")
    theme_secondary_color = models.CharField(max_length=7, default="#1D3557")
    theme_background_color = models.CharField(max_length=7, default="#FFFFFF")
    theme_border_radius = models.PositiveSmallIntegerField(default=16)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True) or str(self.id)
        super().save(*args, **kwargs)


class RestaurantMembership(TimeStampedModel):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        MANAGER = "MANAGER", "Manager"
        STAFF = "STAFF", "Staff"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="restaurant_memberships",
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "restaurant"], name="unique_user_per_restaurant"
            )
        ]
        ordering = ["restaurant", "role"]

    def __str__(self):
        return f"{self.user} @ {self.restaurant} ({self.role})"
