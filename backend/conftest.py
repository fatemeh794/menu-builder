import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.restaurants.models import Restaurant, RestaurantMembership

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_user(db):
    def _make(username="owner", email=None, password="testpass123"):
        return User.objects.create_user(
            username=username, email=email or f"{username}@example.com", password=password
        )

    return _make


@pytest.fixture
def make_restaurant(db):
    def _make(name="Golden Fork", **kwargs):
        return Restaurant.objects.create(name=name, **kwargs)

    return _make


@pytest.fixture
def make_membership(db):
    def _make(user, restaurant, role=RestaurantMembership.Role.OWNER):
        return RestaurantMembership.objects.create(user=user, restaurant=restaurant, role=role)

    return _make


@pytest.fixture
def auth_client(api_client, make_user):
    def _make(user=None):
        user = user or make_user()
        api_client.force_authenticate(user=user)
        return api_client, user

    return _make
