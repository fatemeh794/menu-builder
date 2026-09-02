from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.restaurants.models import Restaurant


class Category(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to="menu/categories/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return f"{self.name} ({self.restaurant.name})"


class MenuItem(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="items")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    base_price = models.PositiveIntegerField(help_text="Price in Toman")
    image = models.ImageField(upload_to="menu/items/", blank=True, null=True)
    is_available = models.BooleanField(default=True, help_text="In stock right now")
    is_active = models.BooleanField(default=True, help_text="Visible on the menu at all")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name

    def clean(self):
        if self.category_id and self.category.restaurant_id != self.restaurant_id:
            raise ValidationError("Category must belong to the same restaurant as the item.")


class MenuItemOptionGroup(UUIDModel, TimeStampedModel):
    class SelectionType(models.TextChoices):
        SINGLE = "SINGLE", "Single choice"
        MULTIPLE = "MULTIPLE", "Multiple choice"

    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="option_groups")
    name = models.CharField(max_length=100)
    selection_type = models.CharField(
        max_length=10, choices=SelectionType.choices, default=SelectionType.SINGLE
    )
    is_required = models.BooleanField(default=False)
    min_select = models.PositiveSmallIntegerField(default=0)
    max_select = models.PositiveSmallIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.name} ({self.menu_item.name})"


class MenuItemOption(UUIDModel, TimeStampedModel):
    option_group = models.ForeignKey(
        MenuItemOptionGroup, on_delete=models.CASCADE, related_name="options"
    )
    name = models.CharField(max_length=100)
    extra_price = models.PositiveIntegerField(default=0, help_text="Extra price in Toman")
    is_default = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.name} (+{self.extra_price})"
