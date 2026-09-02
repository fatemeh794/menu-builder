import pytest
import responses

from apps.menu.models import Category, MenuItem, MenuItemOption, MenuItemOptionGroup
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.restaurants.models import RestaurantMembership
from apps.tables.models import Table

REQUEST_URL = "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
VERIFY_URL = "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"


@pytest.mark.django_db
class TestFullGuestJourney:
    @responses.activate
    def test_scan_browse_order_pay_and_track(
        self, api_client, auth_client, make_restaurant, make_membership
    ):
        # --- Restaurant setup (staff side) ---
        restaurant = make_restaurant(name="Golden Fork")
        table = Table.objects.create(restaurant=restaurant, label="Table 5")
        category = Category.objects.create(restaurant=restaurant, name="Burgers")
        item = MenuItem.objects.create(
            restaurant=restaurant, category=category, name="Classic Burger", base_price=120000
        )
        bread = MenuItemOptionGroup.objects.create(
            menu_item=item, name="Bread", selection_type="SINGLE", is_required=True
        )
        regular = MenuItemOption.objects.create(option_group=bread, name="Regular")

        # --- Step 1: QR scan resolves the table ---
        scan_response = api_client.get(f"/api/v1/tables/{restaurant.slug}/{table.secure_token}/")
        assert scan_response.status_code == 200

        # --- Step 2: customer browses the menu ---
        menu_response = api_client.get(f"/api/v1/menu/{restaurant.slug}/items/")
        assert menu_response.status_code == 200
        assert menu_response.data[0]["name"] == "Classic Burger"

        # --- Step 3: guest places the order, no login ---
        order_response = api_client.post(
            "/api/v1/orders/",
            {
                "restaurant_slug": restaurant.slug,
                "table_token": table.secure_token,
                "customer_name": "Ali",
                "customer_phone": "09120000000",
                "items": [
                    {"menu_item_id": str(item.id), "quantity": 1, "option_ids": [str(regular.id)]}
                ],
            },
            format="json",
        )
        assert order_response.status_code == 201
        order_token = order_response.data["secure_order_token"]
        assert order_response.data["total_amount"] == 120000

        # --- Step 4: guest pays via Zarinpal ---
        responses.add(
            responses.POST,
            REQUEST_URL,
            json={"data": {"code": 100, "authority": "A1"}},
            status=200,
        )
        pay_response = api_client.post(f"/api/v1/payments/{order_token}/create/")
        assert pay_response.status_code == 201
        assert "StartPay/A1" in pay_response.data["redirect_url"]

        # --- Step 5: Zarinpal redirects back to our callback ---
        responses.add(
            responses.POST,
            VERIFY_URL,
            json={"data": {"code": 100, "ref_id": 42}},
            status=200,
        )
        callback_response = api_client.get(
            "/api/v1/payments/callback/", {"Authority": "A1", "Status": "OK"}
        )
        assert callback_response.status_code == 302
        assert f"/orders/{order_token}/result?status=success" in callback_response.url

        # --- Step 6: guest tracks the now-confirmed, paid order ---
        track_response = api_client.get(f"/api/v1/orders/track/{order_token}/")
        assert track_response.status_code == 200
        assert track_response.data["status"] == Order.Status.CONFIRMED
        assert track_response.data["is_paid"] is True

        # --- Step 7: restaurant staff sees it on their dashboard and moves it along ---
        order = Order.objects.get(secure_order_token=order_token)
        assert Payment.objects.get(order=order).status == Payment.Status.SUCCESS

        client, user = auth_client()
        make_membership(user, restaurant, role=RestaurantMembership.Role.STAFF)
        dashboard_list = client.get(f"/api/v1/dashboard/{restaurant.slug}/orders/")
        assert dashboard_list.data["count"] == 1

        status_update = client.patch(
            f"/api/v1/dashboard/{restaurant.slug}/orders/{order.id}/",
            {"status": Order.Status.PREPARING},
        )
        assert status_update.status_code == 200
