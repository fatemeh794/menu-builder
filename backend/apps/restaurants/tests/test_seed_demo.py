import io
import re
from unittest.mock import patch

import pytest
import responses
from django.core.management import call_command
from PIL import Image

from apps.menu.models import Category, MenuItem
from apps.restaurants.models import Restaurant, RestaurantMembership
from apps.tables.models import Table


def _fake_jpeg_bytes() -> bytes:
    """A real, tiny, valid JPEG - just needs to be bytes ImageField will
    actually accept and store."""
    buffer = io.BytesIO()
    Image.new("RGB", (2, 2), color=(230, 57, 70)).save(buffer, format="JPEG")
    return buffer.getvalue()


FAKE_JPEG_BYTES = _fake_jpeg_bytes()


@pytest.fixture(autouse=True)
def _mock_demo_photo_downloads():
    """seed_demo fetches real stock photos from loremflickr.com - the
    tests care that a photo *attempt* happens and is attached, not about
    real network I/O being fast or reliable in CI."""
    with responses.RequestsMock(assert_all_requests_are_fired=False) as mock:
        mock.add(
            responses.GET,
            re.compile(r"https://loremflickr\.com/.*"),
            body=FAKE_JPEG_BYTES,
            content_type="image/jpeg",
        )
        yield mock


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

    def test_seed_attaches_a_photo_and_marks_the_customizable_item(self):
        call_command("seed_demo")

        restaurant = Restaurant.objects.get(slug="golden-fork")
        burger = MenuItem.objects.get(restaurant=restaurant, name="برگر کلاسیک")
        assert burger.image
        assert burger.is_customizable is True

    def test_seed_is_idempotent(self):
        call_command("seed_demo")
        call_command("seed_demo")

        assert Restaurant.objects.filter(slug="golden-fork").count() == 1
        restaurant = Restaurant.objects.get(slug="golden-fork")
        item_count = MenuItem.objects.filter(restaurant=restaurant).count()

        call_command("seed_demo")
        assert MenuItem.objects.filter(restaurant=restaurant).count() == item_count

    @patch("apps.restaurants.management.commands.seed_demo.time.sleep")
    def test_seed_backfills_a_photo_on_rerun_after_a_failed_download(self, _mock_sleep):
        with responses.RequestsMock(assert_all_requests_are_fired=False) as failing_mock:
            failing_mock.add(responses.GET, re.compile(r"https://loremflickr\.com/.*"), status=500)
            call_command("seed_demo")

        restaurant = Restaurant.objects.get(slug="golden-fork")
        burger = MenuItem.objects.get(restaurant=restaurant, name="برگر کلاسیک")
        assert not burger.image

        call_command("seed_demo")
        burger.refresh_from_db()
        assert burger.image
