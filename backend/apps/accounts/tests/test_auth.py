import pytest


@pytest.mark.django_db
class TestJwtAuth:
    def test_staff_can_obtain_and_refresh_a_token(self, api_client, make_user):
        make_user(username="staffuser", password="testpass123")

        obtain_response = api_client.post(
            "/api/v1/auth/token/", {"username": "staffuser", "password": "testpass123"}
        )
        assert obtain_response.status_code == 200
        assert "access" in obtain_response.data
        assert "refresh" in obtain_response.data

        refresh_response = api_client.post(
            "/api/v1/auth/token/refresh/", {"refresh": obtain_response.data["refresh"]}
        )
        assert refresh_response.status_code == 200
        assert "access" in refresh_response.data

    def test_wrong_password_is_rejected(self, api_client, make_user):
        make_user(username="staffuser", password="testpass123")

        response = api_client.post(
            "/api/v1/auth/token/", {"username": "staffuser", "password": "wrong"}
        )
        assert response.status_code == 401

    def test_dashboard_endpoints_require_authentication(self, api_client):
        response = api_client.get("/api/v1/dashboard/restaurants/")
        assert response.status_code == 401
