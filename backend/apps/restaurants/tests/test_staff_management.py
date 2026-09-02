import pytest
from django.contrib.auth import get_user_model

from apps.restaurants.models import RestaurantMembership

User = get_user_model()


@pytest.mark.django_db
class TestStaffOnboarding:
    def test_owner_can_invite_a_brand_new_staff_member_by_email(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant = make_restaurant()
        client, owner = auth_client()
        make_membership(owner, restaurant, role=RestaurantMembership.Role.OWNER)

        response = client.post(
            f"/api/v1/dashboard/{restaurant.slug}/staff/",
            {
                "email": "new.staff@example.com",
                "first_name": "New",
                "last_name": "Staff",
                "password": "temporarypass123",
                "role": RestaurantMembership.Role.STAFF,
            },
        )

        assert response.status_code == 201
        assert response.data["user"]["email"] == "new.staff@example.com"
        assert response.data["role"] == RestaurantMembership.Role.STAFF
        new_user = User.objects.get(email="new.staff@example.com")
        assert new_user.check_password("temporarypass123")

    def test_owner_can_attach_an_existing_user_without_a_password(
        self, auth_client, make_restaurant, make_membership, make_user
    ):
        restaurant = make_restaurant()
        existing = make_user(username="existing", email="existing@example.com")
        client, owner = auth_client()
        make_membership(owner, restaurant, role=RestaurantMembership.Role.OWNER)

        response = client.post(
            f"/api/v1/dashboard/{restaurant.slug}/staff/",
            {"email": "existing@example.com", "role": RestaurantMembership.Role.MANAGER},
        )

        assert response.status_code == 201
        membership = RestaurantMembership.objects.get(user=existing, restaurant=restaurant)
        assert membership.role == RestaurantMembership.Role.MANAGER

    def test_new_staff_email_without_password_is_rejected(
        self, auth_client, make_restaurant, make_membership
    ):
        restaurant = make_restaurant()
        client, owner = auth_client()
        make_membership(owner, restaurant, role=RestaurantMembership.Role.OWNER)

        response = client.post(
            f"/api/v1/dashboard/{restaurant.slug}/staff/",
            {"email": "no.password@example.com", "role": RestaurantMembership.Role.STAFF},
        )
        assert response.status_code == 400

    def test_owner_can_list_and_remove_staff(
        self, auth_client, make_restaurant, make_membership, make_user
    ):
        restaurant = make_restaurant()
        staff_user = make_user(username="staffer", email="staffer@example.com")
        client, owner = auth_client()
        make_membership(owner, restaurant, role=RestaurantMembership.Role.OWNER)
        membership = make_membership(staff_user, restaurant, role=RestaurantMembership.Role.STAFF)

        list_response = client.get(f"/api/v1/dashboard/{restaurant.slug}/staff/")
        assert list_response.data["count"] == 2

        delete_response = client.delete(
            f"/api/v1/dashboard/{restaurant.slug}/staff/{membership.id}/"
        )
        assert delete_response.status_code == 204
        assert not RestaurantMembership.objects.filter(id=membership.id).exists()
