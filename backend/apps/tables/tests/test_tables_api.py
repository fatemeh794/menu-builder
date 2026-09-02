import pytest

from apps.restaurants.models import RestaurantMembership
from apps.tables.models import Table


@pytest.mark.django_db
class TestPublicTableApi:
    def test_valid_qr_token_resolves_the_table(self, api_client, make_restaurant):
        restaurant = make_restaurant()
        table = Table.objects.create(restaurant=restaurant, label="Table 5")

        response = api_client.get(f"/api/v1/tables/{restaurant.slug}/{table.secure_token}/")
        assert response.status_code == 200
        assert response.data["label"] == "Table 5"

    def test_guessed_or_wrong_token_is_rejected(self, api_client, make_restaurant):
        restaurant = make_restaurant()
        Table.objects.create(restaurant=restaurant, label="Table 5")

        response = api_client.get(f"/api/v1/tables/{restaurant.slug}/not-the-real-token/")
        assert response.status_code == 404

    def test_inactive_table_is_rejected(self, api_client, make_restaurant):
        restaurant = make_restaurant()
        table = Table.objects.create(restaurant=restaurant, label="Table 5", is_active=False)

        response = api_client.get(f"/api/v1/tables/{restaurant.slug}/{table.secure_token}/")
        assert response.status_code == 404


@pytest.mark.django_db
class TestDashboardTableApi:
    def test_owner_can_create_table_and_download_its_qr_code(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant = make_restaurant()
        client, user = auth_client()
        make_membership(user, restaurant, role=RestaurantMembership.Role.OWNER)

        create_response = client.post(
            f"/api/v1/dashboard/{restaurant.slug}/tables/", {"label": "Table 1"}
        )
        assert create_response.status_code == 201
        table_id = create_response.data["id"]
        assert "customer_url" in create_response.data

        qr_response = client.get(f"/api/v1/dashboard/{restaurant.slug}/tables/{table_id}/qr-code/")
        assert qr_response.status_code == 200
        assert qr_response["Content-Type"] == "image/png"

    def test_two_restaurants_can_each_have_a_table_with_the_same_label(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant_a = make_restaurant(name="Golden Fork")
        restaurant_b = make_restaurant(name="Silver Spoon")
        client, user = auth_client()
        make_membership(user, restaurant_a, role=RestaurantMembership.Role.OWNER)
        make_membership(user, restaurant_b, role=RestaurantMembership.Role.OWNER)

        response_a = client.post(f"/api/v1/dashboard/{restaurant_a.slug}/tables/", {"label": "1"})
        response_b = client.post(f"/api/v1/dashboard/{restaurant_b.slug}/tables/", {"label": "1"})

        assert response_a.status_code == 201
        assert response_b.status_code == 201

    def test_staff_cannot_list_tables_of_a_restaurant_they_do_not_belong_to(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant_a = make_restaurant(name="Golden Fork")
        restaurant_b = make_restaurant(name="Silver Spoon")
        Table.objects.create(restaurant=restaurant_b, label="Table 1")
        client, user = auth_client()
        make_membership(user, restaurant_a, role=RestaurantMembership.Role.OWNER)

        response = client.get(f"/api/v1/dashboard/{restaurant_b.slug}/tables/")
        assert response.status_code == 403
