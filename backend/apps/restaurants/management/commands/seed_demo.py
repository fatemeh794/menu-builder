import io
import time

import requests
from django.contrib.auth import get_user_model
from django.core.files.images import ImageFile
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.menu.models import Category, MenuItem, MenuItemOption, MenuItemOptionGroup
from apps.restaurants.models import Restaurant, RestaurantMembership
from apps.tables.models import Table

User = get_user_model()

DEMO_OWNER_USERNAME = "owner"
DEMO_OWNER_EMAIL = "owner@goldenfork.demo"
DEMO_OWNER_PASSWORD = "DemoPass123!"

IMAGE_FETCH_TIMEOUT_SECONDS = 8

MENU = {
    "برگرها": [
        {
            "name": "برگر کلاسیک",
            "description": "پاتی گوشت گوساله آبدار، پنیر چدار، کاهو و گوجه",
            "price": 129000,
            "image_url": "https://loremflickr.com/500/400/burger,food?lock=205",
            "is_customizable": True,
            "option_groups": [
                {
                    "name": "نوع نان",
                    "type": "SINGLE",
                    "required": True,
                    "options": [
                        ("معمولی", 0, True),
                        ("سبوس‌دار", 10000, False),
                        ("بدون گلوتن", 20000, False),
                    ],
                },
                {
                    "name": "سس",
                    "type": "MULTIPLE",
                    "required": False,
                    "min_select": 0,
                    "max_select": 3,
                    "options": [
                        ("کچاپ", 0, False),
                        ("باربیکیو", 10000, False),
                        ("سس سیر", 10000, False),
                        ("مایونز تند", 10000, False),
                    ],
                },
            ],
        },
        {
            "name": "چیزبرگر",
            "description": "دو لایه پنیر چدار، خیارشور و سس مخصوص",
            "price": 139000,
            "image_url": "https://loremflickr.com/500/400/cheeseburger?lock=33",
            "option_groups": [],
        },
    ],
    "پیتزاها": [
        {
            "name": "پیتزا مارگاریتا",
            "description": "گوجه، موزارلا و ریحان تازه",
            "price": 189000,
            "image_url": "https://loremflickr.com/500/400/pizza?lock=777",
            "option_groups": [
                {
                    "name": "اندازه",
                    "type": "SINGLE",
                    "required": True,
                    "options": [("متوسط", 0, True), ("بزرگ", 40000, False)],
                },
            ],
        },
        {
            "name": "پیتزا پپرونی",
            "description": "مملو از پپرونی و پنیر موزارلا",
            "price": 209000,
            "image_url": "https://loremflickr.com/500/400/pepperoni,pizza?lock=88",
            "option_groups": [],
        },
    ],
    "سالادها": [
        {
            "name": "سالاد سزار",
            "description": "کاهوی رومی، پنیر پارمزان، نان تست و سس سزار",
            "price": 99000,
            "image_url": "https://loremflickr.com/500/400/salad?lock=15",
            "option_groups": [],
        },
    ],
    "نوشیدنی‌ها": [
        {
            "name": "آب پرتقال تازه",
            "description": "تازه‌گرفته‌شده",
            "price": 49000,
            "image_url": "https://loremflickr.com/500/400/orange,juice?lock=61",
            "option_groups": [],
        },
        {
            "name": "آب گازدار",
            "description": "",
            "price": 29000,
            "image_url": "https://loremflickr.com/500/400/watercarafe?lock=3",
            "option_groups": [],
        },
    ],
    "دسرها": [
        {
            "name": "کیک لاوا شکلاتی",
            "description": "کیک گرم با مغز شکلات مذاب",
            "price": 79000,
            "image_url": "https://loremflickr.com/500/400/cake?lock=91",
            "option_groups": [],
        },
    ],
}

TABLE_LABELS = [f"Table {i}" for i in range(1, 7)]


