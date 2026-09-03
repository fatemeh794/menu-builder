import pytest
from django.core.management import call_command

from apps.menu.models import Category, MenuItem
from apps.restaurants.models import Restaurant, RestaurantMembership
from apps.tables.models import Table


@pytest.mark.django_db
class TestSeedDemoCommand:
    def test_seed_creates_a_presentable_demo_restaurant(self):
        call_command("seed_demo")

        restaurant = Restaurant.objects.get(slug="golden-fork")
        assert Category.objects.filter(restaurant=restaurant).count() > 0
        assert MenuItem.objects.filter(restaurant=restaurant).count() > 0
        assert Table.objects.filter(restaurant=restaurant).count() > 0
        assert RestaurantMembership.objects.filter(
            restaurant=restaurant, role=RestaurantMembership.Role.OWNER
        ).exists()

    def test_seed_is_idempotent(self):
        call_command("seed_demo")
        call_command("seed_demo")

        assert Restaurant.objects.filter(slug="golden-fork").count() == 1
        restaurant = Restaurant.objects.get(slug="golden-fork")
        item_count = MenuItem.objects.filter(restaurant=restaurant).count()

        call_command("seed_demo")
        assert MenuItem.objects.filter(restaurant=restaurant).count() == item_count
