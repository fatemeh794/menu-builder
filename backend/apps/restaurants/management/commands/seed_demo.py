from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.menu.models import Category, MenuItem, MenuItemOption, MenuItemOptionGroup
from apps.restaurants.models import Restaurant, RestaurantMembership
from apps.tables.models import Table

User = get_user_model()

DEMO_OWNER_USERNAME = "owner"
DEMO_OWNER_EMAIL = "owner@goldenfork.demo"
DEMO_OWNER_PASSWORD = "DemoPass123!"

MENU = {
    "Burgers": [
        {
            "name": "Classic Burger",
            "description": "Juicy beef patty, cheddar, lettuce, tomato",
            "price": 129000,
            "option_groups": [
                {
                    "name": "Bread type",
                    "type": "SINGLE",
                    "required": True,
                    "options": [
                        ("Regular", 0, True),
                        ("Whole wheat", 10000, False),
                        ("Gluten free", 20000, False),
                    ],
                },
                {
                    "name": "Sauce",
                    "type": "MULTIPLE",
                    "required": False,
                    "min_select": 0,
                    "max_select": 3,
                    "options": [
                        ("Ketchup", 0, False),
                        ("BBQ", 10000, False),
                        ("Garlic Mayo", 10000, False),
                        ("Spicy Mayo", 10000, False),
                    ],
                },
            ],
        },
        {
            "name": "Cheese Burger",
            "description": "Double cheddar, pickles, house sauce",
            "price": 139000,
            "option_groups": [],
        },
    ],
    "Pizzas": [
        {
            "name": "Margherita Pizza",
            "description": "Tomato, mozzarella, fresh basil",
            "price": 189000,
            "option_groups": [
                {
                    "name": "Size",
                    "type": "SINGLE",
                    "required": True,
                    "options": [("Medium", 0, True), ("Large", 40000, False)],
                },
            ],
        },
        {
            "name": "Pepperoni Pizza",
            "description": "Loaded with pepperoni and mozzarella",
            "price": 209000,
            "option_groups": [],
        },
    ],
    "Salads": [
        {
            "name": "Caesar Salad",
            "description": "Romaine, parmesan, croutons, Caesar dressing",
            "price": 99000,
            "option_groups": [],
        },
    ],
    "Drinks": [
        {
            "name": "Fresh Orange Juice",
            "description": "Freshly squeezed",
            "price": 49000,
            "option_groups": [],
        },
        {
            "name": "Sparkling Water",
            "description": "",
            "price": 29000,
            "option_groups": [],
        },
    ],
    "Desserts": [
        {
            "name": "Chocolate Lava Cake",
            "description": "Warm cake with a molten chocolate center",
            "price": 79000,
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
                description="Premium burgers, pizzas, and more.",
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
                    },
                )
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
