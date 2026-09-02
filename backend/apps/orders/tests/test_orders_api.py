import pytest

from apps.menu.models import Category, MenuItem, MenuItemOption, MenuItemOptionGroup
from apps.orders.models import Order
from apps.restaurants.models import RestaurantMembership
from apps.tables.models import Table


@pytest.fixture
def menu_setup(db, make_restaurant):
    restaurant = make_restaurant(name="Golden Fork")
    table = Table.objects.create(restaurant=restaurant, label="Table 5")
    category = Category.objects.create(restaurant=restaurant, name="Burgers")
    item = MenuItem.objects.create(
        restaurant=restaurant, category=category, name="Classic Burger", base_price=120000
    )
    bread_group = MenuItemOptionGroup.objects.create(
        menu_item=item,
        name="Bread type",
        selection_type=MenuItemOptionGroup.SelectionType.SINGLE,
        is_required=True,
    )
    regular = MenuItemOption.objects.create(
        option_group=bread_group, name="Regular", extra_price=0, is_default=True
    )
    whole_wheat = MenuItemOption.objects.create(
        option_group=bread_group, name="Whole wheat", extra_price=10000
    )
    sauce_group = MenuItemOptionGroup.objects.create(
        menu_item=item,
        name="Sauce",
        selection_type=MenuItemOptionGroup.SelectionType.MULTIPLE,
        min_select=0,
        max_select=2,
    )
    bbq = MenuItemOption.objects.create(option_group=sauce_group, name="BBQ", extra_price=5000)
    ketchup = MenuItemOption.objects.create(option_group=sauce_group, name="Ketchup", extra_price=0)
    garlic = MenuItemOption.objects.create(
        option_group=sauce_group, name="Garlic Mayo", extra_price=5000
    )
    return {
        "restaurant": restaurant,
        "table": table,
        "item": item,
        "regular": regular,
        "whole_wheat": whole_wheat,
        "bbq": bbq,
        "ketchup": ketchup,
        "garlic": garlic,
    }


@pytest.mark.django_db
class TestGuestOrderCreation:
    def test_price_is_computed_server_side_from_options_and_quantity(self, api_client, menu_setup):
        payload = {
            "restaurant_slug": menu_setup["restaurant"].slug,
            "table_token": menu_setup["table"].secure_token,
            "customer_name": "Ali",
            "customer_phone": "09120000000",
            "note": "",
            "items": [
                {
                    "menu_item_id": str(menu_setup["item"].id),
                    "quantity": 2,
                    "option_ids": [
                        str(menu_setup["whole_wheat"].id),
                        str(menu_setup["bbq"].id),
                    ],
                }
            ],
        }
        response = api_client.post("/api/v1/orders/", payload, format="json")
        assert response.status_code == 201
        # (120000 base + 10000 bread + 5000 sauce) * 2 = 270000
        assert response.data["total_amount"] == 270000
        assert response.data["status"] == Order.Status.PENDING
        assert "secure_order_token" in response.data

    def test_client_supplied_price_is_ignored(self, api_client, menu_setup):
        payload = {
            "restaurant_slug": menu_setup["restaurant"].slug,
            "table_token": menu_setup["table"].secure_token,
            "customer_name": "Ali",
            "customer_phone": "09120000000",
            "items": [
                {
                    "menu_item_id": str(menu_setup["item"].id),
                    "quantity": 1,
                    "option_ids": [str(menu_setup["regular"].id)],
                    # not a real field - proves the server never trusts client price input
                    "total_amount": 1,
                }
            ],
        }
        response = api_client.post("/api/v1/orders/", payload, format="json")
        assert response.status_code == 201
        assert response.data["total_amount"] == 120000

    def test_required_option_group_without_selection_is_rejected(self, api_client, menu_setup):
        payload = {
            "restaurant_slug": menu_setup["restaurant"].slug,
            "table_token": menu_setup["table"].secure_token,
            "customer_name": "Ali",
            "customer_phone": "09120000000",
            "items": [
                {"menu_item_id": str(menu_setup["item"].id), "quantity": 1, "option_ids": []}
            ],
        }
        response = api_client.post("/api/v1/orders/", payload, format="json")
        assert response.status_code == 400

    def test_exceeding_max_select_on_a_multiple_group_is_rejected(self, api_client, menu_setup):
        payload = {
            "restaurant_slug": menu_setup["restaurant"].slug,
            "table_token": menu_setup["table"].secure_token,
            "customer_name": "Ali",
            "customer_phone": "09120000000",
            "items": [
                {
                    "menu_item_id": str(menu_setup["item"].id),
                    "quantity": 1,
                    "option_ids": [
                        str(menu_setup["regular"].id),
                        str(menu_setup["bbq"].id),
                        str(menu_setup["ketchup"].id),
                        str(menu_setup["garlic"].id),
                    ],
                }
            ],
        }
        response = api_client.post("/api/v1/orders/", payload, format="json")
        assert response.status_code == 400

    def test_unavailable_item_cannot_be_ordered(self, api_client, menu_setup):
        menu_setup["item"].is_available = False
        menu_setup["item"].save()
        payload = {
            "restaurant_slug": menu_setup["restaurant"].slug,
            "table_token": menu_setup["table"].secure_token,
            "customer_name": "Ali",
            "customer_phone": "09120000000",
            "items": [
                {
                    "menu_item_id": str(menu_setup["item"].id),
                    "quantity": 1,
                    "option_ids": [str(menu_setup["regular"].id)],
                }
            ],
        }
        response = api_client.post("/api/v1/orders/", payload, format="json")
        assert response.status_code == 400

    def test_invalid_table_token_is_rejected(self, api_client, menu_setup):
        payload = {
            "restaurant_slug": menu_setup["restaurant"].slug,
            "table_token": "not-a-real-token",
            "customer_name": "Ali",
            "customer_phone": "09120000000",
            "items": [
                {
                    "menu_item_id": str(menu_setup["item"].id),
                    "quantity": 1,
                    "option_ids": [str(menu_setup["regular"].id)],
                }
            ],
        }
        response = api_client.post("/api/v1/orders/", payload, format="json")
        assert response.status_code == 404