class Command(BaseCommand):
    help = "Seeds a demo restaurant (menu, options, tables, owner login) for presentations."

    @transaction.atomic
    def handle(self, *args, **options):
        restaurant = self._seed_restaurant()
        self._seed_owner(restaurant)
        self._seed_menu(restaurant)
        self._seed_tables(restaurant)

        self.stdout.write(self.style.SUCCESS("\nDemo data ready."))
        self.stdout.write(f"  Restaurant slug: {restaurant.slug}")
        self.stdout.write(f"  Dashboard login: {DEMO_OWNER_USERNAME} / {DEMO_OWNER_PASSWORD}")
        first_table = restaurant.tables.first()
        if first_table:
            url = f"/menu/{restaurant.slug}/table/{first_table.secure_token}"
            self.stdout.write(f"  Sample customer menu URL: {url}")

    def _seed_restaurant(self) -> Restaurant:
        restaurant, created = Restaurant.objects.get_or_create(
            slug="golden-fork",
            defaults=dict(
                name="Golden Fork",
                description="برگر و پیتزای درجه یک و موارد دیگر.",
                theme_primary_color="#E63946",
                theme_secondary_color="#1D3557",
                theme_background_color="#FFFFFF",
                theme_border_radius=16,
            ),
        )
        self.stdout.write(("Created" if created else "Found") + f" restaurant '{restaurant.name}'")
        return restaurant

    def _seed_owner(self, restaurant: Restaurant) -> None:
        user, created = User.objects.get_or_create(
            username=DEMO_OWNER_USERNAME, defaults={"email": DEMO_OWNER_EMAIL}
        )
        if created:
            user.set_password(DEMO_OWNER_PASSWORD)
            user.save(update_fields=["password"])
        RestaurantMembership.objects.get_or_create(
            user=user, restaurant=restaurant, defaults={"role": RestaurantMembership.Role.OWNER}
        )

    def _fetch_image(self, url: str, filename: str, attempts: int = 3) -> ImageFile | None:
        """Best-effort download for demo photography - a network hiccup here
        should never break the whole seed, just leave that item without a
        photo (the frontend already has a placeholder for that case).
        LoremFlickr occasionally 500s transiently, so a couple of retries
        clear up most failures without needing a manual re-run."""
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                response = requests.get(url, timeout=IMAGE_FETCH_TIMEOUT_SECONDS)
                response.raise_for_status()
                return ImageFile(io.BytesIO(response.content), name=filename)
            except requests.RequestException as exc:
                last_error = exc
                if attempt < attempts:
                    time.sleep(1.5 * attempt)
        self.stdout.write(self.style.WARNING(f"  Could not fetch demo photo {url}: {last_error}"))
        return None

    def _seed_menu(self, restaurant: Restaurant) -> None:
        for order, (category_name, items) in enumerate(MENU.items()):
            category, _ = Category.objects.get_or_create(
                restaurant=restaurant, name=category_name, defaults={"order": order}
            )
            for item_data in items:
                item, created = MenuItem.objects.get_or_create(
                    restaurant=restaurant,
                    category=category,
                    name=item_data["name"],
                    defaults={
                        "description": item_data["description"],
                        "base_price": item_data["price"],
                        "is_customizable": item_data.get("is_customizable", False),
                    },
                )
                # Backfill the photo even on a re-run of an already-existing
                # item - a prior run may have created the row but failed to
                # download its image (LoremFlickr occasionally 500s), and
                # `created` alone would otherwise skip it forever.
                image_url = item_data.get("image_url")
                if image_url and not item.image:
                    slug = item_data["name"].lower().replace(" ", "-")
                    image_file = self._fetch_image(image_url, f"{slug}.jpg")
                    if image_file:
                        item.image.save(image_file.name, image_file, save=True)

                if not created:
                    continue

                for group_data in item_data["option_groups"]:
                    group = MenuItemOptionGroup.objects.create(
                        menu_item=item,
                        name=group_data["name"],
                        selection_type=group_data["type"],
                        is_required=group_data["required"],
                        min_select=group_data.get("min_select", 0),
                        max_select=group_data.get("max_select"),
                    )
                    for name, extra_price, is_default in group_data["options"]:
                        MenuItemOption.objects.create(
                            option_group=group,
                            name=name,
                            extra_price=extra_price,
                            is_default=is_default,
                        )
        self.stdout.write(
            f"Seeded menu ({MenuItem.objects.filter(restaurant=restaurant).count()} items)"
        )

    def _seed_tables(self, restaurant: Restaurant) -> None:
        for label in TABLE_LABELS:
            Table.objects.get_or_create(restaurant=restaurant, label=label)
        self.stdout.write(f"Seeded {len(TABLE_LABELS)} tables")
