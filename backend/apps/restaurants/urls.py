from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.restaurants.views import (
    MyRestaurantsListView,
    RestaurantPublicDetailView,
    RestaurantSettingsView,
    StaffViewSet,
)

router = DefaultRouter()
router.register("staff", StaffViewSet, basename="staff")

urlpatterns = [
    path(
        "menu/<slug:restaurant_slug>/",
        RestaurantPublicDetailView.as_view(),
        name="restaurant-public-detail",
    ),
    path("dashboard/restaurants/", MyRestaurantsListView.as_view(), name="my-restaurants"),
    path(
        "dashboard/<slug:restaurant_slug>/settings/",
        RestaurantSettingsView.as_view(),
        name="restaurant-settings",
    ),
    path("dashboard/<slug:restaurant_slug>/", include(router.urls)),
]