@pytest.mark.django_db
class TestOrderTracking:
    def test_customer_can_track_their_own_order_without_login(self, api_client, menu_setup):
        create_response = api_client.post(
            "/api/v1/orders/",
            {
                "restaurant_slug": menu_setup["restaurant"].slug,
                "table_token": menu_setup["table"].secure_token,
                "customer_name": "Ali",
                "customer_phone": "09120000000",
                "items": [
                    {
                        "menu_item_id": str(menu_setup["item"].id),
                        "quantity": 1,
                        "option_ids": [str(menu_setup["regular"].id)],
                    }
                ],
            },
            format="json",
        )
        token = create_response.data["secure_order_token"]

        track_response = api_client.get(f"/api/v1/orders/track/{token}/")
        assert track_response.status_code == 200
        assert track_response.data["customer_name"] == "Ali"

    def test_wrong_token_cannot_track_someone_elses_order(self, api_client, menu_setup):
        response = api_client.get("/api/v1/orders/track/guessed-token/")
        assert response.status_code == 404


@pytest.mark.django_db
class TestDashboardOrders:
    def test_staff_sees_only_their_restaurants_orders(
        self, auth_client, menu_setup, make_restaurant, make_membership
    ):
        other_restaurant = make_restaurant(name="Silver Spoon")
        Order.objects.create(
            restaurant=other_restaurant, customer_name="Someone Else", customer_phone="0"
        )
        client, user = auth_client()
        make_membership(user, menu_setup["restaurant"], role=RestaurantMembership.Role.STAFF)

        response = client.get(f"/api/v1/dashboard/{menu_setup['restaurant'].slug}/orders/")
        assert response.status_code == 200
        assert response.data["count"] == 0

    def test_staff_can_progress_order_status(self, auth_client, menu_setup, make_membership):
        order = Order.objects.create(
            restaurant=menu_setup["restaurant"],
            table=menu_setup["table"],
            customer_name="Ali",
            customer_phone="09120000000",
        )
        client, user = auth_client()
        make_membership(user, menu_setup["restaurant"], role=RestaurantMembership.Role.STAFF)

        response = client.patch(
            f"/api/v1/dashboard/{menu_setup['restaurant'].slug}/orders/{order.id}/",
            {"status": Order.Status.CONFIRMED},
        )
        assert response.status_code == 200
        order.refresh_from_db()
        assert order.status == Order.Status.CONFIRMED

    def test_terminal_status_cannot_be_changed_again(
        self, auth_client, menu_setup, make_membership
    ):
        order = Order.objects.create(
            restaurant=menu_setup["restaurant"],
            customer_name="Ali",
            customer_phone="0",
            status=Order.Status.COMPLETED,
        )
        client, user = auth_client()
        make_membership(user, menu_setup["restaurant"], role=RestaurantMembership.Role.STAFF)

        response = client.patch(
            f"/api/v1/dashboard/{menu_setup['restaurant'].slug}/orders/{order.id}/",
            {"status": Order.Status.PREPARING},
        )
        assert response.status_code == 400
