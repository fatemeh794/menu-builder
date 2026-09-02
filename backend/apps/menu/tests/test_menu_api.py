import pytest

from apps.menu.models import Category, MenuItem, MenuItemOptionGroup
from apps.restaurants.models import RestaurantMembership


@pytest.fixture
def make_category(db):
    def _make(restaurant, name="Burgers", **kwargs):
        return Category.objects.create(restaurant=restaurant, name=name, **kwargs)

    return _make


@pytest.fixture
def make_menu_item(db):
    def _make(restaurant, category, name="Classic Burger", base_price=120000, **kwargs):
        return MenuItem.objects.create(
            restaurant=restaurant, category=category, name=name, base_price=base_price, **kwargs
        )

    return _make


@pytest.mark.django_db
class TestPublicMenuApi:
    def test_categories_and_items_are_scoped_to_the_restaurant_in_the_url(
        self, api_client, make_restaurant, make_category, make_menu_item
    ):
        restaurant_a = make_restaurant(name="Golden Fork")
        restaurant_b = make_restaurant(name="Silver Spoon")
        category_a = make_category(restaurant_a, name="Burgers")
        make_category(restaurant_b, name="Pizzas")
        make_menu_item(restaurant_a, category_a, name="Classic Burger")

        categories_response = api_client.get(f"/api/v1/menu/{restaurant_a.slug}/categories/")
        items_response = api_client.get(f"/api/v1/menu/{restaurant_a.slug}/items/")

        assert categories_response.status_code == 200
        assert [c["name"] for c in categories_response.data] == ["Burgers"]
        assert items_response.status_code == 200
        assert [i["name"] for i in items_response.data] == ["Classic Burger"]

    def test_inactive_items_are_hidden_from_the_public_menu(
        self, api_client, make_restaurant, make_category, make_menu_item
    ):
        restaurant = make_restaurant()
        category = make_category(restaurant)
        make_menu_item(restaurant, category, name="Hidden Item", is_active=False)

        response = api_client.get(f"/api/v1/menu/{restaurant.slug}/items/")
        assert response.data == []

    def test_search_filters_items_by_name(
        self, api_client, make_restaurant, make_category, make_menu_item
    ):
        restaurant = make_restaurant()
        category = make_category(restaurant)
        make_menu_item(restaurant, category, name="Classic Burger")
        make_menu_item(restaurant, category, name="Margherita Pizza")

        response = api_client.get(f"/api/v1/menu/{restaurant.slug}/items/?search=pizza")
        assert [i["name"] for i in response.data] == ["Margherita Pizza"]


@pytest.mark.django_db
class TestDashboardMenuApi:
    def test_owner_can_create_category_and_item_with_option_groups(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant = make_restaurant()
        client, user = auth_client()
        make_membership(user, restaurant, role=RestaurantMembership.Role.OWNER)

        category_response = client.post(
            f"/api/v1/dashboard/{restaurant.slug}/categories/", {"name": "Burgers"}
        )
        assert category_response.status_code == 201
        category_id = category_response.data["id"]

        item_response = client.post(
            f"/api/v1/dashboard/{restaurant.slug}/items/",
            {"category": category_id, "name": "Classic Burger", "base_price": 120000},
        )
        assert item_response.status_code == 201
        item_id = item_response.data["id"]

        group_response = client.post(
            f"/api/v1/dashboard/{restaurant.slug}/items/{item_id}/option-groups/",
            {
                "name": "Bread type",
                "selection_type": "SINGLE",
                "is_required": True,
                "options": [
                    {"name": "Regular", "extra_price": 0, "is_default": True},
                    {"name": "Whole wheat", "extra_price": 10000},
                ],
            },
            format="json",
        )
        assert group_response.status_code == 201
        assert MenuItemOptionGroup.objects.get(id=group_response.data["id"]).options.count() == 2

        public_items = client.get(f"/api/v1/menu/{restaurant.slug}/items/")
        assert public_items.data[0]["option_groups"][0]["options"][0]["name"] == "Regular"

    def test_cannot_attach_category_from_another_restaurant_to_an_item(
        self, auth_client, make_restaurant, make_category, make_membership
    ):
        restaurant_a = make_restaurant(name="Golden Fork")
        restaurant_b = make_restaurant(name="Silver Spoon")
        foreign_category = make_category(restaurant_b, name="Pizzas")
        client, user = auth_client()
        make_membership(user, restaurant_a, role=RestaurantMembership.Role.OWNER)

        response = client.post(
            f"/api/v1/dashboard/{restaurant_a.slug}/items/",
            {"category": str(foreign_category.id), "name": "Sneaky Item", "base_price": 1000},
        )
        assert response.status_code == 400

    def test_staff_cannot_manage_option_groups_for_an_item_in_another_restaurant(
        self, auth_client, make_restaurant, make_category, make_menu_item, make_membership
    ):
        restaurant_a = make_restaurant(name="Golden Fork")
        restaurant_b = make_restaurant(name="Silver Spoon")
        category_b = make_category(restaurant_b)
        item_b = make_menu_item(restaurant_b, category_b, name="Foreign Item")
        client, user = auth_client()
        make_membership(user, restaurant_a, role=RestaurantMembership.Role.OWNER)

        response = client.get(
            f"/api/v1/dashboard/{restaurant_a.slug}/items/{item_b.id}/option-groups/"
        )
        assert response.status_code == 404
