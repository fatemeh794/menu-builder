import pytest

from apps.restaurants.models import RestaurantMembership


@pytest.mark.django_db
class TestTenantIsolation:
    def test_public_menu_endpoint_returns_restaurant_by_slug(self, api_client, make_restaurant):
        restaurant = make_restaurant(name="Golden Fork")
        response = api_client.get(f"/api/v1/menu/{restaurant.slug}/")
        assert response.status_code == 200
        assert response.data["slug"] == restaurant.slug

    def test_staff_cannot_access_settings_of_a_restaurant_they_are_not_a_member_of(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant_a = make_restaurant(name="Golden Fork")
        restaurant_b = make_restaurant(name="Silver Spoon")
        client, user = auth_client()
        make_membership(user, restaurant_a, role=RestaurantMembership.Role.OWNER)

        own_response = client.get(f"/api/v1/dashboard/{restaurant_a.slug}/settings/")
        other_response = client.get(f"/api/v1/dashboard/{restaurant_b.slug}/settings/")

        assert own_response.status_code == 200
        assert other_response.status_code == 403

    def test_staff_role_cannot_manage_staff_but_owner_can(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant = make_restaurant(name="Golden Fork")
        client, user = auth_client()
        make_membership(user, restaurant, role=RestaurantMembership.Role.STAFF)

        response = client.get(f"/api/v1/dashboard/{restaurant.slug}/staff/")
        assert response.status_code == 403

    def test_my_restaurants_only_lists_restaurants_the_user_belongs_to(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant_a = make_restaurant(name="Golden Fork")
        make_restaurant(name="Silver Spoon")
        client, user = auth_client()
        make_membership(user, restaurant_a, role=RestaurantMembership.Role.OWNER)

        response = client.get("/api/v1/dashboard/restaurants/")
        assert response.status_code == 200
        slugs = [item["restaurant"]["slug"] for item in response.data["results"]]
        assert slugs == [restaurant_a.slug]
